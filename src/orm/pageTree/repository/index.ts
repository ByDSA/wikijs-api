/* eslint-disable prefer-destructuring */
/* eslint-disable no-await-in-loop */
import { fetchDefaultLangFromSettings } from "orm/global";
import { EntityRepository, Repository } from "typeorm";
import PageTree from "../PageTree.entity";

type CreateOptions = {
  pageId?: number;
  localeCode?: string;
  title?: string;
 };

export {
  CreateOptions as CreatePageTreeOptions,
};

@EntityRepository(PageTree)
export default class PageTreeRepository extends Repository<PageTree> {
  async createAndSave(pageTree: Partial<PageTree>) {
    if (!pageTree.path)
      throw new Error("Path is required");

    const entity = {
      ...pageTree,
    };

    entity.depth ??= pageTree.path.split("/").length;
    entity.title ??= "";

    entity.isFolder = !(typeof pageTree.pageId === "number");

    entity.localeCode ??= await fetchDefaultLangFromSettings();

    entity.id ??= await this.generateId();

    entity.ancestors ??= [];

    return this.save(entity);
  }

  async deleteEmptySuperfolders(to: string) {
    const pageTree = await this.findByPath(to);

    if (!pageTree)
      return [];

    const reversedAncestors: number[] = [...pageTree.ancestors, pageTree.id].reverse();
    const promises = reversedAncestors.map(async (ancestor: number, i) => {
      const pageTreesWithParent = await this.findByParentId(ancestor);

      if (pageTreesWithParent.length > 1)
        return null;

      if (pageTreesWithParent.length === 1
        && pageTreesWithParent[0].id !== reversedAncestors[i - 1])
        return null;

      return ancestor;
    } );
    const emptyFolders: number[] = (await Promise.all(promises))
      .filter((n) => n !== null) as number[];

    if (emptyFolders.length === 0)
      return [];

    const query = this.createQueryBuilder()
      .delete()
      .from(PageTree)
      .where("id IN (:...ids)", {
        ids: emptyFolders,
      } )
      .returning("*");
    const deleteResult = await query.execute();

    return deleteResult.raw;
  }

  async existsSuperfoldersByPath(path: string) {
    const pathSplit = path.split("/");
    const length = pathSplit.length;
    const promises = [];

    for (let i = 0; i < length; i++) {
      const fullSubPath = pathSplit.slice(0, length - i).join("/");
      const promise = this.findByPath(fullSubPath);

      promises.push(promise);
    }

    const exists = (await Promise.all(promises))
      .reduce((acc, n) => acc && !!n, true);

    return exists;
  }

  async deleteByPath(path: string) {
    const result = await this.createQueryBuilder()
      .delete()
      .from(PageTree)
      .where("path = :path", {
        path,
      } )
      .returning("*")
      .execute();

    return result.raw[0];
  }

  async updateReplaceTree(oldPath: string, newPath: string) {
    const oldBaseTree: PageTree | undefined = await this.findByPath(oldPath);
    let newBaseTree: PageTree | undefined = await this.findByPath(newPath);
    // TODO: qué pasa si origen-destino son el mismo o el destino está contenido en el origen.

    if (!oldBaseTree)
      throw new Error(`Old base path "${oldPath}" not found`);

    const newPathDepth = newPath.split("/").length;

    if (!newBaseTree && newPathDepth > 1) {
      if (oldBaseTree.isFolder)
        newBaseTree = (await this.insertFolderRecursively(newPath)).slice(-1)[0];
      else {
        const newBaseTreeParentPath = newPath.split("/").slice(0, -1)
          .join("/");

        newBaseTree = (await this.insertFolderRecursively(newBaseTreeParentPath)).slice(-1)[0];
      }
    }

    const pageTreesToChange = await this.updateReplaceAllPathBeginning(oldPath, newPath);

    return this.replaceAntecesorsParentAndDepth(
      pageTreesToChange,
      oldPath,
      oldBaseTree,
      newBaseTree,
    );
  }

  private replaceAntecesorsParentAndDepth(
    pageTreesToChange: PageTree[],
    oldBasePath: string,
    oldBaseTree: PageTree,
    newBaseTree: PageTree | undefined,
  ) {
    const antecesorsBaseOld = [...oldBaseTree.ancestors, oldBaseTree.id];
    const antecesorsBaseNew = newBaseTree ? [...newBaseTree.ancestors, newBaseTree.id] : [];
    const promises = [];

    for (const pageTree of pageTreesToChange) {
      pageTree.ancestors = [
        ...antecesorsBaseNew,
        ...pageTree.ancestors.slice(antecesorsBaseOld.length),
      ];
      // eslint-disable-next-line prefer-destructuring
      pageTree.parentId = pageTree.ancestors.slice(-1)[0];
      pageTree.depth = pageTree.ancestors.length + 1;

      const p = this.save(pageTree);

      promises.push(p);
    }

    return Promise.all(promises);
  }

  async updateReplaceAllPathBeginning(
    oldPathBeginning: string,
    newPathBeginning: string,
  ): Promise<PageTree[]> {
    const queryStr = "UPDATE \"pageTree\" pt SET path = replace(path, $1, $2) WHERE path like $3 AND not exists (select * from \"pageTree\" p where p.path = replace(pt.path, $1, $2)) RETURNING *";
    const parameters = [
      oldPathBeginning,
      newPathBeginning,
      `${oldPathBeginning}%`,
    ];
    const result = await this.query(queryStr, parameters);

    return result[0];
  }

  findByPath(path: string) {
    return this.createQueryBuilder("pageTree")
      .where("pageTree.path = :path", {
        path,
      } )
      .getOne();
  }

  findByPageId(pageId: number) {
    return this.createQueryBuilder("pageTree")
      .where("pageTree.pageId = :pageId", {
        pageId,
      } )
      .getOne();
  }

  findByPathBeginning(pathBeginning: string) {
    return this.createQueryBuilder("pageTree")
      .where("pageTree.path like :pathBeginning", {
        pathBeginning: `${pathBeginning}%`,
      } )
      .getMany();
  }

  findByParentId(parentId: number) {
    return this.createQueryBuilder("pageTree")
      .where("pageTree.parent = :parent", {
        parent: parentId,
      } )
      .getMany();
  }

  async insertFolder(path: string, parent: PageTree | null): Promise<PageTree> {
    const splittedPath = path.split("/");
    const depth = splittedPath.length;
    const title = splittedPath.slice(-1)[0];
    const isFolder = true;
    let parentId: number | null = null;
    let ancestors: number[] = [];

    if (parent) {
      ancestors = [...parent.ancestors, parent.id];
      parentId = parent.id;
    } else if (depth > 1)
      throw new Error("No parent provided with depth path greater than 0.");

    const id = await this.generateId();
    const pageTree = {
      id,
      path,
      depth,
      title,
      isFolder,
      parentId,
      ancestors,
      localeCode: "es",
    };
    const ret = await this.save(pageTree);

    return ret;
  }

  private async generateId() {
    return await this.count() + 1;
  }

  async insertFolderRecursively(path: string) {
    const splittedPath = path.split("/");
    const depth = splittedPath.length;
    const title = splittedPath.slice(-1)[0];
    const isFolder = true;
    let parent: PageTree | null = null;
    const ret: PageTree[] = [];

    if (depth > 1) {
      const superFolders = await this.createSuperFolders(path);
      const last = superFolders.at(-1);

      if (!last)
        throw new Error("No last superfolder");

      parent = last;
    }

    const pageTree = new PageTree();

    pageTree.id = await this.generateId();
    pageTree.path = path;
    pageTree.depth = depth;
    pageTree.title = title;
    pageTree.isFolder = isFolder;

    if (parent) {
      pageTree.ancestors = [...parent.ancestors, parent.id];
      pageTree.parentId = parent.id;
    } else
      pageTree.ancestors = [];

    const savedPageTree = await this.save(pageTree);

    ret.push(savedPageTree);

    return ret;
  }

  async createSuperFolders(path: string) {
    const folders = [];
    const splittedPath = path.split("/");
    const depth = splittedPath.length;
    let parent: PageTree | null = null;

    for (let i = 0; i < depth - 1; i++) {
      const ancestorPath = splittedPath.slice(0, i + 1).join("/");
      let ancestorPageTree = await this.findByPath(ancestorPath);

      if (!ancestorPageTree)
        ancestorPageTree = await this.insertFolder(ancestorPath, parent);

      parent = ancestorPageTree;
      folders.push(parent);
    }

    return folders;
  }
}
