import { config } from "dotenv";
import { createConnection } from "typeorm";

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
