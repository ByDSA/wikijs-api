import { getParentPath } from "orm/utils";
import { getCustomRepository } from "typeorm";
// eslint-disable-next-line import/no-cycle
import PageTreeRepository from ".";
import PageTree from "../PageTree.entity";

export default async function moveTree(
  repo: PageTreeRepository,
  oldPath: string,
  newPath: string,
): Promise<PageTree[]> {
  if (oldPath === newPath)
    throw new Error("Old path and new path are the same");

  if (newPath.startsWith(oldPath) && (newPath.length === oldPath.length || newPath[oldPath.length] === "/"))
    throw new Error("New path is inside old path");

  const oldPageTree: PageTree | undefined = await repo.findByPath(oldPath);

  if (!oldPageTree)
    throw new Error(`Old base path "${oldPath}" not found`);

  const newPageTree: PageTree | undefined = await repo.findByPath(newPath);

  if (!newPageTree)
    return caseNewPathNotFound(oldPageTree, newPath);

  const foldersToDelete: number[] = [];

  await moveOldNodeIfRequired(oldPageTree, foldersToDelete, newPageTree);

  const ret: PageTree[] = [];
  const promises: Promise<PageTree[]>[] = await moveOldSubFolders(
    repo,
    oldPageTree,
    newPageTree,
    oldPath,
  );
  const resolvedPromises = await Promise.all(promises);

  ret.push(...resolvedPromises.flat());

  /// ///
  await deleteEmptyFolderAndSuperfolders(repo, oldPageTree.path);

  return ret;
}

type MoveOneReturnType = {
  page: PageTree | undefined;
  createdFolders: PageTree[];
};

async function moveOldNodeIfRequired(
  oldBaseTree: PageTree,
  foldersToDelete: number[],
  newBaseTree: PageTree,
): Promise<MoveOneReturnType> {
  const isOnlyFolder = oldBaseTree.pageId === null && oldBaseTree.isFolder;

  if (isOnlyFolder) {
    foldersToDelete.push(oldBaseTree.id);

    return {
      page: undefined,
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
  const repo = getCustomRepository(PageTreeRepository);
  const oldParentPath = getParentPath(oldPageTree.path);
  const oldParent: PageTree | undefined = await repo.findByPath(oldParentPath);

  if (!oldParent)
    throw new Error(`Parent of old base path "${oldPageTree.path}" not found`);

  const newParentPath = getParentPath(newPath);
  let newParent: PageTree | undefined = await repo.findByPath(newParentPath);
  let createdFolders: PageTree[] = [];

  if (!newParent) {
    createdFolders = await repo.insertFolder(newParentPath, oldPageTree);

    [newParent] = createdFolders.slice(-1);
  }

  const page = {
    ...oldPageTree,
  };

  // TODO: cambiar parent y ascensors
  sasasas;
  const ret: MoveOneReturnType = {
    page,
    createdFolders,
  };

  return ret;
}

async function moveOldSubFolders(
  repo: PageTreeRepository,
  oldBaseTree: PageTree,
  newBaseTree: PageTree,
  oldPath: string,
) {
  const oldSubPageTrees: PageTree[] = await repo.findByParentId(oldBaseTree.id);
  const promises: Promise<PageTree[]>[] = [];

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
  return (await getCustomRepository(PageTreeRepository).findOne( {
    path,
  } )) === undefined;
}

async function caseNewPathNotFound(
  repo: PageTreeRepository,
  oldBaseTree: PageTree,
  newPath: string,
) {
  // Actualizar path por simple reemplazo

  // Crear superfolders (NO la actual)

  // Actualizar parent a la última superfolder creada

  // Actualizar ancestors

  // return todas las pageTree cambiadas

  /// ////////////////
  const splittedNewPath = newPath.split("/");
  const newPathDepth = splittedNewPath.length;

  if (!newBaseTree && newPathDepth > 1) {
    if (oldBaseTree.isFolder) {
      const insertedFolders = await repo.insertFolder(newPath);

      [newBaseTree] = insertedFolders.slice(-1);
    } else {
      const newBaseTreeParentPath = splittedNewPath.slice(0, -1)
        .join("/");
      const newBaseTreeParent: PageTree | undefined = await repo.findByPath(newBaseTreeParentPath);

      if (!newBaseTreeParent) {
        const insertedFolders = await repo.insertFolder(newBaseTreeParentPath, oldBaseTree);

        [newBaseTree] = insertedFolders.slice(-1);
      }
    }
  }

  const pageTreesToChange = await updateReplaceAllPathBeginning(repo, oldPath, newPath);
  const ret = await replaceAntecesorsParentAndDepth(
    repo,
    pageTreesToChange,
    oldPath,
    oldBaseTree,
    newBaseTree,
  );
}

export async function deleteEmptyFolderAndSuperfolders(
  repo: PageTreeRepository,
  pageTreePath: string,
) {
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
  repo: PageTreeRepository,
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
  repo: PageTreeRepository,
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
  repo: PageTreeRepository,
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
  repo: PageTreeRepository,
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
