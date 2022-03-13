
import yargs, { Arguments } from "yargs";
import connection from "../../orm/connection/Connection";
import { movePageRecursively } from "../../orm/global";

export default function command() {
  return yargs.command("move-pages [oldPath] [newPath]", "Move Pages", builder, handler);
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
  const args = {
    oldPath: <string>argv.oldPath,
    newPath: <string>argv.newPath,
  };
  const con = await connection;

  try {
    await movePageRecursively(args.oldPath, args.newPath);
  } finally {
    con.close();
  }
}
