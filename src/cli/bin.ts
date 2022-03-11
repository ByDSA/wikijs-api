import chalk from "chalk";
import yargs from "yargs";
import defaultCmd from "./default";
import movePagesCmd from "./move-pages";

function processParams() {
  defaultCmd();
  movePagesCmd();

  yargs.parse();
}

processParams();

console.log(chalk.green("Done!"));
