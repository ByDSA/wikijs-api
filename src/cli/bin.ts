import chalk from "chalk";
import yargs from "yargs";
import defaultCmd from "./default";
import movePagesCmd from "./move-pages";

async function processParams() {
  await defaultCmd();
  await movePagesCmd();

  await yargs.parse();
}

processParams().then(() => {
  console.log(chalk.green("Done!"));
} );
