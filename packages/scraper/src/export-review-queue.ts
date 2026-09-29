#!/usr/bin/env ts-node
/**
 * CLI: Export the review_queue to CSV for manual review.
 *
 * Usage:
 *   ts-node src/export-review-queue.ts [output-file]
 *
 * Defaults to writing review_queue_YYYY-MM-DD.csv in the current directory.
 * Pass a path as first argument to override.
 *
 * Fields exported:
 *   queue_id, raw_obs_id, candidate_entity_id, reason, created_at,
 *   source, source_listing_id, neighborhood, bedrooms, price,
 *   building_name_raw, url, candidate_canonical_building
 */

import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config();

import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const outPath =
    process.argv[2] ?? path.join(process.cwd(), `review_queue_${today}.csv`);

  console.log(`Querying review_queue…`);

  const { rows } = await pool.query(`
    SELECT
      rq.id              AS queue_id,
      rq.raw_observation_id,
      rq.candidate_entity_id,
      rq.reason,
      rq.created_at,
      rq.resolved,
      ro.source,
      ro.source_listing_id,
      ro.neighborhood,
      ro.bedrooms,
      ro.price,
      ro.building_name_raw,
      ro.url,
      ro.scraped_at,
      e.canonical_building AS candidate_canonical_building
    FROM review_queue rq
    JOIN raw_observations ro ON ro.id = rq.raw_observation_id
    LEFT JOIN entities e ON e.id = rq.candidate_entity_id
    WHERE rq.resolved = false
    ORDER BY rq.created_at DESC
  `);

  console.log(`Found ${rows.length} unresolved review items.`);

  if (rows.length === 0) {
    console.log("Nothing to export. Queue is empty (or all resolved).");
    await pool.end();
    return;
  }

  // Build CSV
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    if (v == null) return "";
    const s = String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const lines = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ];

  fs.writeFileSync(outPath, lines.join("\n"), "utf-8");
  console.log(`Exported ${rows.length} rows to ${outPath}`);
  await pool.end();
}

main().catch((err) => {
  console.error("Export failed:", err);
  process.exit(1);
});
