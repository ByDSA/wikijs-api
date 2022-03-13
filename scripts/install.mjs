#!/usr/bin/env zx
/* eslint-disable no-undef */
import { setFileAsNodeExecutable } from "./utils.mjs";

$.verbose = false;
const NAME = "wikijs";
const BIN_PATH = `/bin/${NAME}`;
const ENTRY_POINT = "dist/cli/bin.js";

await $`rm -f ${BIN_PATH}`;
await $`sudo ln -s "$(pwd)/${ENTRY_POINT}" ${BIN_PATH}`;
await $`sudo chmod +777 ${BIN_PATH}`;

setFileAsNodeExecutable(ENTRY_POINT);
