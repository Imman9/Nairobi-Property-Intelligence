import { readFileSync } from "fs";
import { join } from "path";
import { ListingSource, RawListing } from "./types";

const fixturePath = join(__dirname, "..", "..", "fixtures", "sample-listings.json");

export const mockSource: ListingSource = {
  name: "mock",
  async fetchListings({ neighborhood }) {
    const all = JSON.parse(readFileSync(fixturePath, "utf-8"));
    const listings: RawListing[] = all[neighborhood.toLowerCase()] ?? [];
    return listings;
  },
};
