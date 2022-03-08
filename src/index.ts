import connection from "./orm/connection/Connection";
import { PageRepository } from "./orm/page";
import { PageTreeRepository } from "./orm/pageTree";

async function main() {
  const con = await connection;
  const pageRepo = con.getCustomRepository(PageRepository);
  const pageTreeRepo = con.getCustomRepository(PageTreeRepository);
  const from = "infbb";
  const to = "inf";
  const res = await pageRepo.updateReplacePathBeginning(from, to);

  console.log(res);

  const res3 = await pageTreeRepo.updateReplaceTree(from, to);
  const res2 = await pageRepo.updateReplaceInContent(`(/${from}`, `(/${to}`);

  console.log(res2);

  await con.close();
}

export default main;
