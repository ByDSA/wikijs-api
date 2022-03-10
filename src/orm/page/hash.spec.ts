import Page from "./Page.entity";
import { generateHash } from "./utils";

it("hash", () => {
  const expected = "d630ac84cd7fd338b32491c9cc21b3fb3fbd5211";
  const page = {
    localeCode: "es",
    path: "inf/is/sketch",
  };
  const actual = generateHash(page as Page);

  expect(actual).toBe(expected);
} );
