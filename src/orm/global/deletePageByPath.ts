import { getCustomRepository } from "typeorm";
import { PageRepository } from "../page";

export default async function deletePageByPath(path: string) {
  const pageRepo = getCustomRepository(PageRepository);
  const pageEntity = await pageRepo.deleteByPath(path);

  return pageEntity;
}
