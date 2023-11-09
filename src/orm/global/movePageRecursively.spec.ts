import c from "orm/connection/Connection";
import { PageRepository } from "orm/page";
import { PageTreeRepository } from "orm/pageTree";
import { Connection } from "typeorm";
import createPage from "./createPage";
import deletePageByPath from "./deletePageByPath";
import movePageRecursively, { ReturnType } from "./movePageRecursively";

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

describe("movePageRecursively", () => {
  describe("single page at root", () => {
    const nonExistingPageFrom = "nonExistingPageFrom";
    const nonExistingPageTo = "nonExistingPageTo";

    beforeAll(async () => {
      await createPage( {
        path: nonExistingPageFrom,
      } );
    } );

    afterAll(async () => {
      await deletePageByPath(nonExistingPageFrom);
      await deletePageByPath(nonExistingPageTo);
    } );

    describe("tests", () => {
      let ret: ReturnType;

      beforeAll(async () => {
        ret = await movePageRecursively(nonExistingPageFrom, nonExistingPageTo);
      } );
      it("return value", () => {
        expect(ret.pages.length).toBe(1);
        expect(ret.pageTrees.length).toBe(1);
      } );

      describe("old ones don't exist anymore", () => {
        it("page", async () => {
          const pages = await pageRepo.findByPathBeginning(nonExistingPageFrom);

          expect(pages.length).toBe(0);
        } );

        it("pageTree", async () => {
          const pageTrees = await pageTreeRepo.findByPathBeginning(nonExistingPageFrom);

          expect(pageTrees.length).toBe(0);
        } );
      } );

      it("new ones exist", async () => {
        const page = await pageRepo.findByPathBeginning(nonExistingPageTo);
        const pageTree = await pageTreeRepo.findByPathBeginning(nonExistingPageTo);

        expect(page).toBeDefined();
        expect(pageTree).toBeDefined();
      } );
    } );
  } );
} );
