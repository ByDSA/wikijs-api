/* eslint-disable prefer-destructuring */
import connection from "#tests/Connection";
import { getSuperpaths } from "orm/utils";
import { PATH_EXCEPTION } from "orm/utils/exceptions";
import { Connection } from "typeorm";
import Repository from ".";
import PageTree from "../PageTree.entity";
import { deleteEmptyFolderAndSuperfolders, updateReplaceAllPathBeginning } from "./moveTree";

let repo: Repository;
let con: Connection;
const nonExistingFolderPath = "nonExistingFolder";
const nonExistingFolderFullPath = "nonExistingFolder/2/3/4";
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

describe("private", () => {
  type RepoPrivate = {
    existsSuperfoldersByPath: (path: string)=> Promise<boolean>;
    insertSuperFoldersIfNotExist: (path: string)=> Promise<PageTree[]>;
  };
  let repoAny: RepoPrivate;

  beforeAll(() => {
    repoAny = (repo as any as RepoPrivate);
  } );
  describe("removeFoldersRecursivelyIfEmpty", () => {
    it("test", async () => {
      const innermostPath = `${nonExistingFolderPath}/1/3`;

      await repo.insertFolder(innermostPath);

      const ret = await deleteEmptyFolderAndSuperfolders(repo, innermostPath);

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

      expect(actual).toBeUndefined();
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
    const from = nonExistingFolderFrom;
    const innermostFrom = `${from}/3/4`;
    const to = `${nonExistingFolderTo}/1/2`;
    const innermostTo = `${nonExistingFolderTo}/1/2/3/4`;

    describe("found From", () => {
      beforeAll(async () => {
        await repo.insertFolder(innermostFrom);
      } );

      afterAll(async () => {
        await repo.deleteOneByPath(nonExistingFolderFrom);
        await repo.deleteOneByPath(nonExistingFolderTo);
      } );

      describe("onlyFolders", () => {
        const ancestors: number[] = [];
        const newPageTrees: PageTree[] = [];

        beforeAll(async () => {
          const fromPageTree = await repo.findByPath(innermostFrom) as PageTree;

          ancestors.push(...fromPageTree.ancestors, fromPageTree.id);
          ancestors.splice(0, 1);
          newPageTrees.push(...await repo.moveTree(from, to));
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

    expect(createdPageTrees.length).toBeGreaterThan(0);
    // TODO
  } );
} );
