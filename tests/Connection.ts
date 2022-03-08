import { config } from "dotenv";
import path from "path";
import { createConnection } from "typeorm";

config( {
  path: `${__dirname}/test.env`,
} );
const ormFolder = path.resolve(__dirname, "..", "src", "orm");
const connection = createConnection( {
  type: "postgres",
  host: (process.env.PGHOST ?? "localhost") as string,
  port: (process.env.PGPORT ?? 5432) as number,
  username: (process.env.PGUSER ?? "root") as string,
  password: (process.env.PGPASSWORD ?? "password") as string,
  database: (process.env.PGDATABASE ?? "database") as string,
  entities: [`${ormFolder}/**/*.entity.{js,ts}`],
} );

export default connection;
