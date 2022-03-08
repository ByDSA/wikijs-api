import { config } from "dotenv";
import { createConnection } from "typeorm";

config();
const connection = createConnection( {
  type: "postgres",
  host: (process.env.PGHOST ?? "localhost") as string,
  port: (process.env.PGPORT ?? 5432) as number,
  username: (process.env.PGUSER ?? "root") as string,
  password: (process.env.PGPASSWORD ?? "password") as string,
  database: (process.env.PGDATABASE ?? "database") as string,
  entities: [`${__dirname}/../**/*.entity.{js,ts}`],
} );

export default connection;
