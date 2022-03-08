/* eslint-disable prefer-destructuring */
import connection from "#tests/Connection";
import { Connection } from "typeorm";
import Repository from ".";
import PageTree from "../PageTree.entity";

let repo: Repository;
let con: Connection;

beforeAll(async () => {
  con = await connection;
  repo = con.getCustomRepository(Repository);
} );

afterAll(() => {
  con.close();
} );

describe("find", () => {
  describe("ByPath", () => {
    it("found", async () => {
      const actual = await repo.findByPath("inf");

      expect(actual).toBeDefined();
    } );

    it("not found", async () => {
      const actual = await repo.findByPath("infdasdasd");

      expect(actual).toBeUndefined();
    } );
  } );
} );

function checkSubPathsExistence(path: string) {
  const pathSplit = path.split("/");
  const length = pathSplit.length;
  const promises = [];

  for (let i = 0; i < length; i++) {
    const fullSubPath = pathSplit.slice(0, length - i).join("/");
    const promise = repo.findByPath(fullSubPath);

    promises.push(promise);
    promise.then((pageTree) => {
      expect(pageTree).toBeDefined();
    } );
  }

  return Promise.all(promises);
}

describe("remove", () => {
  describe("removeFoldersRecursivelyIfEmpty", () => {
    it("test", async () => {
      const path = "nonExistingFolder/1/3";

      await repo.insertFolderRecursively(path);

      await repo.removeFoldersRecursivelyIfEmpty(path);

      await checkSubPathsExistence(path);
    } );
  } );
} );

describe("update", () => {
  describe("updateReplaceTree", () => {
    const from = "nonExistingFolderFrom";
    const fromFull = `${from}/3/4`;
    const to = "nonExistingFolderTo/1/2";

    describe("found", () => {
      beforeAll(async () => {
        await repo.insertFolderRecursively(fromFull);
      } );

      afterAll(async () => {
        await repo.removeFoldersRecursivelyIfEmpty(to);
      } );

      describe("onlyFolders", () => {
        const ancestors: number[] = [];
        const newPageTrees: PageTree[] = [];

        beforeAll(async () => {
          const fromPageTree = await repo.findByPath(from) as PageTree;

          ancestors.push(...fromPageTree.ancestors, fromPageTree.id);
          newPageTrees.push(...await repo.updateReplaceTree(from, to));
        } );

        it("new folders exist", async () => {
          await checkSubPathsExistence(to);
        } );

        it("same as from folders", () => {
          newPageTrees.forEach((newPageTree, i) => {
            expect(newPageTree.id).toBe(ancestors[i]);
          } );
        } );
      } );
    } );
  } );

  describe("insertFolder", () => {
    describe("no parent", () => {
      const path = "asdasd";
      let newFolder: PageTree;

      afterAll(async () => {
        await repo.remove(newFolder);
      } );

      it("test", async () => {
        newFolder = await repo.insertFolder(path, null);

        expect(newFolder).toBeDefined();
      } );
    } );

    describe("with parent", () => {
      const parentPath = "inf";
      const path = `${parentPath}/asdasd`;
      let parent: PageTree;
      let newFolder: PageTree;

      beforeAll(async () => {
        parent = await repo.findByPath(parentPath) as PageTree;

        expect(parent).toBeDefined();
      } );

      afterAll(async () => {
        await repo.remove(newFolder);
      } );

      it("test", async () => {
        newFolder = await repo.insertFolder(path, parent);

        expect(newFolder).toBeDefined();
      } );
    } );
  } );

  describe("insertFolderRecursively", () => {
    describe("no parent", () => {
      const path = "asdasd";

      afterAll(async () => {
        await repo.removeFoldersRecursivelyIfEmpty(path);
      } );

      it("test", async () => {
        await repo.insertFolderRecursively(path);

        await checkSubPathsExistence(path);
      } );
    } );

    describe("with parent", () => {
      const pathParentFolder0 = "nonExistingFolder";
      const pathParentFolder1 = `${pathParentFolder0}/sub1`;
      const pathFolder = `${pathParentFolder1}/sub2`;

      afterAll(async () => {
        await repo.removeFoldersRecursivelyIfEmpty(pathFolder);
      } );

      it("test", async () => {
        const folders = await repo.insertFolderRecursively(pathFolder);

        expect(folders.length).toBe(3);

        await checkSubPathsExistence(pathFolder);
      } );
    } );
  } );

  describe("updateReplaceAllPathBeginning", () => {
    describe("single folder", () => {
      const oldPath = "nonExistingFolderFrom";
      const newPath = "nonExistingFolderTo";

      beforeAll(async () => {
        await repo.insertFolderRecursively(oldPath);
        await repo.updateReplaceAllPathBeginning(oldPath, newPath);
      } );

      afterAll(async () => {
        try {
          await repo.removeFoldersRecursivelyIfEmpty(oldPath);
        } catch (e) {
          // ignore
        }
        try {
          await repo.removeFoldersRecursivelyIfEmpty(newPath);
        } catch (e) {
          // ignore
        }
      } );

      it("old path doesn't exist anymore", async () => {
        const oldPageTree = await repo.findByPath(oldPath);

        expect(oldPageTree).toBeUndefined();
      } );
      it("new path exists", async () => {
        const newPageTree = await repo.findByPath(newPath);

        expect(newPageTree).toBeDefined();
      } );
    } );

    describe("tree folder", () => {
      const oldPath = "nonExistingFolderFrom";
      const fullOldPath = `${oldPath}/3/4`;
      const newPath = "nonExistingFolderTo/1/2";
      const fullRenamedPath = `${newPath}/3/4`;

      beforeAll(async () => {
        await repo.insertFolderRecursively(fullOldPath);
        await repo.insertFolderRecursively(newPath);
        await repo.updateReplaceAllPathBeginning(oldPath, newPath);
      } );

      afterAll(async () => {
        try {
          await repo.removeFoldersRecursivelyIfEmpty(fullOldPath);
        } catch (e) {
          // ignore
        }
        try {
          await repo.removeFoldersRecursivelyIfEmpty(oldPath);
        } catch (e) {
          // ignore
        }
        try {
          await repo.removeFoldersRecursivelyIfEmpty(fullRenamedPath);
        } catch (e) {
          // ignore
        }
        try {
          await repo.removeFoldersRecursivelyIfEmpty(newPath);
        } catch (e) {
          // ignore
        }
      } );

      describe("old paths don't exist anymore, but base", () => {
        it("base exists", async () => {
          const oldPageTree = await repo.findByPath(oldPath);

          expect(oldPageTree).toBeDefined();
        } );

        it("3", async () => {
          const oldPageTree = await repo.findByPath(`${oldPath}/3`);

          expect(oldPageTree).toBeUndefined();
        } );

        it("4", async () => {
          const oldPageTree = await repo.findByPath(`${oldPath}/3/4`);

          expect(oldPageTree).toBeUndefined();
        } );
      } );

      describe("new paths exist", () => {
        it("nonExistingFolderTo", async () => {
          const newPageTree = await repo.findByPath("nonExistingFolderTo");

          expect(newPageTree).toBeDefined();
        } );

        it("nonExistingFolderTo/1", async () => {
          const newPageTree = await repo.findByPath("nonExistingFolderTo/1");

          expect(newPageTree).toBeDefined();
        } );

        it("nonExistingFolderTo/1/2", async () => {
          const newPageTree = await repo.findByPath("nonExistingFolderTo/1/2");

          expect(newPageTree).toBeDefined();
        } );

        it(`${newPath}/3`, async () => {
          const newPageTree = await repo.findByPath(`${newPath}/3`);

          expect(newPageTree).toBeDefined();
        } );

        it(`${newPath}/3/4`, async () => {
          const newPageTree = await repo.findByPath(`${newPath}/3/4`);

          expect(newPageTree).toBeDefined();
        } );
      } );
    } );
  } );
} );
