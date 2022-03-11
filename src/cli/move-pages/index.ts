
import yargs, { Arguments } from "yargs";

export default function command() {
  return yargs.command("move-pages", "Move Pages", builder, handler);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function builder(y: yargs.Argv<{}>) {

}

function handler<U>(argv: Arguments<U>) {
  console.log(argv);
}
