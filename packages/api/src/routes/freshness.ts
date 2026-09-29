import { Router } from "express";
import { pool } from "../db";

export const freshnessRouter = Router();

/**
 * GET /freshness?neighborhood=kilimani  (optional; omit for all)
 *
 * Returns the last scrape timestamp per neighborhood (and per source).
 * Useful for dashboards to show "last updated X days ago" warnings
 * so viewers can calibrate their trust in the data.
 */
freshnessRouter.get("/", async (req, res) => {
  const neighborhood = req.query.neighborhood
    ? String(req.query.neighborhood).toLowerCase()
    : null;

  const { rows } = await pool.query(
    `SELECT
       neighborhood,
       source,
       COUNT(*)::int                            AS observation_count,
       MAX(scraped_at)                          AS last_scraped_at,
       MIN(scraped_at)                          AS first_scraped_at,
       COUNT(DISTINCT source_listing_id)::int   AS distinct_listings
     FROM raw_observations
     WHERE ($1::text IS NULL OR neighborhood = $1)
     GROUP BY neighborhood, source
     ORDER BY neighborhood, last_scraped_at DESC`,
    [neighborhood]
  );

  // Summarise per neighborhood across sources
  const byNeighborhood: Record<
    string,
    {
      neighborhood: string;
      last_scraped_at: string | null;
      sources: typeof rows;
      stale_warning: boolean;
    }
  > = {};

  const STALE_DAYS = 14; // flag if last scrape > 14 days ago
  const now = Date.now();

  for (const row of rows) {
    const n = row.neighborhood;
    if (!byNeighborhood[n]) {
      byNeighborhood[n] = {
        neighborhood: n,
        last_scraped_at: null,
        sources: [],
        stale_warning: false,
      };
    }
    byNeighborhood[n].sources.push(row);
    // Track latest across all sources
    const ts = row.last_scraped_at ? new Date(row.last_scraped_at).getTime() : 0;
    const currentLatest = byNeighborhood[n].last_scraped_at
      ? new Date(byNeighborhood[n].last_scraped_at!).getTime()
      : 0;
    if (ts > currentLatest) {
      byNeighborhood[n].last_scraped_at = row.last_scraped_at;
    }
  }

  // Mark stale
  for (const entry of Object.values(byNeighborhood)) {
    if (!entry.last_scraped_at) {
      entry.stale_warning = true;
    } else {
      const ageDays =
        (now - new Date(entry.last_scraped_at).getTime()) / (1000 * 86400);
      entry.stale_warning = ageDays > STALE_DAYS;
    }
  }

  res.json({
    neighborhoods: Object.values(byNeighborhood),
    stale_threshold_days: STALE_DAYS,
  });
});
