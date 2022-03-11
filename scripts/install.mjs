#!/usr/bin/env zx
/* eslint-disable no-undef */
import fs from "fs";

$.verbose = false;
const NAME = "wikijs";
const BIN_PATH = `/bin/${NAME}`;
const ENTRY_POINT = "dist/src/cli/bin.js";

await $`rm -f ${BIN_PATH}`;
await $`sudo ln -s "$(pwd)/${ENTRY_POINT}" ${BIN_PATH}`;
await $`sudo chmod +777 ${BIN_PATH}`;

const fileStr = fs.readFileSync(ENTRY_POINT, "utf8");

if (!fileStr.startsWith("#")) {
  const newFileContent = `#!/usr/bin/env node\n${fileStr}`;

  fs.writeFileSync(ENTRY_POINT, newFileContent);
}
