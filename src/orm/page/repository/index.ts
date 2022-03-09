import { EntityRepository, Repository } from "typeorm";
import Page from "../Page.entity";

@EntityRepository(Page)
export default class PageRepository extends Repository<Page> {
  findByPathBeginning(pathBeginning: string) {
    return this.createQueryBuilder("page")
      .where("page.path like :path", {
        path: `${pathBeginning}%`,
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

  updateReplaceInContent(oldString: string, newString: string) {
    return this.createQueryBuilder()
      .update(Page)
      .set( {
        content: () => `replace(content, '${oldString}', '${newString}')`,
      } )
      .where("content like :content", {
        content: `%${oldString}%`,
      } )
      .execute();
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
      .where("path like :path", {
        path: `${oldPathBeginning}%`,
      } )
      .execute();

    return result.raw;
  }
}
