/* eslint-disable import/prefer-default-export */
import { Page, PageRepository } from "orm/page";
import { PageTree, PageTreeRepository } from "orm/pageTree";
import { Connection } from "typeorm";

type Params = {
  oldPath: string;
  newPath: string;
  connection: Connection;
};

export function movePageRecursively(params: Params) {
  return new Process(params).doProcess();
}

class Process {
  oldPath: string;

  newPath: string;

  connection: Connection;

  movedPages!: Page[];

  movedPageTrees!: PageTree[];

  pagesRepo: PageRepository;

  pageTreesRepo: PageTreeRepository;

  oldRootPageTree: PageTree | undefined;

  oldRootPage!: Page;

  constructor( { oldPath, newPath, connection }: Params) {
    this.oldPath = oldPath;
    this.newPath = newPath;
    this.connection = connection;

    this.pagesRepo = this.connection.getCustomRepository(PageRepository);
    this.pageTreesRepo = this.connection.getCustomRepository(PageTreeRepository);
  }

  async doProcess() {
    this.movedPageTrees = await this.moveSubPageTreesRecursively();
    this.movedPages = await this.moveSubPagesRecursively();

    await this.manageOldRootPageAndOldRootPageTree();

    return {
      pages: this.movedPages,
      pageTrees: this.movedPageTrees,
    };
  }

  moveSubPageTreesRecursively() {
    return this.pageTreesRepo.updateReplaceTree(this.oldPath, this.newPath);
  }

  moveSubPagesRecursively() {
    return this.pagesRepo.updateReplacePathBeginning(this.oldPath, this.newPath);
  }

  async saveOldRootPageTree() {
    await this.pageTreesRepo.save(this.oldRootPageTree as PageTree);
    this.movedPageTrees.unshift(this.oldRootPageTree as PageTree);
  }

  async saveOldRootPage() {
    await this.pagesRepo.save(this.oldRootPage);
    this.movedPages.unshift(this.oldRootPage as Page);
  }

  removeOldRootPageTree() {
    return this.pageTreesRepo.remove(this.oldRootPageTree as PageTree);
  }

  oldRootPageTreeHasPage() {
    return (this.oldRootPageTree as PageTree).pageId !== null;
  }

  async manageOldRootPageAndOldRootPageTree() {
    this.oldRootPageTree = await this.pageTreesRepo.findByPath(this.oldPath);

    if (this.oldRootPageTree) {
      if (this.oldRootPageTreeHasPage()) {
        this.oldRootPage = await this.fetchRootPage();

        this.oldRootPage.path = this.oldRootPageTree.path;

        this.changePathAndRenamePageTree();
        this.saveOldRootPageTree();

        this.changePathAndRenamePage();
      } else
        await this.removeOldRootPageTree();
    }
  }

  changePathAndRenamePageTree() {
    throw new Error("Method not implemented.");
  }

  fetchRootPage() {
    return this.pagesRepo.findOne(this.oldRootPageTree?.pageId as number) as Promise<Page>;
  }

  changePathAndRenamePage() {
    // TODO: cambiar al mismo path y title que pageTree
  }
}
