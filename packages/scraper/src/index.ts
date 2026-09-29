import * as dotenv from "dotenv";
import { mockSource } from "./sources/mock";
import { buyRentKenyaSource } from "./sources/buyrentkenya";
import { ListingSource } from "./sources/types";
import { hashPhone, normalizeBuildingName, normalizeNeighborhood } from "./normalize";
import { insertRawObservation } from "./db";

dotenv.config();

const NEIGHBORHOODS = ["kilimani", "kileleshwa"];

function getSource(): ListingSource {
  const chosen = process.env.SCRAPER_SOURCE ?? "mock";
  if (chosen === "buyrentkenya") return buyRentKenyaSource;
  return mockSource;
}

async function run() {
  const source = getSource();
  console.log(`Running scraper with source: ${source.name}`);

  let total = 0;
  for (const neighborhood of NEIGHBORHOODS) {
    const listings = await source.fetchListings({ neighborhood });
    console.log(`  ${neighborhood}: ${listings.length} listings fetched`);

    for (const listing of listings) {
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
      total++;
    }
  }

  console.log(`Done. Inserted/updated ${total} raw observations.`);
  process.exit(0);
}

run().catch((err) => {
  console.error("Scraper run failed:", err);
  process.exit(1);
});
