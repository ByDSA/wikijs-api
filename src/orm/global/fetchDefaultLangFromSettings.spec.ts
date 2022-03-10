import testConnection from "#tests/Connection";
import { Connection } from "typeorm";
import fetchDefaultLangFromSettings from "./fetchDefaultLangFromSettings";

let connection: Connection;

beforeAll(async () => {
  connection = await testConnection;
} );

afterAll(() => {
  connection.close();
} );

it("test", async () => {
  const expected = "es";
  const actual = await fetchDefaultLangFromSettings();

  expect(actual).toBe(expected);
} );
