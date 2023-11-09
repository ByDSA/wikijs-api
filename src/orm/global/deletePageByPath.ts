import { PageRepository } from "../page";

export default async function deletePageByPath(path: string) {
  const pageRepo = await PageRepository;
  const pageEntity = await pageRepo.deleteByPath(path);

  return pageEntity;
}
