import { Router } from "express";
import { pool } from "../db";

export const oversupplyRouter = Router();

/**
 * GET /oversupply?neighborhood=kilimani&bedrooms=1
 *
 * Compares the count of distinct entities first seen in the trailing
 * "recent" window (default 6 weeks) against the count first seen in the
 * "baseline" window before that. A simple, explainable signal — not a
 * statistical model — deliberately, since the sample sizes in a pilot are
 * too small for anything fancier to be trustworthy.
 */
oversupplyRouter.get("/", async (req, res) => {
  const neighborhood = String(req.query.neighborhood ?? "").toLowerCase();
  const bedrooms = req.query.bedrooms ? Number(req.query.bedrooms) : undefined;
  const recentWeeks = req.query.recentWeeks ? Number(req.query.recentWeeks) : 6;

  if (!neighborhood) {
    return res.status(400).json({ error: "neighborhood is required" });
  }

  const { rows } = await pool.query(
    `WITH first_seen AS (
       SELECT eo.entity_id, MIN(ro.scraped_at) AS first_seen_at
       FROM entity_observations eo
       JOIN raw_observations ro ON ro.id = eo.raw_observation_id
       WHERE ro.neighborhood = $1
         AND ($2::smallint IS NULL OR ro.bedrooms = $2)
       GROUP BY eo.entity_id
     )
     SELECT
       COUNT(*) FILTER (
         WHERE first_seen_at >= now() - ($3 || ' weeks')::interval
       ) AS recent_count,
       COUNT(*) FILTER (
         WHERE first_seen_at < now() - ($3 || ' weeks')::interval
           AND first_seen_at >= now() - ($3 * 2 || ' weeks')::interval
       ) AS baseline_count
     FROM first_seen`,
    [neighborhood, bedrooms ?? null, recentWeeks]
  );

  const { recent_count, baseline_count } = rows[0];
  const recent = Number(recent_count);
  const baseline = Number(baseline_count);
  const pctChange = baseline > 0 ? Math.round(((recent - baseline) / baseline) * 100) : null;

  res.json({
    neighborhood,
    bedrooms: bedrooms ?? null,
    recent_weeks: recentWeeks,
    recent_new_listings: recent,
    baseline_new_listings: baseline,
    pct_change: pctChange,
    note:
      "Signal based on new-listing counts in your own collected data — treat as directional, not authoritative, until sample sizes grow.",
  });
});
