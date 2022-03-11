export * from "./exceptions";

export function getParentPath(path: string) {
  const parts = path.split("/");

  parts.pop();

  return parts.join("/");
}

export function getSuperpaths(path: string): string[] {
  const parts = path.split("/");
  const ret = [];

  for (let i = 0; i < parts.length - 1; i++) {
    const superpath = parts.slice(0, i + 1).join("/");

    ret.push(superpath);
  }

  return ret;
}
