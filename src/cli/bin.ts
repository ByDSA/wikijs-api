#!/usr/bin/env node
import chalk from "chalk";
import log from "npmlog";
import yargs from "yargs";
import defaultCmd from "./default";
import movePagesCmd from "./move";

async function processParams() {
  log.level = "info";
  await defaultCmd();
  await movePagesCmd();

  await yargs.parse();
}

processParams().then(() => {
  log.info("", chalk.green("Done!"));
} );
