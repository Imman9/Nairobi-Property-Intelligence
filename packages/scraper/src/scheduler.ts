#!/usr/bin/env ts-node
/**
 * Scheduled pipeline runner.
 *
 * Runs the scraper → matcher pipeline on a weekly schedule (every Monday at 03:00 UTC).
 * Can also be triggered manually: pass "--now" to run immediately once.
 *
 * Usage:
 *   ts-node src/scheduler.ts          # starts the cron daemon
 *   ts-node src/scheduler.ts --now    # runs once immediately, then exits
 *
 * Environment:
 *   DATABASE_URL      — Postgres connection string
 *   SCRAPER_SOURCE    — "all", "kenyapropertycentre", "propertypro", or "mock"
 *   SCHEDULER_CRON    — Override cron expression (default: "0 3 * * 1" = Mon 3am UTC)
 */

import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config();

import { execSync } from "child_process";
import * as cron from "node-cron";

const ROOT = path.resolve(__dirname, "../../..");
const SCRAPER_CMD = "npm run scraper:run";
const MATCHER_CMD = "npm run matcher:run";
const CRON_EXPR = process.env.SCHEDULER_CRON ?? "0 3 * * 1"; // Monday 03:00 UTC

function runPipeline() {
  const start = new Date().toISOString();
  console.log(`\n[scheduler] Pipeline started at ${start}`);

  try {
    console.log("[scheduler] Running scraper…");
    execSync(SCRAPER_CMD, { cwd: ROOT, stdio: "inherit" });
    console.log("[scheduler] Scraper done.");
  } catch (e) {
    console.error("[scheduler] Scraper failed:", (e as Error).message);
    // Continue to matcher anyway — partial data is better than none
  }

  try {
    console.log("[scheduler] Running matcher…");
    execSync(MATCHER_CMD, { cwd: ROOT, stdio: "inherit" });
    console.log("[scheduler] Matcher done.");
  } catch (e) {
    console.error("[scheduler] Matcher failed:", (e as Error).message);
  }

  const end = new Date().toISOString();
  console.log(`[scheduler] Pipeline finished at ${end}`);
}

const runNow = process.argv.includes("--now");

if (runNow) {
  console.log("[scheduler] --now flag detected, running pipeline once…");
  runPipeline();
  process.exit(0);
} else {
  console.log(`[scheduler] Cron schedule: "${CRON_EXPR}" (UTC)`);
  console.log(
    '[scheduler] Pass "--now" to run immediately. Waiting for schedule…'
  );

  if (!cron.validate(CRON_EXPR)) {
    console.error(`[scheduler] Invalid cron expression: "${CRON_EXPR}"`);
    process.exit(1);
  }

  cron.schedule(CRON_EXPR, runPipeline, { timezone: "UTC" });
  console.log("[scheduler] Cron daemon started. Ctrl+C to stop.");
}
