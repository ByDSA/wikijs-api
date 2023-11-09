import { config } from "dotenv";
import assert from "node:assert";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { createConnection } from "typeorm";

if (process.env.NODE_ENV === "test") {
  const p = join(__dirname, "..", "..", "..", "test.env");
  const exists = existsSync(p);

  assert(exists, `File ${p} doesn't exist`);
  config( {
    path: p,
  } );
} else
  config();

const DEFAULT_CONFIG = {
  host: "localhost",
  port: 5432,
  username: "root",
  password: "",
  database: "db",
};
const connection = createConnection( {
  type: "postgres",
  host: (process.env.PGHOST ?? DEFAULT_CONFIG.host) as string,
  port: (process.env.PGPORT ?? DEFAULT_CONFIG.port) as number,
  username: (process.env.PGUSER ?? DEFAULT_CONFIG.username) as string,
  password: (process.env.PGPASSWORD ?? DEFAULT_CONFIG.password) as string,
  database: (process.env.PGDATABASE ?? DEFAULT_CONFIG.database) as string,
  entities: [`${__dirname}/../**/*.entity.{js,ts}`],
} );

export default connection;
