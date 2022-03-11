import { existsSync, readFileSync } from "fs";
import { dirname, resolve } from "path";

/* eslint-disable import/prefer-default-export */
export function getMainDir() {
  const possiblePaths = module.paths.filter((p) => p.endsWith("node_modules"));

  for (const p of possiblePaths) {
    if (existsSync(p))
      return dirname(p);
  }

  throw new Error();
}

export function fetchPackageJson() {
  const packageJsonPath = resolve(getMainDir(), "package.json");
  const packageJsonTxt = readFileSync(packageJsonPath, "utf8");
  const packageJson = JSON.parse(packageJsonTxt);

  return packageJson;
}
