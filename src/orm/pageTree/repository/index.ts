/* eslint-disable prefer-destructuring */
/* eslint-disable no-await-in-loop */
import log from "npmlog";
import { EntityRepository, getCustomRepository, Repository } from "typeorm";
import { fetchDefaultLangFromSettings } from "../../global";
import { PageRepository } from "../../page";
import { getParentPath, getSuperpaths, PATH_EXCEPTION } from "../../utils";
import PageTree from "../PageTree.entity";
// eslint-disable-next-line import/no-cycle
import moveTreeProcess from "./moveTree";

type PartialPageTreeWithPath = Partial<PageTree> & {
  path: string;
};

type CreateAndSaveOptions = {
  parent?: PageTree | null;
};
@EntityRepository(PageTree)
export default class PageTreeRepository extends Repository<PageTree> {
  async updateReplacePathBeginning(
    oldPathBeginning: string,
    newPathBeginning: string,
  ): Promise<PageTree[]> {
    const query = this.createQueryBuilder()
      .update(PageTree)
      .set( {
        path: () => `replace(path, '${oldPathBeginning}', '${newPathBeginning}')`,
      } )
      .where("path = :p1", {
        p1: oldPathBeginning,
      } )
      .orWhere("path like :p2", {
        p2: `${oldPathBeginning}/%`,
      } )
      .returning("*");
    const result = await query.execute();
    const rawResults = result.raw;
    const ids = rawResults.map((r: any) => r.id);
    const ret = await this.findByIds(ids);

    if (log.level === "verbose") {
      log.verbose("db PageTree", "Replaced path", `'${oldPathBeginning}%'`, `'${newPathBeginning}%'`);

      for (const row of result.raw) {
        const oldPath = row.path.replace(newPathBeginning, oldPathBeginning);

        log.verbose("db PageTree", "Replaced path", oldPath, "=>", row.path);
      }
    }

    for (const r of ret) {
      if (r.isFolder && !r.pageId) {
        r.title = r.path.split("/").slice(-1)[0];
        await this.save(r);
      }
    }

    return ret;
  }

  async createAndSave(pageTree: PartialPageTreeWithPath, options?: CreateAndSaveOptions) {
    if (!pageTree.path)
      throw PATH_EXCEPTION;

    const entity = {
      ...pageTree,
    };
    const splittedPath = pageTree.path.split("/");

    entity.depth ??= splittedPath.length;
    entity.title ??= splittedPath.slice(-1)[0];

    entity.isFolder ??= !(typeof pageTree.pageId === "number");

    entity.localeCode ??= await fetchDefaultLangFromSettings();

    const parent: PageTree | null = options?.parent !== undefined
      ? options.parent
      : await this.getOrCreateParent(pageTree);

    if (entity.depth > 1 && !parent)
      throw new Error("No parent with depth path greater than 0.");

    entity.parentId = parent?.id ?? null;

    entity.ancestors ??= parent ? [...parent.ancestors, parent.id] : [];

    entity.id ??= await this.generateId();

    const ret = await this.save(entity);

    log.verbose("db PageTree", "Created", ret.path);

    return ret;
  }

  private async getOrCreateParent(pageTree: Partial<PageTree>) {
    let parent: PageTree | null = null;
    const path = pageTree.path as string;

    if (pageTree.parentId)
      return await this.findOne(pageTree.parentId) ?? null;

    const parentPath = getParentPath(path);

    if (!parentPath)
      return null;

    parent = await this.findByPath(parentPath) ?? null;

    if (parent)
      return parent;

    const folders = await this.insertSuperFoldersIfNotExist(path);

    parent = folders.at(-1) ?? null;

    return parent;
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

  async deleteOneByPath(path: string) {
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

  async deleteByPath(path: string): Promise<PageTree[]> {
    const pageTree = await this.deleteOneByPath(path);
    const deletedPageTrees: PageTree[] = [];

    if (!pageTree)
      return deletedPageTrees;

    deletedPageTrees.push(pageTree);
    deletedPageTrees.push(...await this.deleteSuperFoldersRecursivelyIfEmpty(pageTree));

    return deletedPageTrees;
  }

  private async deleteSuperFoldersRecursivelyIfEmpty(pageTree: PageTree) {
    const deletedPageTrees: PageTree[] = [];
    const reversedAncestorsIds = [...pageTree.ancestors].reverse();

    for (const ancestorId of reversedAncestorsIds) {
      const pageTreeWithParent = await this.findByParentId(ancestorId);

      if (pageTreeWithParent.length > 1)
        return deletedPageTrees;

      const folder = await this.findOne(ancestorId);

      if (!folder || !folder.isFolder || folder.pageId !== null)
        return deletedPageTrees;

      const superDeletedPageTrees = await this.deleteByPath(folder.path);

      deletedPageTrees.push(...superDeletedPageTrees);
    }

    return deletedPageTrees;
  }

  moveTree(oldPath: string, newPath: string) {
    return moveTreeProcess(this, oldPath, newPath);
  }

  async fixAll() {
    await this.fixAllPagesHaveToBePageTree();
  }

  async fixAllPagesHaveToBePageTree() {
    const pageRepo = getCustomRepository(PageRepository);
    let allPages = await pageRepo.find();
    const allPageTrees = await this.find();

    allPageTrees.forEach((pageTree) => {
      const { pageId } = pageTree;

      allPages = allPages.filter((p) => p.id !== pageId);
    } );

    const pagesWithoutPageTree = allPages;
    const createdPageTrees = [];

    for (const page of pagesWithoutPageTree) {
      const pageTree = {
        isFolder: false,
        path: page.path,
        title: page.title,
        pageId: page.id,
        localeCode: page.localeCode,
      };
      const createdPageTree = await this.createAndSave(pageTree);

      createdPageTrees.push(createdPageTree);
    }

    return createdPageTrees;
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

  private async insertOneFolder(
    reference: PartialPageTreeWithPath,
    parent: PageTree | null,
  ): Promise<PageTree> {
    const pageTree = {
      ...reference,
      isFolder: true,
    };
    const ret = await this.createAndSave(pageTree, {
      parent,
    } );

    return ret;
  }

  private async generateId() {
    const last = await this.findOne( {
      order: {
        id: "DESC",
      },
    } );

    if (!last)
      throw new Error("No pageTree found");

    return last.id + 1;
  }

  async insertNode(path: string, reference?: Partial<PageTree>) {
    const splittedPath = path.split("/");
    const depth = splittedPath.length;
    let parent: PageTree | null = null;
    const ret: PageTree[] = [];

    if (depth > 1) {
      const insertedSuperFolders = await this.insertSuperFoldersIfNotExist(path, reference);

      ret.push(...insertedSuperFolders);
      const lastInserted = insertedSuperFolders.at(-1);
      const parentPath = getParentPath(path);

      parent = lastInserted ?? await this.findByPath(parentPath) ?? null;
    }

    const pageTree: PartialPageTreeWithPath = {
      ...removeNoMetadata(reference),
      path,
      depth,
      isFolder: reference?.isFolder ?? false,
    };

    pageTree.id = await this.generateId();
    const savedPageTree = await this.createAndSave(pageTree, {
      parent,
    } );

    ret.push(savedPageTree);

    return ret;
  }

  insertFolder(path: string, reference?: Partial<PageTree>) {
    return this.insertNode(path, {
      ...reference,
      isFolder: true,
    } );
  }

  private async insertSuperFoldersIfNotExist(path: string, reference?: Partial<PageTree>) {
    const folders = [];
    const superPaths = getSuperpaths(path);
    let parentFolder: PageTree | null = null;

    for (const p of superPaths) {
      let folder = await this.findByPath(p);
      let created = false;

      if (!folder) {
        const newPageTree = {
          ...removeNoMetadata(reference),
          path: p,
          isFolder: true,
        };

        folder = await this.insertOneFolder(newPageTree, parentFolder);

        if (folder)
          created = true;
      }

      parentFolder = folder;

      if (created)
        folders.push(parentFolder);
    }

    return folders;
  }
}

function removeNoMetadata(pageTree: Partial<PageTree> | undefined) {
  if (!pageTree)
    return pageTree;

  const { isPrivate,
    privateNS,
    localeCode } = pageTree;

  return {
    id: undefined,
    path: undefined,
    depth: undefined,
    isFolder: undefined,
    pageId: undefined,
    ancestors: undefined,
    parentId: undefined,
    title: undefined,
    localeCode,
    isPrivate,
    privateNS,
  };
}
