/* eslint-disable no-param-reassign */
import log from "npmlog";
// eslint-disable-next-line import/no-cycle
import PageTreeRepository from ".";
import { getParentPath } from "../../utils";
import PageTree from "../PageTree.entity";

export type MoveTreeReturnType = {
  createdFolders: PageTree[];
  movedPages: PageTree[];
};

export default async function moveTree(
  repo: Awaited<typeof PageTreeRepository>,
  oldPath: string,
  newPath: string,
): Promise<MoveTreeReturnType> {
  if (oldPath === newPath)
    throw new Error("Old path and new path are the same");

  if (newPath.startsWith(oldPath) && (newPath.length === oldPath.length || newPath[oldPath.length] === "/"))
    throw new Error("New path is inside old path");

  const oldPageTree: PageTree | null = await repo.findByPath(oldPath);

  if (!oldPageTree)
    throw new Error(`Old base path "${oldPath}" not found`);

  const newPageTree: PageTree | null = await repo.findByPath(newPath);

  if (!newPageTree)
    return caseNewPathNotFound(oldPageTree, newPath);

  const foldersToDelete: number[] = [];
  const moveOneRet = await moveOldNodeIfRequired(oldPageTree, foldersToDelete, newPageTree);
  const promises: Promise<MoveTreeReturnType>[] = await moveOldSubFolders(
    repo,
    oldPageTree,
    newPageTree,
    oldPath,
  );
  const resolvedPromises = await Promise.all(promises);
  const ret: MoveTreeReturnType = resolvedPromises.reduce(
    (acc, cur) => {
      acc.createdFolders.push(...cur.createdFolders);
      acc.movedPages.push(...cur.movedPages);

      return acc;
    },
  {
    createdFolders: [],
    movedPages: [],
  } as MoveTreeReturnType,
  );

  if (moveOneRet.pageTree)
    ret.movedPages.push(moveOneRet.pageTree);

  await deleteEmptyFolderAndSuperfolders(oldPageTree.path);

  return ret;
}

type MoveOneReturnType = {
  pageTree: PageTree | undefined;
  createdFolders: PageTree[];
};

async function moveOldNodeIfRequired(
  oldBaseTree: PageTree,
  foldersToDelete: number[],
  newBaseTree: PageTree,
): Promise<MoveOneReturnType> {
  const oldIsOnlyFolder = oldBaseTree.pageId === null && oldBaseTree.isFolder;

  if (oldIsOnlyFolder) {
    foldersToDelete.push(oldBaseTree.id);

    return {
      pageTree: undefined,
      createdFolders: [],
    };
  }

  const validNewSubPath = await fetchValidPath(newBaseTree.path);

  return moveOne(oldBaseTree, validNewSubPath);
}

async function moveOne(
  oldPageTree: PageTree,
  newPath: string,
): Promise<MoveOneReturnType> {
  const repo = await PageTreeRepository;
  const newParentPath = getParentPath(newPath);
  let newParent: PageTree | null = newParentPath
    ? await repo.findByPath(newParentPath) ?? null
    : null;
  let createdFolders: PageTree[] = [];

  if (!newParent && newParentPath) {
    createdFolders = await repo.insertFolder(newParentPath, oldPageTree);

    [newParent] = createdFolders.slice(-1);
  }

  const pageTree = {
    ...oldPageTree,
    path: newPath,
  };

  fixParentAndAncestorsAndDepth(pageTree, newParent);

  if (newParent)
    await setAsFolderIfIsNot(newParent);

  await repo.save(pageTree);

  log.verbose("db PageTree", "Moved", oldPageTree.path, "=>", newPath);

  const ret: MoveOneReturnType = {
    pageTree,
    createdFolders,
  };

  return ret;
}

async function setAsFolderIfIsNot(parent: PageTree): Promise<PageTree> {
  if (!parent.isFolder) {
    parent.isFolder = true;

    const repo = await PageTreeRepository;
    const ret = await repo.save(parent);

    return ret;
  }

  return parent;
}

function fixParentAndAncestorsAndDepth(pageTree: PageTree, newParent: PageTree | null): PageTree {
  if (!newParent) {
    pageTree.parentId = null;
    pageTree.ancestors = [];
    pageTree.depth = 1;

    return pageTree;
  }

  pageTree.parentId = newParent.id;
  pageTree.ancestors = [...newParent.ancestors, newParent.id];
  pageTree.depth = newParent.depth + 1;

  return pageTree;
}

async function moveOldSubFolders(
  repo: Awaited<typeof PageTreeRepository>,
  oldBaseTree: PageTree,
  newBaseTree: PageTree,
  oldPath: string,
) {
  const oldSubPageTrees: PageTree[] = await repo.findByParentId(oldBaseTree.id);
  const promises: Promise<MoveTreeReturnType>[] = [];

  for (const oldSubPageTree of oldSubPageTrees) {
    const candidateNewPath = newBaseTree.path + oldSubPageTree.path.slice(oldPath.length);
    const promise = moveTree(repo, oldSubPageTree.path, candidateNewPath);

    promises.push(promise);
  }

  return promises;
}

async function fetchValidPath(initialNewPath: string): Promise<string> {
  const initialNewPathIsAvailable = await fetchIsAvailablePath(initialNewPath);

  if (initialNewPathIsAvailable)
    return initialNewPath;

  for (let i = 2; ;i++) {
    const newPath = initialNewPath + i;
    // eslint-disable-next-line no-await-in-loop
    const isAvailable = await fetchIsAvailablePath(newPath);

    if (isAvailable)
      return newPath;
  }
}

async function fetchIsAvailablePath(path: string): Promise<boolean> {
  const repo = await PageTreeRepository;
  const found = await repo.findOne( {
    where: {
      path,
    },
  } );

  return found === null;
}

async function caseNewPathNotFound(
  oldBaseTree: PageTree,
  newPath: string,
): Promise<MoveTreeReturnType> {
  const repo = await PageTreeRepository;
  // Actualizar path por simple reemplazo
  const pageTrees = await repo.updateReplacePathBeginning(oldBaseTree.path, newPath);
  const newBaseTreeIndex: number = pageTrees.findIndex((pt) => pt.id === oldBaseTree.id);

  if (newBaseTreeIndex === -1)
    throw new Error(`Base node with id ${oldBaseTree.id} not found in updated paths of pageTrees.`);

  const newBaseTree: PageTree = pageTrees.slice(newBaseTreeIndex, newBaseTreeIndex + 1)[0];
  const subPageTrees = [
    ...pageTrees.slice(0, newBaseTreeIndex),
    ...pageTrees.slice(newBaseTreeIndex + 1),
  ];
  // Crear superfolders (NO la actual)
  let parentFolder: PageTree | null = null;
  const parentPath = getParentPath(newPath);
  const ret: MoveTreeReturnType = {
    movedPages: [],
    createdFolders: [],
  };

  if (parentPath) {
    parentFolder = await repo.findByPath(parentPath) ?? null;

    if (!parentFolder) {
      ret.createdFolders = await repo.insertFolder(parentPath, newBaseTree);

      const [lastCreatedFolder] = ret.createdFolders.slice(-1);

      parentFolder = lastCreatedFolder;
    } else
      await setAsFolderIfIsNot(parentFolder);
  }

  // Actualizar parent a la última superfolder creada y ancestors
  fixParentAndAncestorsAndDepth(newBaseTree, parentFolder);

  rebuildAncestorsAndDepth(newBaseTree, subPageTrees);

  // Guardar cambios
  const savedPages = await repo.save(pageTrees);

  ret.movedPages = savedPages;

  return ret;
}

function rebuildAncestorsAndDepth(baseTree: PageTree, pageTrees: PageTree[]): PageTree[] {
  for (const pageTree of pageTrees) {
    const indexParent = pageTree.ancestors.findIndex((ancestorId) => ancestorId === baseTree.id);
    const subTreeWithBase = pageTree.ancestors.slice(indexParent);

    pageTree.ancestors = [...baseTree.ancestors, ...subTreeWithBase];
    pageTree.depth = pageTree.ancestors.length + 1;
  }

  return pageTrees;
}

export async function deleteEmptyFolderAndSuperfolders(pageTreePath: string) {
  const repo = await PageTreeRepository;
  const pageTree = await repo.findByPath(pageTreePath);

  if (!pageTree)
    return [];

  const reversedAncestors: number[] = [...pageTree.ancestors, pageTree.id].reverse();
  const promises = reversedAncestors.map(async (ancestor: number, i) => {
    const pageTreesWithParent = await repo.findByParentId(ancestor);

    if (pageTreesWithParent.length > 1)
      return null;

    if (pageTreesWithParent.length === 1
      && pageTreesWithParent[0].id !== reversedAncestors[i - 1])
      return null;

    return ancestor;
  } );
  const emptyFolders: number[] = (await Promise.all(promises))
    .filter((n) => n !== null) as number[];

  if (emptyFolders.length === 0)
    return [];

  const query = repo.createQueryBuilder()
    .delete()
    .from(PageTree)
    .where("id IN (:...ids)", {
      ids: emptyFolders,
    } )
    .returning("*");
  const deleteResult = await query.execute();

  return deleteResult.raw;
}

export function replaceAntecesorsParentAndDepth(
  repo: Awaited<typeof PageTreeRepository>,
  pageTreesToChange: PageTree[],
  oldBasePath: string,
  oldBaseTree: PageTree,
  newBaseTree: PageTree | undefined,
) {
  const antecesorsBaseOld = [...oldBaseTree.ancestors, oldBaseTree.id];
  const antecesorsBaseNew = newBaseTree ? [...newBaseTree.ancestors, newBaseTree.id] : [];
  const promises = [];

  for (const pageTree of pageTreesToChange) {
    pageTree.ancestors = [
      ...antecesorsBaseNew,
      ...pageTree.ancestors.slice(antecesorsBaseOld.length),
    ];
    // eslint-disable-next-line prefer-destructuring
    pageTree.parentId = pageTree.ancestors.slice(-1)[0];
    pageTree.depth = pageTree.ancestors.length + 1;

    const p = repo.save(pageTree);

    promises.push(p);
  }

  return Promise.all(promises);
}

export async function updateReplaceAllPathBeginning(
  repo: Awaited<typeof PageTreeRepository>,
  oldPathBeginning: string,
  newPathBeginning: string,
): Promise<PageTree[]> {
  const subPageTrees = await updateReplaceAllSubPath(repo, oldPathBeginning, newPathBeginning);
  const exactPageTree = await updateReplaceExactPath(repo, oldPathBeginning, newPathBeginning);

  if (!exactPageTree)
    return [...subPageTrees];

  return [...subPageTrees, exactPageTree];
}

export async function updateReplaceExactPath(
  repo: Awaited<typeof PageTreeRepository>,
  oldPath: string,
  newPath: string,
): Promise<PageTree | undefined> {
  const queryStr = "UPDATE \"pageTree\" pt SET path = $2 WHERE path = $1 AND not exists (select * from \"pageTree\" p where p.path = $2) RETURNING *";
  const parameters = [
    oldPath,
    newPath,
  ];
  const result = await repo.query(queryStr, parameters);

  return result[0][0];
}

export async function updateReplaceAllSubPath(
  repo: Awaited<typeof PageTreeRepository>,
  oldBasePath: string,
  newBasePath: string,
): Promise<PageTree[]> {
  const queryStr = "UPDATE \"pageTree\" pt SET path = replace(path, $1, $2) WHERE path like $3 AND not exists (select * from \"pageTree\" p where p.path = replace(pt.path, $1, $2)) RETURNING *";
  const parameters = [
    `${oldBasePath}/`,
    `${newBasePath}/`,
    `${oldBasePath}/%`,
  ];
  const result = await repo.query(queryStr, parameters);

  return result[0];
}
