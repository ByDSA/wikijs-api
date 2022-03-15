
import log from "npmlog";
import yargs, { Arguments } from "yargs";
import connection from "../../orm/connection/Connection";
import { movePageRecursively } from "../../orm/global";
import { fixPath } from "../../orm/utils";

export default function command() {
  return yargs.command("move [oldPath] [newPath]", "Move pages and folders recursively.", builder, handler);
}

function builder(y: yargs.Argv<{}>) {
  y.positional("oldPath", {
    type: "string",
    describe: "Old path",
    demandOption: true,
  } );
  y.positional("newPath", {
    type: "string",
    describe: "New path",
    demandOption: true,
  } );
}
async function handler<U>(argv: Arguments<U>) {
  if (argv.verbose)
    log.level = "verbose";

  const args = {
    oldPath: <string>argv.oldPath,
    newPath: <string>argv.newPath,
  };
  const con = await connection;

  args.oldPath = fixPath(args.oldPath);
  args.newPath = fixPath(args.newPath);

  try {
    const ret = await movePageRecursively(args.oldPath, args.newPath);

    ret.pages.forEach((page) => {
      const oldPath = page.path.replace(args.newPath, args.oldPath);

      log.info("move", `'${oldPath}' => '${page.path}'`);
    } );
  } catch (e: any) {
    log.error("", e.message);

    if (log.level === "verbose")
      log.error("", e.stack);
  } finally {
    con.close();
  }
}
