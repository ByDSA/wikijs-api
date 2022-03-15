/* eslint-disable no-param-reassign */
import log from "npmlog";
import { EntityRepository, Repository } from "typeorm";
import Page from "../Page.entity";
import { fillWithDefaultValues } from "../utils";

@EntityRepository(Page)
export default class PageRepository extends Repository<Page> {
  async deleteByPath(path: string) {
    const result = await this.createQueryBuilder()
      .delete()
      .from(Page)
      .where("path = :path", {
        path,
      } )
      .returning("*")
      .execute();

    log.verbose("db", `Deleted Page: ${path}`);

    return result.raw[0] as Page;
  }

  findByPathBeginning(pathBeginning: string) {
    return this.createQueryBuilder("page")
      .where("page.path like :path", {
        path: `${pathBeginning}%`,
      } )
      .getMany();
  }

  findByIds(ids: number[]) {
    return this.createQueryBuilder()
      .where("id IN (:...ids)", {
        ids,
      } )
      .getMany();
  }

  findInContent(content: string) {
    return this.createQueryBuilder("page")
      .where("page.content like :content", {
        content: `%${content}%`,
      } )
      .getMany();
  }

  async updateReplaceInContent(oldString: string, newString: string) {
    const result = await this.createQueryBuilder()
      .update(Page)
      .set( {
        content: () => `replace(content, '${oldString}', '${newString}')`,
      } )
      .where("content like :content", {
        content: `%${oldString}%`,
      } )
      .execute();

    log.verbose("db Page", "replace content", "old:", oldString, "new:", newString);

    for (const r of result.raw)
      log.verbose("db Page", "replaced content", "in", r.path);

    return result;
  }

  async updateReplacePathBeginning(
    oldPathBeginning: string,
    newPathBeginning: string,
  ): Promise<Page[]> {
    const result = await this.createQueryBuilder()
      .update(Page)
      .set( {
        path: () => `replace(path, '${oldPathBeginning}', '${newPathBeginning}')`,
      } )
      .where("path = :path", {
        path: oldPathBeginning,
      } )
      .orWhere("path like :path", {
        path: `${oldPathBeginning}/%`,
      } )
      .execute();

    log.verbose("db Page", "replace path", "old:", oldPathBeginning, "new:", newPathBeginning);

    for (const r of result.raw)
      log.verbose("db Page", "replace path", "new full path: ", r.path);

    return result.raw;
  }

  async createAndSave(page: Partial<Page>) {
    if (!page.path)
      throw new Error("Path is required");

    const newEntity = await fillWithDefaultValues( {
      ...page,
    } );

    log.verbose("db", `Created new Page: ${page.path}`);

    return this.save(newEntity);
  }
}
