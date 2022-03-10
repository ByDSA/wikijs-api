import { PageRepository } from "orm/page";
import { getCustomRepository } from "typeorm";

export default async function deletePageByPath(path: string) {
  const pageRepo = getCustomRepository(PageRepository);
  const pageEntity = await pageRepo.deleteByPath(path);

  return pageEntity;
}
