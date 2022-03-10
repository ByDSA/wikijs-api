import testConnection from "#tests/Connection";
import { Page, PageRepository } from "orm/page";
import { PageTree, PageTreeRepository } from "orm/pageTree";
import { Connection } from "typeorm";
import deletePageByPath from "./deletePageByPath";

let connection: Connection;
let pageRepo: PageRepository;
let pageTreeRepo: PageTreeRepository;

beforeAll(async () => {
  connection = await testConnection;
  pageRepo = connection.getCustomRepository(PageRepository);
  pageTreeRepo = connection.getCustomRepository(PageTreeRepository);
} );

afterAll(() => {
  connection.close();
} );

describe("deletePageByPath", () => {
  describe("existing page and pageTree", () => {
    const nonExistingPage = "nonExistingPage";
    let ret: Page;

    beforeAll(async () => {
      const page = await pageRepo.createAndSave( {
        path: nonExistingPage,
      } );

      await pageTreeRepo.createAndSave( {
        path: nonExistingPage,
        pageId: page.id,
      } );

      ret = await deletePageByPath(nonExistingPage);
    } );

    it("return value", () => {
      expect(ret).toBeDefined();
    } );

    it("don't exists in db", async () => {
      const page: Page = (await pageRepo.findByPathBeginning(nonExistingPage))[0];
      const pageTree: PageTree = (await pageTreeRepo.findByPathBeginning(nonExistingPage))[0];

      expect(page).toBeUndefined();
      expect(pageTree).toBeUndefined();
    } );
  } );
} );
