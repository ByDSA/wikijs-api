import { Connection, getConnection } from "typeorm";

export default async function fetchDefaultLangFromSettings(
  connection: Connection = getConnection(),
) {
  const json = (await connection.query("select value from settings where key = 'lang'"))[0].value;

  return json.code;
}
