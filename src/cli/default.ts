import yargs, { Arguments } from "yargs";
import { fetchPackageJson } from "./utils";

export default function command() {
  yargs.command("$0 [input]", `Wikijs API ${version()}`, builder, handler)
    .help()
    .alias("h", "help");

  return yargs;
}

function builder(y: yargs.Argv<{}>) {
  versionParam(y);
}

function handler<U>(argv: Arguments<U>) {
  console.log(argv);
}

function versionParam(y: yargs.Argv<{}>) {
  y
    .alias("v", "version")
    .version(version());

  return y;
}

// eslint-disable-next-line no-underscore-dangle
let _v: string;

function version() {
  if (!_v) {
    const packageJson = fetchPackageJson();

    _v = packageJson.version;
  }

  return _v;
}
