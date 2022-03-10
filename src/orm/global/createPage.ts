import { Page, PageRepository } from "orm/page";
import { PageTree, PageTreeRepository } from "orm/pageTree";
import { getCustomRepository } from "typeorm";

type ReturnType = {
  page: Page;
  pageTree: PageTree;
};
export {
  ReturnType,
};

type Options = {
  path: string;
  title?: string;
};
export default async function createPage(options: Options): Promise<ReturnType> {
  const pageRepo = getCustomRepository(PageRepository);
  const pageTreeRepo = getCustomRepository(PageTreeRepository);
  const pageEntity = await pageRepo.createAndSave(options);
  const superFolders = await pageTreeRepo.createSuperFolders(options.path);
  const lastFolder = superFolders.at(-1);
  const lastFolderAncestors = lastFolder?.ancestors;
  const ancestors = lastFolderAncestors ? [...lastFolderAncestors, lastFolder.id] : [];
  const pageTreeEntity = await pageTreeRepo.createAndSave( {
    ...options,
    pageId: pageEntity.id,
    ancestors,
  } );

  return {
    page: pageEntity,
    pageTree: pageTreeEntity,
  };
}
