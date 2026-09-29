import { ListingSource, RawListing } from "./types";

/**
 * Real source stub. Not wired up by default (SCRAPER_SOURCE=mock in .env.example).
 *
 * Before turning this on:
 *   - Read the site's robots.txt and terms of service.
 *   - Rate-limit aggressively (this is a v1 pilot, not a production crawler)
 *     and cache/skip pages you've already seen recently.
 *   - Do NOT persist phone numbers or agent names as plain text — hash phone
 *     numbers immediately (see normalize.ts) and drop the raw value.
 *   - Only extract listing-level fields (price, bedrooms, size, location,
 *     building name) — nothing about the poster's identity beyond a hash.
 *
 * Suggested implementation shape once you're ready:
 *   1. axios.get(searchUrl) for a neighborhood's listing index page
 *   2. cheerio.load(html) and select listing card elements
 *   3. Map each card to a RawListing
 *   4. Paginate with a delay between requests (e.g. 2-5s, randomized)
 */
export const buyRentKenyaSource: ListingSource = {
  name: "buyrentkenya",
  async fetchListings({ neighborhood }): Promise<RawListing[]> {
    throw new Error(
      `buyRentKenyaSource is a stub — implement fetchListings() for "${neighborhood}" ` +
        `following the notes in this file before enabling SCRAPER_SOURCE=buyrentkenya.`
    );
  },
};
