import { Router } from "express";
import { pool } from "../db";

export const trendsRouter = Router();

/**
 * GET /trends?neighborhood=kilimani&bedrooms=2
 *
 * Weekly average asking price, computed over deduped entities (not raw
 * listings) so re-posted duplicates don't skew the trend line.
 */
trendsRouter.get("/", async (req, res) => {
  const neighborhood = String(req.query.neighborhood ?? "").toLowerCase();
  const bedrooms = req.query.bedrooms ? Number(req.query.bedrooms) : undefined;

  if (!neighborhood) {
    return res.status(400).json({ error: "neighborhood is required" });
  }

  const { rows } = await pool.query(
    `SELECT date_trunc('week', ro.scraped_at) AS week,
            ROUND(AVG(ro.price)) AS avg_price,
            COUNT(DISTINCT eo.entity_id) AS distinct_units
     FROM entity_observations eo
     JOIN raw_observations ro ON ro.id = eo.raw_observation_id
     WHERE ro.neighborhood = $1
       AND ($2::smallint IS NULL OR ro.bedrooms = $2)
       AND ro.price_type = 'asking'
     GROUP BY week
     ORDER BY week ASC`,
    [neighborhood, bedrooms ?? null]
  );

  res.json({
    neighborhood,
    bedrooms: bedrooms ?? null,
    note: "Based on public asking-price listings, not confirmed transactions.",
    series: rows,
  });
});
