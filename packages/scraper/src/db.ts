import { Pool } from "pg";
import * as dotenv from "dotenv";

dotenv.config();

let pool: Pool | undefined;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return pool;
}

export interface RawObservationRow {
  source: string;
  sourceListingId: string;
  neighborhood: string;
  locationTextRaw?: string;
  bedrooms?: number;
  sizeSqm?: number;
  price: number;
  buildingNameRaw?: string;
  buildingNameNorm?: string;
  phoneHash?: string;
  url?: string;
  rawPayload?: unknown;
}

export async function insertRawObservation(row: RawObservationRow): Promise<void> {
  const pool = getPool();
  await pool.query(
    `INSERT INTO raw_observations
      (source, source_listing_id, neighborhood, location_text_raw, bedrooms,
       size_sqm, price, building_name_raw, building_name_norm, phone_hash, url, raw_payload)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     ON CONFLICT (source, source_listing_id, scraped_at) DO NOTHING`,
    [
      row.source,
      row.sourceListingId,
      row.neighborhood,
      row.locationTextRaw ?? null,
      row.bedrooms ?? null,
      row.sizeSqm ?? null,
      row.price,
      row.buildingNameRaw ?? null,
      row.buildingNameNorm ?? null,
      row.phoneHash ?? null,
      row.url ?? null,
      row.rawPayload ? JSON.stringify(row.rawPayload) : null,
    ]
  );
}
