import { Pool } from "pg";
import * as dotenv from "dotenv";

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const PRICE_TOLERANCE = 0.05; // 5%
const MEDIUM_CONFIDENCE_WINDOW_DAYS = 30;

interface RawObs {
  id: number;
  neighborhood: string;
  bedrooms: number | null;
  price: string; // numeric comes back as string from pg
  building_name_norm: string | null;
  phone_hash: string | null;
  scraped_at: string;
}

interface EntityCandidate {
  id: number;
  neighborhood: string;
  bedrooms: number | null;
  canonical_building: string | null;
}

/**
 * Finds raw_observations that haven't been assigned to an entity yet and
 * either merges them into an existing entity (high confidence), creates a
 * new entity, or flags them for manual review (medium confidence).
 *
 * Safe to re-run: it only processes observations without an existing
 * entity_observations row, so nothing already matched gets touched.
 */
async function run() {
  const { rows: unmatched } = await pool.query<RawObs>(
    `SELECT ro.id, ro.neighborhood, ro.bedrooms, ro.price,
            ro.building_name_norm, ro.phone_hash, ro.scraped_at
     FROM raw_observations ro
     LEFT JOIN entity_observations eo ON eo.raw_observation_id = ro.id
     WHERE eo.id IS NULL
     ORDER BY ro.scraped_at ASC`
  );

  console.log(`Found ${unmatched.length} unmatched raw observations.`);

  let highCount = 0;
  let mediumCount = 0;
  let newEntityCount = 0;

  for (const obs of unmatched) {
    const { rows: candidates } = await pool.query<EntityCandidate>(
      `SELECT id, neighborhood, bedrooms, canonical_building
       FROM entities
       WHERE neighborhood = $1 AND bedrooms IS NOT DISTINCT FROM $2`,
      [obs.neighborhood, obs.bedrooms]
    );

    const highMatch = await findHighConfidenceMatch(obs, candidates);
    if (highMatch) {
      await linkObservation(obs.id, highMatch.id, "high");
      highCount++;
      continue;
    }

    const mediumMatch = await findMediumConfidenceMatch(obs, candidates);
    if (mediumMatch) {
      // Do NOT auto-merge — flag for a human to confirm during the pilot.
      await pool.query(
        `INSERT INTO review_queue (raw_observation_id, candidate_entity_id, reason)
         VALUES ($1, $2, $3)`,
        [
          obs.id,
          mediumMatch.id,
          "building+bedrooms+price within tolerance, but no phone match",
        ]
      );
      mediumCount++;
      continue;
    }

    // No match at all -> new entity.
    const { rows: inserted } = await pool.query<{ id: number }>(
      `INSERT INTO entities (neighborhood, bedrooms, canonical_building)
       VALUES ($1, $2, $3) RETURNING id`,
      [obs.neighborhood, obs.bedrooms, null]
    );
    await linkObservation(obs.id, inserted[0].id, "low");
    newEntityCount++;
  }

  console.log(
    `Done. High-confidence merges: ${highCount}, flagged for review: ${mediumCount}, new entities: ${newEntityCount}.`
  );
}

async function findHighConfidenceMatch(
  obs: RawObs,
  candidates: EntityCandidate[]
): Promise<EntityCandidate | undefined> {
  if (!obs.phone_hash || !obs.building_name_norm) return undefined;

  for (const candidate of candidates) {
    if (candidate.canonical_building !== obs.building_name_norm) continue;

    // Does any observation already linked to this entity share the same phone hash?
    const { rows } = await pool.query(
      `SELECT 1 FROM entity_observations eo
       JOIN raw_observations ro ON ro.id = eo.raw_observation_id
       WHERE eo.entity_id = $1 AND ro.phone_hash = $2
       LIMIT 1`,
      [candidate.id, obs.phone_hash]
    );
    if (rows.length > 0) return candidate;
  }
  return undefined;
}

async function findMediumConfidenceMatch(
  obs: RawObs,
  candidates: EntityCandidate[]
): Promise<EntityCandidate | undefined> {
  if (!obs.building_name_norm) return undefined;
  const price = parseFloat(obs.price);

  for (const candidate of candidates) {
    if (candidate.canonical_building !== obs.building_name_norm) continue;

    const { rows } = await pool.query(
      `SELECT ro.price, ro.scraped_at FROM entity_observations eo
       JOIN raw_observations ro ON ro.id = eo.raw_observation_id
       WHERE eo.entity_id = $1
       ORDER BY ro.scraped_at DESC LIMIT 1`,
      [candidate.id]
    );
    if (rows.length === 0) continue;

    const lastPrice = parseFloat(rows[0].price);
    const withinPriceTolerance =
      Math.abs(lastPrice - price) / lastPrice <= PRICE_TOLERANCE;

    const daysSince =
      (Date.now() - new Date(rows[0].scraped_at).getTime()) / (1000 * 60 * 60 * 24);
    const withinWindow = daysSince <= MEDIUM_CONFIDENCE_WINDOW_DAYS;

    if (withinPriceTolerance && withinWindow) return candidate;
  }
  return undefined;
}

async function linkObservation(
  rawObservationId: number,
  entityId: number,
  confidence: "high" | "medium" | "low"
) {
  await pool.query(
    `INSERT INTO entity_observations (entity_id, raw_observation_id, match_confidence)
     VALUES ($1, $2, $3)
     ON CONFLICT (raw_observation_id) DO NOTHING`,
    [entityId, rawObservationId, confidence]
  );

  // Backfill canonical_building on first observation for a new entity.
  await pool.query(
    `UPDATE entities SET canonical_building = COALESCE(canonical_building,
        (SELECT building_name_norm FROM raw_observations WHERE id = $1))
     WHERE id = $2`,
    [rawObservationId, entityId]
  );
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Matcher run failed:", err);
    process.exit(1);
  });
