/* eslint-disable prefer-destructuring */
import connection from "#tests/Connection";
import { Connection } from "typeorm";
import Repository from ".";
import PageTree from "../PageTree.entity";

let repo: Repository;
let con: Connection;
const nonExistingFolder = "nonExistingFolder";
const nonExistingFolderFrom = "nonExistingFolderFrom";
const nonExistingFolderTo = "nonExistingFolderTo";

beforeAll(async () => {
  con = await connection;
  repo = con.getCustomRepository(Repository);
} );

afterAll(() => {
  con.close();
} );

async function checkSuperPathsExistence(path: string) {
  const exists = await repo.existsSuperfoldersByPath(path);

  expect(exists).toBeTruthy();
}

describe("find", () => {
  describe("ByPath", () => {
    beforeAll(async () => {
      await repo.insertFolderRecursively(nonExistingFolder);
    } );

    afterAll(async () => {
      await repo.removeByPath(nonExistingFolder);
    } );

    it("found", async () => {
      const actual = await repo.findByPath(nonExistingFolder);

      expect(actual).toBeDefined();
    } );

    it("not found", async () => {
      const actual = await repo.findByPath(`${nonExistingFolder}dasdasd`);

      expect(actual).toBeUndefined();
    } );
  } );
} );

describe("remove", () => {
  describe("byPath", () => {
    beforeAll(async () => {
      await repo.insertFolderRecursively(nonExistingFolder);
    } );

    it("removed", async () => {
      const actual = await repo.removeByPath(nonExistingFolder);

      expect(actual).toBeDefined();
    } );

    it("not removed", async () => {
      const actual = await repo.removeByPath(`${nonExistingFolder}asas`);

      expect(actual).toBeUndefined();
    } );
  } );

  describe("removeFoldersRecursivelyIfEmpty", () => {
    it("test", async () => {
      const innermostPath = `${nonExistingFolder}/1/3`;

      await repo.insertFolderRecursively(innermostPath);

      const ret = await repo.removeEmptySuperfolders(innermostPath);

      expect(ret.length).toBe(3);
    } );
  } );
} );

describe("update", () => {
  describe("updateReplaceTree", () => {
    const from = nonExistingFolderFrom;
    const innermostFrom = `${from}/3/4`;
    const to = `${nonExistingFolderTo}/1/2`;
    const innermostTo = `${nonExistingFolderTo}/1/2/3/4`;

    describe("found From", () => {
      beforeAll(async () => {
        await repo.insertFolderRecursively(innermostFrom);
      } );

      afterAll(async () => {
        await repo.removeEmptySuperfolders(innermostTo);

        await repo.removeEmptySuperfolders(innermostFrom);

        await repo.removeByPath(from);
      } );

      describe("onlyFolders", () => {
        const ancestors: number[] = [];
        const newPageTrees: PageTree[] = [];

        beforeAll(async () => {
          const fromPageTree = await repo.findByPath(innermostFrom) as PageTree;

          ancestors.push(...fromPageTree.ancestors, fromPageTree.id);
          ancestors.splice(0, 1);
          newPageTrees.push(...await repo.updateReplaceTree(from, to));
        } );

        it("exists all new folder tree", async () => {
          await checkSuperPathsExistence(innermostTo);
        } );

        it("moved pageTree are the same as old", () => {
          newPageTrees.forEach((newPageTree, i) => {
            expect(newPageTree.id).toBe(ancestors[i]);
          } );
        } );

        it("correct depth", async () => {
          const pageTrees = await repo.findByPathBeginning(nonExistingFolderTo);

          pageTrees.forEach((pageTree) => {
            expect(pageTree.depth).toBe(pageTree.path.split("/").length);
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
        await repo.removeEmptySuperfolders(path);
      } );

      it("test", async () => {
        await repo.insertFolderRecursively(path);

        await checkSuperPathsExistence(path);
      } );
    } );

    describe("with parent", () => {
      const pathParentFolder0 = "nonExistingFolder";
      const pathParentFolder1 = `${pathParentFolder0}/sub1`;
      const pathFolder = `${pathParentFolder1}/sub2`;

      afterAll(async () => {
        await repo.removeEmptySuperfolders(pathFolder);
      } );

      it("test", async () => {
        const folders = await repo.insertFolderRecursively(pathFolder);

        expect(folders.length).toBe(3);

        await checkSuperPathsExistence(pathFolder);
      } );
    } );
  } );

  describe("updateReplaceAllPathBeginning", () => {
    describe("single folder. destination folder doesn't exist previously", () => {
      const oldPath = nonExistingFolderFrom;
      const newPath = nonExistingFolderTo;

      beforeAll(async () => {
        await repo.insertFolderRecursively(oldPath);
        await repo.updateReplaceAllPathBeginning(oldPath, newPath);
      } );

      afterAll(async () => {
        await repo.removeEmptySuperfolders(oldPath);
        await repo.removeEmptySuperfolders(newPath);
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
      const oldPath = nonExistingFolderFrom;
      const innermostOldPath = `${oldPath}/3/4`;
      const newPath = `${nonExistingFolderTo}/1/2`;
      const innermostRenamedPath = `${newPath}/3/4`;

      beforeAll(async () => {
        await repo.insertFolderRecursively(innermostOldPath);
        await repo.insertFolderRecursively(newPath);
        await repo.updateReplaceAllPathBeginning(oldPath, newPath);
      } );

      afterAll(async () => {
        await repo.removeEmptySuperfolders(innermostOldPath);
        await repo.removeEmptySuperfolders(oldPath);
        await repo.removeEmptySuperfolders(innermostRenamedPath);
        await repo.removeEmptySuperfolders(newPath);
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
          const newPageTree = await repo.findByPath(nonExistingFolderTo);

          expect(newPageTree).toBeDefined();
        } );

        it("nonExistingFolderTo/1", async () => {
          const newPageTree = await repo.findByPath(`${nonExistingFolderTo}/1`);

          expect(newPageTree).toBeDefined();
        } );

        it("nonExistingFolderTo/1/2", async () => {
          const newPageTree = await repo.findByPath(`${nonExistingFolderTo}/1/2`);

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
