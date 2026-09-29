import { Pool } from "pg";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config();

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
