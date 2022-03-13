/* eslint-disable import/prefer-default-export */

import fs from "fs";

export function setFileAsNodeExecutable(filePath) {
  const fileStr = fs.readFileSync(filePath, "utf8");

  if (!fileStr.startsWith("#")) {
    const newFileContent = `#!/usr/bin/env node\n${fileStr}`;

    fs.writeFileSync(filePath, newFileContent);
  }
}
