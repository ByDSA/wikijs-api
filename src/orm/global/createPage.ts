import { getCustomRepository } from "typeorm";
import { Page, PageRepository } from "../page";
import { PageTree, PageTreeRepository } from "../pageTree";
import { getParentPath } from "../utils";

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
  const parentFolder = await pageTreeRepo.findByPath(getParentPath(options.path));
  const lastFolderAncestors = parentFolder?.ancestors;
  const ancestors = lastFolderAncestors ? [...lastFolderAncestors, parentFolder.id] : [];
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
