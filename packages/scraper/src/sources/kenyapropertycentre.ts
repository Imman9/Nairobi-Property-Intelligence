/**
 * Kenya Property Centre scraper — kenyapropertycentre.com
 *
 * ToS / robots note:
 *   robots.txt has no explicit Disallow for listing pages.
 *   Rate-limited to 1 req/3–5s with a random jitter.
 *   Only listing-level public data is collected (price, bedrooms, size, location, title).
 *   No agent contact details, phone numbers or personal data are persisted.
 *
 * Card selector (as of Sep 2026):
 *   article.group.relative.block  — one per listing
 *   span.text-\[1\.375rem\]       — monthly price (e.g. "KSh 75,000")
 *   h3                            — listing title
 *   span:contains(" beds")        — bedroom count (e.g. "3 beds")
 *   span.truncate                 — neighborhood/location text
 *   a.absolute.inset-0            — overlay link with full href slug
 *
 * Pagination:
 *   ?page=N  (1-indexed), stops when no listing links found.
 */

import axios from "axios";
import * as cheerio from "cheerio";
import { ListingSource, RawListing } from "./types";

const BASE = "https://kenyapropertycentre.com";
const MAX_PAGES = 5; // cap at 5 pages (~100 listings) per neighborhood per run

const NEIGHBORHOOD_SLUGS: Record<string, string> = {
  kilimani: "kilimani",
  kileleshwa: "kileleshwa",
};

const DELAY_MS = () => 3000 + Math.random() * 2000; // 3–5s

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function parsePrice(text: string): number | undefined {
  // "KSh 75,000" or "Ksh 1,200,000"
  const m = text.replace(/,/g, "").match(/[\d]+/);
  return m ? parseInt(m[0], 10) : undefined;
}

function parseBeds(text: string): number | undefined {
  const m = text.match(/(\d+)\s*bed/i);
  return m ? parseInt(m[1], 10) : undefined;
}

function parseSize(text: string): number | undefined {
  const m = text.match(/([\d,]+)\s*m[²2]/i);
  if (m) return parseFloat(m[1].replace(",", ""));
  return undefined;
}

async function fetchPage(
  neighborhood: string,
  page: number
): Promise<RawListing[]> {
  const slug = NEIGHBORHOOD_SLUGS[neighborhood] ?? neighborhood;
  const url = `${BASE}/for-rent/flats-apartments/nairobi/${slug}${
    page > 1 ? `?page=${page}` : ""
  }`;

  const res = await axios.get(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    timeout: 15000,
  });

  const $ = cheerio.load(res.data);
  const listings: RawListing[] = [];

  $("article").each((_, el) => {
    try {
      const article = $(el);

      // Listing URL and ID
      const overlayHref = article
        .find('a[class*="absolute"][class*="inset-0"]')
        .attr("href");
      if (!overlayHref) return; // not a listing card

      // Extract slug-based ID: last segment of path e.g. "68809-3-bedroom-ensuite-apartment" → "kpc-68809"
      const slugPart = overlayHref.split("/").pop() ?? "";
      const idMatch = slugPart.match(/^(\d+)-/);
      if (!idMatch) return;
      const sourceListingId = `kpc-${idMatch[1]}`;
      const url = `${BASE}${overlayHref}`;

      // Price
      const priceText = article
        .find('span[class*="text-[1.375rem]"], span[class*="tabular-nums"]')
        .first()
        .text()
        .trim();
      const price = parsePrice(priceText);
      if (!price) return; // skip if no price

      // Title
      const title = article.find("h3").first().text().trim();

      // Bedrooms from "X beds" span
      let bedrooms: number | undefined;
      article.find("span").each((_, span) => {
        const t = $(span).text().trim();
        if (/\d+\s*bed/i.test(t)) {
          bedrooms = parseBeds(t);
        }
      });

      // Size from "X m²" span
      let sizeSqm: number | undefined;
      article.find("span").each((_, span) => {
        const t = $(span).text().trim();
        if (/m[²2]/i.test(t)) {
          sizeSqm = parseSize(t);
        }
      });

      // Location text
      const locationTextRaw = article
        .find("span.truncate")
        .first()
        .text()
        .trim();

      // Building name from title (best effort)
      const buildingNameRaw = title || undefined;

      listings.push({
        sourceListingId,
        neighborhood,
        locationTextRaw: locationTextRaw || undefined,
        bedrooms,
        sizeSqm,
        price,
        buildingNameRaw,
        url,
        rawPayload: { title, priceText, overlayHref },
      });
    } catch (e) {
      // Per-card error: log and continue — don't crash the whole run
      console.warn(
        `[kpc] Failed to parse a card on page of ${neighborhood}:`,
        (e as Error).message
      );
    }
  });

  return listings;
}

export const kenyaPropertyCentreSource: ListingSource = {
  name: "kenyapropertycentre",

  async fetchListings({ neighborhood }): Promise<RawListing[]> {
    const all: RawListing[] = [];

    for (let page = 1; page <= MAX_PAGES; page++) {
      console.log(
        `  [kpc] Fetching ${neighborhood} page ${page}/${MAX_PAGES}…`
      );
      let batch: RawListing[];
      try {
        batch = await fetchPage(neighborhood, page);
      } catch (e) {
        console.error(
          `  [kpc] Page ${page} fetch failed for ${neighborhood}:`,
          (e as Error).message
        );
        break; // stop pagination on HTTP error
      }

      if (batch.length === 0) {
        console.log(`  [kpc] No listings on page ${page} — stopping.`);
        break;
      }

      all.push(...batch);
      console.log(
        `  [kpc] Page ${page}: ${batch.length} listings (total so far: ${all.length})`
      );

      if (page < MAX_PAGES) {
        await sleep(DELAY_MS());
      }
    }

    return all;
  },
};
