import { Router } from "express";
import { pool } from "../db";

export const compareRouter = Router();

const MIN_SAMPLE_SIZE = 3;

/**
 * GET /compare?neighborhood=kilimani&bedrooms=2&price=90000
 *
 * Where a given asking price sits relative to current listings for the
 * same neighborhood + bedroom count. Uses the *latest* observation per
 * entity, so each real unit counts once.
 *
 * Returns insufficient_data=true if fewer than MIN_SAMPLE_SIZE entities
 * are available — a misleading percentile is worse than no percentile.
 */
compareRouter.get("/", async (req, res) => {
  const neighborhood = String(req.query.neighborhood ?? "").toLowerCase();
  const bedrooms = Number(req.query.bedrooms);
  const price = Number(req.query.price);

  if (!neighborhood || !bedrooms || !price) {
    return res
      .status(400)
      .json({ error: "neighborhood, bedrooms, and price are all required" });
  }

  const { rows } = await pool.query(
    `WITH latest_per_entity AS (
       SELECT DISTINCT ON (eo.entity_id)
              eo.entity_id, ro.price
       FROM entity_observations eo
       JOIN raw_observations ro ON ro.id = eo.raw_observation_id
       WHERE ro.neighborhood = $1 AND ro.bedrooms = $2
       ORDER BY eo.entity_id, ro.scraped_at DESC
     )
     SELECT
       COUNT(*) AS sample_size,
       ROUND(AVG(price)) AS avg_price,
       PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price) AS median_price,
       (SELECT COUNT(*) FROM latest_per_entity WHERE price <= $3)::float
         / NULLIF(COUNT(*), 0) AS percentile
     FROM latest_per_entity`,
    [neighborhood, bedrooms, price]
  );

  const result = rows[0];
  const sampleSize = Number(result.sample_size);

  if (sampleSize < MIN_SAMPLE_SIZE) {
    return res.json({
      neighborhood,
      bedrooms,
      queried_price: price,
      insufficient_data: true,
      sample_size: sampleSize,
      min_required: MIN_SAMPLE_SIZE,
      note: `Only ${sampleSize} data point(s) available — need at least ${MIN_SAMPLE_SIZE} to produce a meaningful comparison. Run more scrapes to build up history.`,
    });
  }

  res.json({
    neighborhood,
    bedrooms,
    queried_price: price,
    insufficient_data: false,
    sample_size: sampleSize,
    avg_price: result.avg_price ? Number(result.avg_price) : null,
    median_price: result.median_price ? Number(result.median_price) : null,
    percentile: result.percentile ? Math.round(Number(result.percentile) * 100) : null,
    note: "Based on public asking-price listings, not confirmed transactions.",
  });
});
