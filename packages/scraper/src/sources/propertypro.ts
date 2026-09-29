/**
 * PropertyPro Kenya scraper — propertypro.co.ke
 *
 * ToS / robots note:
 *   robots.txt allows listing pages under /property-for-rent/.
 *   Rate-limited to 1 req/3–5s with random jitter.
 *   Only public listing-level data is persisted.
 *   No agent contact details or personal data stored.
 *
 * Card selector (as of Sep 2026):
 *   .property-listing               — one per listing
 *   h3 (first)                      — building/title
 *   h3 (second)                     — price (e.g. "KSh 90,000")
 *   h6 (first)                      — property type + action (ignored)
 *   h6 (second)                     — "2 Beds 1 Baths"
 *   a[href*="/property/"]           — link slug, ID is the last part (e.g. "2BRKH")
 *   Price text also contains "PID : 2BRKH"
 *
 * Pagination:
 *   ?page=N (1-indexed). Stops when no cards found.
 */

import axios from "axios";
import * as cheerio from "cheerio";
import { ListingSource, RawListing } from "./types";

const BASE = "https://www.propertypro.co.ke";
const MAX_PAGES = 5;

const NEIGHBORHOOD_SLUGS: Record<string, string> = {
  kilimani: "kilimani",
  kileleshwa: "kileleshwa",
};

const DELAY_MS = () => 3000 + Math.random() * 2000;

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function parsePrice(text: string): number | undefined {
  const m = text.replace(/,/g, "").match(/[\d]+/);
  return m ? parseInt(m[0], 10) : undefined;
}

function parseBeds(text: string): number | undefined {
  const m = text.match(/(\d+)\s*Bed/i);
  return m ? parseInt(m[1], 10) : undefined;
}

async function fetchPage(
  neighborhood: string,
  page: number
): Promise<RawListing[]> {
  const slug = NEIGHBORHOOD_SLUGS[neighborhood] ?? neighborhood;
  const url =
    `${BASE}/property-for-rent/flat-apartments/nairobi/${slug}` +
    (page > 1 ? `?page=${page}` : "");

  const res = await axios.get(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    timeout: 15000,
  });

  const $ = cheerio.load(res.data);
  const listings: RawListing[] = [];

  $(".property-listing").each((_, el) => {
    try {
      const card = $(el);

      // Link and ID
      const linkHref = card.find('a[href*="/property/"]').first().attr("href");
      if (!linkHref) return;
      // slug ends with the PID e.g. "2-bedroom-...-2BRKH" → "propertypro-2BRKH"
      const linkSlug = linkHref.split("/").pop() ?? "";
      const pidMatch = linkSlug.match(/-([A-Z0-9]+)$/);
      const sourceListingId = `propertypro-${pidMatch ? pidMatch[1] : linkSlug}`;
      const listingUrl = `${BASE}${linkHref}`;

      // Headings: [0]=title, [1]=type, [2]=price, [3]=beds/baths
      const headings: string[] = [];
      card.find("h3, h6").each((_, h) => headings.push($(h).text().trim()));

      const title = headings[0] ?? "";
      const priceRaw = headings[2] ?? "";
      const bedsBathsRaw = headings[3] ?? "";

      const price = parsePrice(priceRaw);
      if (!price) return;

      const bedrooms = parseBeds(bedsBathsRaw);

      // Location: look for address-like text in the listing text blocks
      const locationRaw = card
        .find('p, [class*="locat"], address')
        .first()
        .text()
        .trim();
      const locationTextRaw =
        locationRaw ||
        `${neighborhood.charAt(0).toUpperCase() + neighborhood.slice(1)}, Nairobi`;

      listings.push({
        sourceListingId,
        neighborhood,
        locationTextRaw,
        bedrooms,
        price,
        buildingNameRaw: title || undefined,
        url: listingUrl,
        rawPayload: { title, priceRaw, bedsBathsRaw, linkHref },
      });
    } catch (e) {
      console.warn(
        `[propertypro] Failed to parse a card for ${neighborhood}:`,
        (e as Error).message
      );
    }
  });

  return listings;
}

export const propertyProSource: ListingSource = {
  name: "propertypro",

  async fetchListings({ neighborhood }): Promise<RawListing[]> {
    const all: RawListing[] = [];

    for (let page = 1; page <= MAX_PAGES; page++) {
      console.log(
        `  [propertypro] Fetching ${neighborhood} page ${page}/${MAX_PAGES}…`
      );
      let batch: RawListing[];
      try {
        batch = await fetchPage(neighborhood, page);
      } catch (e) {
        console.error(
          `  [propertypro] Page ${page} fetch failed for ${neighborhood}:`,
          (e as Error).message
        );
        break;
      }

      if (batch.length === 0) {
        console.log(`  [propertypro] No listings on page ${page} — stopping.`);
        break;
      }

      all.push(...batch);
      console.log(
        `  [propertypro] Page ${page}: ${batch.length} listings (total: ${all.length})`
      );

      if (page < MAX_PAGES) {
        await sleep(DELAY_MS());
      }
    }

    return all;
  },
};
