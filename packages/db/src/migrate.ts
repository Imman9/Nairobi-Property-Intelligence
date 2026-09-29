import { readFileSync } from "fs";
import { join } from "path";
import { Client } from "pg";
import * as dotenv from "dotenv";

dotenv.config({ path: join(__dirname, "../../../.env") });
dotenv.config();

async function main() {
  const sql = readFileSync(join(__dirname, "schema.sql"), "utf-8");
  const client = new Client({ connectionString: process.env.DATABASE_URL });

  await client.connect();
  console.log("Applying schema.sql ...");
  await client.query(sql);
  console.log("Schema applied successfully.");
  await client.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
