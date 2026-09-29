import express from "express";
import cors from "cors";
import * as dotenv from "dotenv";
import { trendsRouter } from "./routes/trends";
import { compareRouter } from "./routes/compare";
import { oversupplyRouter } from "./routes/oversupply";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/trends", trendsRouter);
app.use("/compare", compareRouter);
app.use("/oversupply", oversupplyRouter);

const port = Number(process.env.API_PORT ?? 4000);
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
