import c from "orm/connection/Connection";
import { Connection } from "typeorm";
import fetchDefaultLangFromSettings from "./fetchDefaultLangFromSettings";

let connection: Connection;

beforeAll(async () => {
  connection = await c;
} );

afterAll(() => {
  connection.close();
} );

it("test", async () => {
  const expected = "es";
  const actual = await fetchDefaultLangFromSettings();

  expect(actual).toBe(expected);
} );
