import c from "orm/connection/Connection";
import { Page, PageRepository } from "orm/page";
import { PageTree, PageTreeRepository } from "orm/pageTree";
import { Connection } from "typeorm";
import createPage, { ReturnType } from "./createPage";

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

describe("createPage", () => {
  describe("new page at root", () => {
    const nonExistingPage = "nonExistingPage";
    let ret: ReturnType;

    beforeAll(async () => {
      ret = await createPage( {
        path: nonExistingPage,
      } );
    } );

    afterAll(async () => {
      const page: Page = (await pageRepo.findByPathBeginning(nonExistingPage))[0];
      const pageTree: PageTree = (await pageTreeRepo.findByPathBeginning(nonExistingPage))[0];

      pageRepo.delete(page.id);
      pageTreeRepo.delete(pageTree.id);
    } );

    it("return value", () => {
      expect(ret.page).toBeDefined();
      expect(ret.pageTree).toBeDefined();
    } );

    it("new ones exist", async () => {
      const page: Page = (await pageRepo.findByPathBeginning(nonExistingPage))[0];
      const pageTree: PageTree = (await pageTreeRepo.findByPathBeginning(nonExistingPage))[0];

      expect(page).toBeDefined();
      expect(pageTree).toBeDefined();
    } );
  } );

  describe("new page at folder", () => {
    const nonExistingFolder = "nonExistingFolder";
    const nonExistingPage = `${nonExistingFolder}/nonExistingPage`;
    let ret: ReturnType;

    beforeAll(async () => {
      ret = await createPage( {
        path: nonExistingPage,
      } );
    } );

    afterAll(async () => {
      const page: Page = (await pageRepo.findByPathBeginning(nonExistingFolder))[0];
      const pageTrees: PageTree[] = await pageTreeRepo.findByPathBeginning(nonExistingFolder);

      await pageRepo.delete(page.id);
      const promises = pageTrees.map((pageTree) => pageTreeRepo.delete(pageTree.id));

      await Promise.all(promises);
    } );

    it("return value", () => {
      expect(ret.page).toBeDefined();
      expect(ret.pageTree).toBeDefined();
    } );

    it("new ones exist", async () => {
      const pages: Page[] = await pageRepo.findByPathBeginning(nonExistingFolder);
      const pageTrees: PageTree[] = (await pageTreeRepo.findByPathBeginning(nonExistingFolder));

      expect(pages.length).toBe(1);
      expect(pages[0]).toBeDefined();
      expect(pageTrees.length).toBe(2);
      expect(pageTrees[0]).toBeDefined();
      expect(pageTrees[1]).toBeDefined();
    } );
  } );
} );
