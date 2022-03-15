import log from "npmlog";
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

    log.verbose("Move", "Trying to move recusively", this.oldPath, "to", this.newPath, "...");
    log.verbose("db PageTree", "Trying to move recusively...");
    this.movedPageTrees = await this.movePageTreesRecursively();
    log.verbose("db Page", "Trying to move recusively...");
    this.movedPages = await this.movePagesRecursively();

    return {
      pages: this.movedPages,
      pageTrees: this.movedPageTrees,
    };
  }

  private async movePageTreesRecursively() {
    const moveTreeRet = await this.pageTreesRepo.moveTree(this.oldPath, this.newPath);

    return moveTreeRet.movedPages;
  }

  private async movePagesRecursively() {
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
}
