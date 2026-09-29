import express from "express";
import cors from "cors";
import * as dotenv from "dotenv";
import * as path from "path";
import { trendsRouter } from "./routes/trends";
import { compareRouter } from "./routes/compare";
import { oversupplyRouter } from "./routes/oversupply";
import { freshnessRouter } from "./routes/freshness";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/trends", trendsRouter);
app.use("/compare", compareRouter);
app.use("/oversupply", oversupplyRouter);
app.use("/freshness", freshnessRouter);

const port = Number(process.env.API_PORT ?? 4000);
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
  console.log(`  GET /trends?neighborhood=kilimani&bedrooms=2`);
  console.log(`  GET /compare?neighborhood=kilimani&bedrooms=2&price=90000`);
  console.log(`  GET /oversupply?neighborhood=kilimani`);
  console.log(`  GET /freshness`);
});
