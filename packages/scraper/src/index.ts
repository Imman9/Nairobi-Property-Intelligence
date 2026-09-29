import * as dotenv from "dotenv";
import * as path from "path";

// Load from monorepo root first, then fallback to local
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config();

import { mockSource } from "./sources/mock";
import { buyRentKenyaSource } from "./sources/buyrentkenya";
import { kenyaPropertyCentreSource } from "./sources/kenyapropertycentre";
import { propertyProSource } from "./sources/propertypro";
import { ListingSource } from "./sources/types";
import {
  hashPhone,
  normalizeBuildingName,
  normalizeNeighborhood,
} from "./normalize";
import { insertRawObservation } from "./db";

const NEIGHBORHOODS = ["kilimani", "kileleshwa"];

/** Returns all active sources based on SCRAPER_SOURCE env var.
 *  "all" = both real sources; individual name for one; "mock" = fixtures.
 *  Defaults to "mock" for safety.
 */
function getSources(): ListingSource[] {
  const chosen = (process.env.SCRAPER_SOURCE ?? "mock").toLowerCase();
  switch (chosen) {
    case "all":
      return [kenyaPropertyCentreSource, propertyProSource];
    case "kenyapropertycentre":
      return [kenyaPropertyCentreSource];
    case "propertypro":
      return [propertyProSource];
    case "buyrentkenya":
      return [buyRentKenyaSource];
    default:
      return [mockSource];
  }
}

async function run() {
  const sources = getSources();
  console.log(`Running scraper with source(s): ${sources.map((s) => s.name).join(", ")}`);

  let totalInserted = 0;
  let totalFailed = 0;

  for (const source of sources) {
    for (const neighborhood of NEIGHBORHOODS) {
      console.log(`\n[${source.name}] Fetching ${neighborhood}…`);

      let listings;
      try {
        listings = await source.fetchListings({ neighborhood });
      } catch (err) {
        console.error(
          `[${source.name}] fetchListings failed for ${neighborhood}:`,
          (err as Error).message
        );
        continue; // skip this neighborhood, don't abort entire run
      }

      console.log(
        `[${source.name}] ${neighborhood}: ${listings.length} listings fetched`
      );

      for (const listing of listings) {
        try {
          await insertRawObservation({
            source: source.name,
            sourceListingId: listing.sourceListingId,
            neighborhood: normalizeNeighborhood(listing.neighborhood),
            locationTextRaw: listing.locationTextRaw,
            bedrooms: listing.bedrooms,
            sizeSqm: listing.sizeSqm,
            price: listing.price,
            buildingNameRaw: listing.buildingNameRaw,
            buildingNameNorm: normalizeBuildingName(listing.buildingNameRaw),
            phoneHash: hashPhone(listing.phone),
            url: listing.url,
            rawPayload: listing.rawPayload,
          });
          totalInserted++;
        } catch (err) {
          // Per-listing error: log with listing ID so failures are traceable
          console.error(
            `[${source.name}] Failed to insert listing ${listing.sourceListingId} (${neighborhood}):`,
            (err as Error).message
          );
          totalFailed++;
        }
      }
    }
  }

  console.log(
    `\nDone. Inserted/updated: ${totalInserted}, failures: ${totalFailed}.`
  );
  process.exit(0);
}

run().catch((err) => {
  console.error("Scraper run failed:", err);
  process.exit(1);
});
