import { Connection, getCustomRepository } from "typeorm";
import { Page, PageRepository } from "../page";
import { PageTree, PageTreeRepository } from "../pageTree";

type ReturnType = {
  pages: Page[];
  pageTrees: PageTree[];
};

export {
  ReturnType,
};

export default function movePageRecursively(oldPath: string, newPath: string): Promise<ReturnType> {
  return new Process(oldPath, newPath).doProcess();
}

class Process {
  oldPath: string;

  newPath: string;

  connection!: Connection;

  movedPages!: Page[];

  movedPageTrees!: PageTree[];

  pagesRepo!: PageRepository;

  pageTreesRepo!: PageTreeRepository;

  oldRootPageTree: PageTree | undefined;

  oldRootPage!: Page;

  constructor(oldPath: string, newPath: string) {
    this.oldPath = oldPath;
    this.newPath = newPath;
  }

  async doProcess() {
    this.pagesRepo = getCustomRepository(PageRepository);
    this.pageTreesRepo = getCustomRepository(PageTreeRepository);

    this.movedPageTrees = await this.movePageTreesRecursively();
    this.movedPages = await this.movePagesRecursively();

    // await this.manageOldRootPageAndOldRootPageTree();

    return {
      pages: this.movedPages,
      pageTrees: this.movedPageTrees,
    };
  }

  movePageTreesRecursively() {
    return this.pageTreesRepo.moveTree(this.oldPath, this.newPath);
  }

  async movePagesRecursively() {
    const pageIdsToMove = this.movedPageTrees.reduce((acc, pageTree) => {
      const { pageId } = pageTree;

      if (pageId)
        acc.push(pageId);

      return acc;
    }, [] as number[]);
    const pagesToMove = await this.pagesRepo.findByIds(pageIdsToMove);
    const movedPages = pagesToMove.map((page) => {
      const updatedPage = {
        ...page,
      };

      if (page.path === this.oldPath)
        updatedPage.path = this.newPath;
      else
        updatedPage.path = page.path.replace(`${this.oldPath}/`, `${this.newPath}/`);

      return this.pagesRepo.save(updatedPage);
    } );

    return Promise.all(movedPages);
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

  // private async manageOldRootPageAndOldRootPageTree() {
  //   this.oldRootPageTree = await this.pageTreesRepo.findByPath(this.oldPath);

  //   if (this.oldRootPageTree) {
  //     if (this.oldRootPageTreeHasPage()) {
  //       this.oldRootPage = await this.fetchRootPage();

  //       this.oldRootPage.path = this.oldRootPageTree.path;

  //       this.changePathAndRenameOldRootPageTree();
  //       await this.saveOldRootPageTree();

  //       this.changePathAndRenameOldRootPage();
  //       await this.saveOldRootPage();
  //     } else
  //       await this.removeOldRootPageTree();
  //   }
  // }

  changePathAndRenameOldRootPageTree() {
    const pageTree = this.oldRootPageTree as PageTree;

    pageTree.path = `${this.oldRootPageTree?.path}_(2)`;
    pageTree.title = `${this.oldRootPageTree?.title} (2)`;
  }

  fetchRootPage() {
    return this.pagesRepo.findOne(this.oldRootPageTree?.pageId as number) as Promise<Page>;
  }

  changePathAndRenameOldRootPage() {
    const page = this.oldRootPage as Page;
    const pageTree = this.oldRootPageTree as PageTree;

    page.path = pageTree.path;
    page.title = pageTree.title;
  }
}
