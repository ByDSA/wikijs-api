/* eslint-disable prefer-destructuring */
import c from "orm/connection/Connection";
import { getSuperpaths } from "orm/utils";
import { PATH_EXCEPTION } from "orm/utils/exceptions";
import { Connection } from "typeorm";
import Repository from ".";
import PageTree from "../PageTree.entity";
import { deleteEmptyFolderAndSuperfolders, MoveTreeReturnType, updateReplaceAllPathBeginning } from "./moveTree";

let repo: Awaited<typeof Repository>;
let con: Connection;
const nonExistingFolderPath = "nonExistingFolder";
const nonExistingFolderFullPath = "nonExistingFolder/2/3/4";
const nonExistingFolderFrom = "nonExistingFolderFrom";
const nonExistingFolderTo = "nonExistingFolderTo";

beforeAll(async () => {
  con = await c;
  repo = await Repository;
} );

afterAll(() => {
  con.close();
} );

async function checkSuperPathsExistence(path: string) {
  const exists = await repo.existsSuperfoldersByPath(path);

  expect(exists).toBeTruthy();
}

type Key = "ancestors" | "depth" | "id" | "isFolder" | "isPrivate" | "localeCode" | "pageId" | "parentId" | "path" | "privateNS" | "title";
function expectPageTreeEquals(actual: PageTree, expected: PageTree, excludedKeys: Key[] = []) {
  if (!excludedKeys.includes("depth"))
    expect(actual.depth).toBe(expected.depth);

  if (!excludedKeys.includes("parentId"))
    expect(actual.parentId).toBe(expected.parentId);

  if (!excludedKeys.includes("ancestors"))
    expect(actual.ancestors).toEqual(expected.ancestors);

  if (!excludedKeys.includes("id"))
    expect(actual.id).toBe(expected.id);

  if (!excludedKeys.includes("isFolder"))
    expect(actual.isFolder).toBe(expected.isFolder);

  if (!excludedKeys.includes("title"))
    expect(actual.title).toBe(expected.title);

  if (!excludedKeys.includes("isPrivate"))
    expect(actual.isPrivate).toBe(expected.isPrivate);

  if (!excludedKeys.includes("privateNS"))
    expect(actual.privateNS).toBe(expected.privateNS);

  if (!excludedKeys.includes("localeCode"))
    expect(actual.localeCode).toBe(expected.localeCode);
}

describe("private", () => {
  type RepoPrivate = {
    existsSuperfoldersByPath: (path: string)=> Promise<boolean>;
    insertSuperFoldersIfNotExist: (path: string)=> Promise<PageTree[]>;
  };
  let repoAny: RepoPrivate;

  beforeAll(() => {
    repoAny = (repo as unknown as RepoPrivate);
  } );
  describe("removeFoldersRecursivelyIfEmpty", () => {
    it("test", async () => {
      const innermostPath = `${nonExistingFolderPath}/1/3`;

      await repo.insertFolder(innermostPath);

      const ret = await deleteEmptyFolderAndSuperfolders(innermostPath);

      expect(ret.length).toBe(3);
    } );
  } );

  describe("insertSuperFolders", () => {
    describe("no superfolder (at root)", () => {
      it("test", async () => {
        const folders = await repoAny.insertSuperFoldersIfNotExist(nonExistingFolderPath);

        expect(folders.length).toBe(0);
      } );
    } );

    function deleteAllSuperPaths() {
      const superFoldersPaths = getSuperpaths(nonExistingFolderFullPath);
      const promises = superFoldersPaths.map((path) => repo.deleteOneByPath(path));

      return Promise.all(promises);
    }

    describe("normal", () => {
      afterAll(async () => {
        await deleteAllSuperPaths();
      } );
      it("test", async () => {
        const folders = await repoAny.insertSuperFoldersIfNotExist(nonExistingFolderFullPath);

        expect(folders.length).toBe(3);
      } );
    } );

    describe("existing folder at root", () => {
      beforeAll(async () => {
        await repo.insertFolder(nonExistingFolderPath);
      } );

      afterAll(async () => {
        await deleteAllSuperPaths();
      } );

      it("test", async () => {
        const folders = await repoAny.insertSuperFoldersIfNotExist(nonExistingFolderFullPath);

        expect(folders.length).toBe(2);
      } );
    } );

    describe("existing folder at middle", () => {
      beforeAll(async () => {
        await repo.insertFolder(`${nonExistingFolderPath}/2`);
      } );

      afterAll(async () => {
        await deleteAllSuperPaths();
      } );

      it("test", async () => {
        const folders = await repoAny.insertSuperFoldersIfNotExist(nonExistingFolderFullPath);

        expect(folders.length).toBe(1);
      } );
    } );

    describe("existing folder at end", () => {
      beforeAll(async () => {
        await repo.insertFolder(`${nonExistingFolderPath}/2/3`);
      } );

      afterAll(async () => {
        await deleteAllSuperPaths();
      } );

      it("test", async () => {
        const folders = await repoAny.insertSuperFoldersIfNotExist(nonExistingFolderFullPath);

        expect(folders.length).toBe(0);
      } );
    } );

    describe("existing folder at path called", () => {
      beforeAll(async () => {
        await repo.insertFolder(nonExistingFolderFullPath);
      } );

      afterAll(async () => {
        await repo.deleteOneByPath(nonExistingFolderFullPath);
        await deleteAllSuperPaths();
      } );

      it("test", async () => {
        const folders = await repoAny.insertSuperFoldersIfNotExist(nonExistingFolderFullPath);

        expect(folders.length).toBe(0);
      } );
    } );

    describe("existing folder at subpath from called", () => {
      beforeAll(async () => {
        await repo.insertFolder(`${nonExistingFolderFullPath}/5`);
      } );

      afterAll(async () => {
        await repo.deleteOneByPath(nonExistingFolderFullPath);
        await repo.deleteOneByPath(`${nonExistingFolderFullPath}/5`);
        await deleteAllSuperPaths();
      } );

      it("test", async () => {
        const folders = await repoAny.insertSuperFoldersIfNotExist(nonExistingFolderFullPath);

        expect(folders.length).toBe(0);
      } );
    } );
  } );

  describe("updateReplaceAllPathBeginning", () => {
    describe("single folder. destination folder doesn't exist previously", () => {
      const oldPath = nonExistingFolderFrom;
      const newPath = nonExistingFolderTo;

      beforeAll(async () => {
        await repo.insertFolder(oldPath);
        await updateReplaceAllPathBeginning(repo, oldPath, newPath);
      } );

      afterAll(async () => {
        await repo.deleteByPath(oldPath);
        await repo.deleteByPath(newPath);
      } );

      it("old path doesn't exist anymore", async () => {
        const oldPageTree = await repo.findByPath(oldPath);

        expect(oldPageTree).toBeNull();
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

      beforeAll(async () => {
        await repo.insertFolder(innermostOldPath);
        await repo.insertFolder(newPath);
        await updateReplaceAllPathBeginning(repo, oldPath, newPath);
      } );

      afterAll(async () => {
        await repo.deleteByPath(oldPath);
        await repo.deleteByPath(newPath);
      } );

      describe("old paths don't exist anymore, but base", () => {
        it("base exists", async () => {
          const oldPageTree = await repo.findByPath(oldPath);

          expect(oldPageTree).toBeDefined();
        } );

        it("3", async () => {
          const oldPageTree = await repo.findByPath(`${oldPath}/3`);

          expect(oldPageTree).toBeNull();
        } );

        it("4", async () => {
          const oldPageTree = await repo.findByPath(`${oldPath}/3/4`);

          expect(oldPageTree).toBeNull();
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

describe("find", () => {
  describe("ByPath", () => {
    beforeAll(async () => {
      await repo.insertFolder(nonExistingFolderPath);
    } );

    afterAll(async () => {
      await repo.deleteOneByPath(nonExistingFolderPath);
    } );

    it("found", async () => {
      const actual = await repo.findByPath(nonExistingFolderPath);

      expect(actual).toBeDefined();
    } );

    it("not found", async () => {
      const actual = await repo.findByPath(`${nonExistingFolderPath}dasdasd`);

      expect(actual).toBeNull();
    } );
  } );
} );

describe("delete", () => {
  describe("byPath", () => {
    beforeAll(async () => {
      await repo.insertFolder(nonExistingFolderPath);
    } );

    it("removed", async () => {
      const actual = await repo.deleteOneByPath(nonExistingFolderPath);

      expect(actual).toBeDefined();
    } );

    it("not removed", async () => {
      const actual = await repo.deleteOneByPath(`${nonExistingFolderPath}asas`);

      expect(actual).toBeUndefined();
    } );
  } );
} );

describe("update", () => {
  describe("insertFolder", () => {
    describe("at root", () => {
      afterAll(async () => {
        await repo.deleteOneByPath(nonExistingFolderPath);
      } );

      it("test", async () => {
        const newFolders = await repo.insertFolder(nonExistingFolderPath);

        expect(newFolders.length).toBe(1);
      } );
    } );

    describe("with parents", () => {
      afterAll(async () => {
        const superfolders = getSuperpaths(nonExistingFolderFullPath);
        const promises = superfolders.map((path) => repo.deleteOneByPath(path));

        await Promise.all(promises);
        await repo.deleteOneByPath(nonExistingFolderFullPath);
      } );

      it("insert", async () => {
        const newFolders = await repo.insertFolder(nonExistingFolderFullPath);

        expect(newFolders.length).toBe(4);
      } );

      it("check superfolders", async () => {
        await checkSuperPathsExistence(nonExistingFolderFullPath);
      } );
    } );
  } );
  describe("moveTree", () => {
    describe("one non existing folder from root to non existing folder at root", () => {
      const from = nonExistingFolderFrom;
      const to = nonExistingFolderTo;

      it("move", () => {
        const f = async () => {
          const a = await repo.moveTree(from, to);

          expect(a).toBeDefined();
        };

        expect(f).rejects.toThrowError();
      } );
    } );

    describe("one empty folder from root to non existing folder at root", () => {
      const from = nonExistingFolderFrom;
      const to = nonExistingFolderTo;
      let original: PageTree;
      let ret: MoveTreeReturnType;

      beforeAll(async () => {
        [original] = await repo.insertFolder(from);
      } );

      it("move", async () => {
        ret = await repo.moveTree(from, to);
        const movedNodes = ret.movedPages;

        expect(movedNodes.length).toBe(1);
        const [moved] = movedNodes;

        expect(moved.path).toBe(to);
        expect(moved.title).toBe(to.split("/").slice(-1)[0]);
        expect(moved.title).not.toBe(original.title);
        expectPageTreeEquals(moved, original, ["path", "title"]);
      } );

      afterAll(async () => {
        await repo.deleteOneByPath(from);
        await repo.deleteOneByPath(to);
      } );
    } );

    describe("one empty folder from root to existing folder at root", () => {
      const from = nonExistingFolderFrom;
      const to = nonExistingFolderTo;
      let originalTo: PageTree;
      let ret: MoveTreeReturnType;

      beforeAll(async () => {
        await repo.insertFolder(from);
        [originalTo] = await repo.insertFolder(to);
      } );

      describe("move", () => {
        let movedNodes: PageTree[];

        beforeAll(async () => {
          ret = await repo.moveTree(from, to);
          movedNodes = ret.movedPages;
        } );

        it("no moved", () => {
          expect(movedNodes.length).toBe(0);
        } );

        it("to unaltered", async () => {
          const toPageTree = await repo.findByPath(to) as PageTree;

          expect(toPageTree).toBeDefined();
          expectPageTreeEquals(toPageTree, originalTo);
        } );

        it("deleted from", async () => {
          const fromPageTree = await repo.findByPath(from);

          expect(fromPageTree).toBeNull();
        } );
      } );

      afterAll(async () => {
        await repo.deleteOneByPath(from);
        await repo.deleteOneByPath(to);
      } );
    } );

    describe("one empty folder from subfolder to non existing folder at same subfolder", () => {
      const commonFolder = "nonExistingFolder";
      const from = `${commonFolder}/${nonExistingFolderFrom}`;
      const to = `${commonFolder}/${nonExistingFolderTo}`;
      let ret: MoveTreeReturnType;

      beforeAll(async () => {
        await repo.insertFolder(from);
      } );

      describe("move", () => {
        beforeAll(async () => {
          ret = await repo.moveTree(from, to);
        } );

        it("moved 1", () => {
          expect(ret.movedPages.length).toBe(1);
        } );

        it("no folders was created", () => {
          expect(ret.createdFolders.length).toBe(0);
        } );
      } );

      afterAll(async () => {
        await repo.deleteOneByPath(commonFolder);
        await repo.deleteOneByPath(from);
        await repo.deleteOneByPath(to);
      } );
    } );

    describe("one page node from subfolder to its parent", () => {
      const parentPath = "nonExistingFolder";
      const from = `${parentPath}/nonExistingNode`;
      const to = parentPath;
      let ret: MoveTreeReturnType;

      beforeAll(async () => {
        await repo.insertNode(from);
      } );

      describe("move", () => {
        beforeAll(async () => {
          ret = await repo.moveTree(from, to);
        } );

        it("moved 1", () => {
          expect(ret.movedPages.length).toBe(1);
        } );

        it("renamed path in page moved", () => {
          const actual = ret.movedPages[0].path.split("/").slice(-1)[0];
          const notExpected = to.split("/").slice(-1)[0];

          expect(actual).not.toBe(notExpected);
        } );

        it("no folders was created", () => {
          expect(ret.createdFolders.length).toBe(0);
        } );
      } );

      afterAll(async () => {
        await repo.deleteOneByPath(parentPath);
        await repo.deleteOneByPath(from);
        await repo.deleteOneByPath(to);
        await repo.delete(ret.movedPages.map((p) => p.id));
      } );
    } );

    describe("one empty subfolder to non existing folder at root", () => {
      const fromD1R1 = nonExistingFolderFrom;
      const fromD2R1 = `${fromD1R1}/1`;
      const fromD3R1 = `${fromD2R1}/2`;
      const from = fromD3R1;
      const to = nonExistingFolderTo;
      let original: PageTree;
      let ret: MoveTreeReturnType;

      beforeAll(async () => {
        [original] = (await repo.insertFolder(from)).slice(-1);
      } );

      describe("move", () => {
        let movedNodes: PageTree[];

        beforeAll(async () => {
          ret = await repo.moveTree(from, to);
          movedNodes = ret.movedPages;
        } );

        it("moved 1", () => {
          expect(movedNodes.length).toBe(1);
        } );

        it("moved same as original To (but path, depth, ancestors and parent)", () => {
          const [moved] = movedNodes;

          expectPageTreeEquals(moved, original, ["path", "title", "depth", "ancestors", "parentId"]);
          expect(moved.path).toBe(to);
          expect(moved.title).toBe(to.split("/").slice(-1)[0]);
          expect(moved.depth).not.toBe(original.depth);
          expect(moved.title).not.toBe(original.title);
          expect(moved.path).not.toEqual(original.path);
          expect(moved.parentId).not.toEqual(original.parentId);
          expect(moved.ancestors).not.toEqual(original.ancestors);
        } );
      } );

      afterAll(async () => {
        await repo.deleteByPath(fromD1R1);
        await repo.deleteByPath(to);
      } );
    } );

    describe("one non empty subfolder to non existing folder at root", () => {
      const fromD1R1 = nonExistingFolderFrom;
      const fromD2R1 = `${fromD1R1}/1`;
      const fromD3R1 = `${fromD2R1}/2`;
      const from = fromD2R1;
      const to = nonExistingFolderTo;
      const subFolderTo = `${to}/2`;
      let originalBase: PageTree;
      let originalSubfolder: PageTree;
      let ret: MoveTreeReturnType;

      beforeAll(async () => {
        [, originalBase, originalSubfolder] = await repo.insertFolder(fromD3R1);
      } );

      describe("move", () => {
        let movedNodes: PageTree[];

        beforeAll(async () => {
          ret = await repo.moveTree(from, to);
          movedNodes = ret.movedPages;
        } );

        it("moved 2", () => {
          expect(movedNodes.length).toBe(2);
        } );

        it("moved base same as original To (but path, depth, ancestors and parent)", () => {
          const movedBase = movedNodes.find((node) => node.path === to) as PageTree;

          expectPageTreeEquals(movedBase, originalBase, ["path", "title", "depth", "ancestors", "parentId"]);
          expect(movedBase.path).toBe(to);
          expect(movedBase.title).toBe(to.split("/").slice(-1)[0]);
          expect(movedBase.depth).not.toBe(originalBase.depth);
          expect(movedBase.title).not.toBe(originalBase.title);
          expect(movedBase.path).not.toBe(originalBase.path);
          expect(movedBase.parentId).not.toBe(originalBase.parentId);
          expect(movedBase.ancestors).not.toEqual(originalBase.ancestors);
        } );

        it("moved subfolder same as original To (but path, depth, ancestors and parent)", () => {
          const movedSubfolder = movedNodes.find((node) => node.path !== to) as PageTree;

          expectPageTreeEquals(movedSubfolder, originalSubfolder, ["path", "depth", "ancestors"]);
          expect(movedSubfolder.path).toBe(subFolderTo);
          expect(movedSubfolder.depth).not.toEqual(originalSubfolder.depth);
          expect(movedSubfolder.path).not.toEqual(originalSubfolder.path);
          expect(movedSubfolder.ancestors).not.toEqual(originalSubfolder.ancestors);
        } );
      } );

      afterAll(async () => {
        await repo.deleteByPath(fromD1R1);
        await repo.deleteByPath(to);
      } );
    } );

    describe("empty node at root to another empty node at root", () => {
      const from = "nonExistingNodeFrom";
      const to = "nonExistingNodeTo";
      let nodeFrom: PageTree;
      let nodeTo: PageTree;
      let movedPage: PageTree;
      const afterDelete: PageTree[] = [];

      describe("test", () => {
        beforeAll(async () => {
          [nodeFrom] = await repo.insertNode(from);
          [nodeTo] = await repo.insertNode(to);

          afterDelete.push(nodeFrom, nodeTo);
        } );

        it("nodeTo is not folder", () => {
          expect(nodeTo.isFolder).toBeFalsy();
        } );

        afterAll(async () => {
          await repo.delete(afterDelete.map((p) => p.id));
        } );

        describe("after action", () => {
          beforeAll(async () => {
            movedPage = (await repo.moveTree(from, to)).movedPages[0];
            afterDelete.push(movedPage);
          } );

          it("correct depth", () => {
            expect(movedPage.depth).toBe(1);
          } );

          it("moved page has '2' at end", () => {
            expect(movedPage.path).toBe(`${to}2`);
          } );
        } );
      } );
    } );

    describe("empty node at root to inside empty node at root", () => {
      const from = "nonExistingNodeFutureLeaf";
      const to = "nonExistingNodeFutureParent";
      const toFull = `${to}/${from}`;
      let nodeFrom: PageTree;
      let nodeTo: PageTree;
      let movedPage: PageTree;
      const afterDelete: PageTree[] = [];

      describe("test", () => {
        beforeAll(async () => {
          [nodeFrom] = await repo.insertNode(from);
          [nodeTo] = await repo.insertNode(to);

          afterDelete.push(nodeFrom, nodeTo);
        } );

        it("nodeTo is not folder", () => {
          expect(nodeTo.isFolder).toBeFalsy();
        } );

        afterAll(async () => {
          await repo.delete(afterDelete.map((p) => p.id));
        } );

        describe("after action", () => {
          beforeAll(async () => {
            movedPage = (await repo.moveTree(from, toFull)).movedPages[0];
            afterDelete.push(movedPage);
          } );

          it("correct depth", () => {
            expect(movedPage.depth).toBe(2);
          } );

          it("nodeTo is folder now", async () => {
            [nodeTo] = await repo.find( {
              where: {
                id: nodeTo.id,
              },
            } );
            expect(nodeTo.isFolder).toBeTruthy();
          } );
        } );
      } );
    } );
    describe("non empty subfolder to non existing subfolder", () => {
      const from = nonExistingFolderFrom;
      const innermostFrom = `${from}/3/4`;
      const to = `${nonExistingFolderTo}/1/2`;
      const innermostTo = `${nonExistingFolderTo}/1/2/3/4`;
      let ret: MoveTreeReturnType;
      const afterDelete: PageTree[] = [];

      describe("found From", () => {
        beforeAll(async () => {
          const createdFolders = await repo.insertFolder(innermostFrom);

          afterDelete.push(...createdFolders);
        } );

        afterAll(async () => {
          await repo.delete(afterDelete.map((p) => p.id));
        } );

        describe("onlyFolders", () => {
          const ancestors: number[] = [];

          beforeAll(async () => {
            const innermostFromPageTree = await repo.findByPath(innermostFrom) as PageTree;

            ancestors.push(...innermostFromPageTree.ancestors, innermostFromPageTree.id);
            ret = await repo.moveTree(from, to);
            afterDelete.push(...ret.createdFolders);
          } );

          it("exists all new folder tree", async () => {
            await checkSuperPathsExistence(innermostTo);
          } );

          it("moved pageTree are the same as old", () => {
            expect(ret.movedPages.length).toBe(ancestors.length);
            ret.movedPages.forEach((newPageTree) => {
              expect(ancestors.includes(newPageTree.id)).toBeTruthy();
            } );
          } );

          it("correct depth", async () => {
            const pageTrees = await repo.findByPathBeginning(nonExistingFolderTo);

            pageTrees.forEach((pageTree) => {
              const expectedDepth = pageTree.path.split("/").length;

              expect(pageTree.depth).toBe(expectedDepth);
            } );
          } );
        } );
      } );
    } );
  } );
} );

describe("createAndSave", () => {
  const nonExistingPageTreePath = "nonExistingPageTree";

  describe("all values", () => {
    let createdPageTree: PageTree;
    const expectedPageTree: PageTree = {
      id: 99999998,
      path: nonExistingPageTreePath,
      depth: 123,
      title: "title",
      isPrivate: true,
      isFolder: false,
      privateNS: "privateNS",
      parentId: 1,
      pageId: 1,
      localeCode: "en",
      ancestors: [1, 2, 3],
    };

    beforeAll(async () => {
      createdPageTree = await repo.createAndSave(expectedPageTree);
    } );

    it("defined", () => {
      expect(createdPageTree).toBeDefined();
    } );

    it("id", () => {
      const actual = createdPageTree.id;

      expect(actual).toBe(expectedPageTree.id);
    } );

    it("depth", () => {
      const actual = createdPageTree.depth;

      expect(actual).toBe(expectedPageTree.depth);
    } );

    it("title", () => {
      const actual = createdPageTree.title;

      expect(actual).toBe(expectedPageTree.title);
    } );

    it("isPrivate", () => {
      const actual = createdPageTree.isPrivate;

      expect(actual).toBe(expectedPageTree.isPrivate);
    } );

    it("isFolder", () => {
      const actual = createdPageTree.isFolder;

      expect(actual).toBe(expectedPageTree.isFolder);
    } );

    it("privateNS", () => {
      const actual = createdPageTree.privateNS;

      expect(actual).toBe(expectedPageTree.privateNS);
    } );

    it("parent", () => {
      const actual = createdPageTree.parentId;

      expect(actual).toBe(expectedPageTree.parentId);
    } );

    it("pageId", () => {
      const actual = createdPageTree.pageId;

      expect(actual).toBe(expectedPageTree.pageId);
    } );

    it("localeCode", () => {
      const actual = createdPageTree.localeCode;

      expect(actual).toBe(expectedPageTree.localeCode);
    } );

    it("ancestors", () => {
      const actual = createdPageTree.ancestors;

      expect(actual.length).toBe(expectedPageTree.ancestors.length);
      actual.forEach((a, i) => expect(a).toBe(expectedPageTree.ancestors[i]));
    } );

    it("path", () => {
      const actual = createdPageTree.path;

      expect(actual).toBe(expectedPageTree.path);
    } );

    afterAll(async () => {
      await repo.delete(createdPageTree.id);
    } );
  } );

  it("no path", async () => {
    const pageTree = {
    } as any;
    const t = async () => {
      await repo.createAndSave(pageTree);
    };

    await expect(t).rejects.toThrow(PATH_EXCEPTION);
  } );

  describe("only path. default values", () => {
    let createdPageTree: PageTree;

    beforeAll(async () => {
      const pageTree = {
        path: nonExistingPageTreePath,
      };

      createdPageTree = await repo.createAndSave(pageTree);
    } );

    it("id", () => {
      const actual = createdPageTree.id;

      expect(actual).toBeGreaterThan(0);
    } );

    it("depth", () => {
      const actual = createdPageTree.depth;

      expect(actual).toBe(1);
    } );

    it("title", () => {
      const actual = createdPageTree.title;

      expect(actual).toBe("nonExistingPageTree");
    } );

    it("isPrivate", () => {
      const actual = createdPageTree.isPrivate;

      expect(actual).toBe(false);
    } );

    it("isFolder", () => {
      const actual = createdPageTree.isFolder;

      expect(actual).toBe(true);
    } );

    it("privateNS", () => {
      const actual = createdPageTree.privateNS;

      expect(actual).toBeNull();
    } );

    it("parent", () => {
      const actual = createdPageTree.parentId;

      expect(actual).toBeNull();
    } );

    it("pageId", () => {
      const actual = createdPageTree.pageId;

      expect(actual).toBeNull();
    } );

    it("localeCode", () => {
      const actual = createdPageTree.localeCode;

      expect(actual).toBeDefined();
    } );

    it("ancestors", () => {
      const actual = createdPageTree.ancestors;

      expect(actual.length).toBe(0);
    } );

    it("path", () => {
      const expected = nonExistingPageTreePath;
      const actual = createdPageTree.path;

      expect(actual).toBe(expected);
    } );

    afterAll(async () => {
      await repo.delete(createdPageTree.id);
    } );

    it("defined", () => {
      expect(createdPageTree).toBeDefined();
    } );
  } );

  describe("at subfolder", () => {
    const nonExistingFullPath = `${nonExistingPageTreePath}/1/2/3`;
    let createdPageTree: PageTree;

    beforeAll(async () => {
      const pageTree = {
        path: nonExistingFullPath,
      };

      createdPageTree = await repo.createAndSave(pageTree);
    } );

    afterAll(async () => {
      await repo.deleteByPath(nonExistingPageTreePath);
    } );

    it("defined", () => {
      expect(createdPageTree).toBeDefined();
    } );

    it("depth", () => {
      const actual = createdPageTree.depth;

      expect(actual).toBe(4);
    } );

    it("ancestors", () => {
      const actual = createdPageTree.ancestors.length;

      expect(actual).toBe(3);
    } );

    describe("parent", () => {
      let actualId: number;
      let expectedParent: PageTree;

      beforeAll(async () => {
        actualId = createdPageTree.parentId as number;
        expectedParent = await repo.findByPath(`${nonExistingPageTreePath}/1/2`) as PageTree;

        expect(expectedParent).toBeDefined();
      } );

      it("defined", () => {
        expect(actualId).toBeDefined();
      } );

      it("it's like expected one", () => {
        const expectedId = expectedParent.id;

        expect(actualId).toBe(expectedId);
      } );
    } );

    it("superfolder exists. depth=1", async () => {
      const folderDepth1 = await repo.findByPath(nonExistingPageTreePath) as PageTree;

      expect(folderDepth1).toBeDefined();
      expect(folderDepth1.depth).toBe(1);
      expect(folderDepth1.isFolder).toBeTruthy();
    } );

    it("superfolder exists. depth=2", async () => {
      const folderDepth2 = await repo.findByPath(`${nonExistingPageTreePath}/1`) as PageTree;

      expect(folderDepth2).toBeDefined();
      expect(folderDepth2.depth).toBe(2);
      expect(folderDepth2.isFolder).toBeTruthy();
    } );

    it("superfolder exists. depth=3", async () => {
      const folderDepth3 = await repo.findByPath(`${nonExistingPageTreePath}/1/2`) as PageTree;

      expect(folderDepth3).toBeDefined();
      expect(folderDepth3.depth).toBe(3);
      expect(folderDepth3.isFolder).toBeTruthy();
    } );
  } );
} );

describe("fix", () => {
  it("AllPagesHaveToBePageTree", async () => {
    const createdPageTrees = await repo.fixAllPagesHaveToBePageTree();

    expect(createdPageTrees.length).toBeGreaterThan(-1);
    // expect(createdPageTrees.length).toBeGreaterThan(0);
    // TODO
  } );
} );
