import c from "orm/connection/Connection";
import { Page, PageRepository } from "orm/page";
import { PageTree, PageTreeRepository } from "orm/pageTree";
import { Connection } from "typeorm";
import deletePageByPath from "./deletePageByPath";

let connection: Connection;
let pageRepo: Awaited<typeof PageRepository>;
let pageTreeRepo: Awaited<typeof PageTreeRepository>;

beforeAll(async () => {
  connection = await c;
  pageRepo = await PageRepository;
  pageTreeRepo = await PageTreeRepository;
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
