export interface RawListing {
  sourceListingId: string;
  neighborhood: string;
  locationTextRaw?: string;
  bedrooms?: number;
  sizeSqm?: number;
  price: number;
  buildingNameRaw?: string;
  phone?: string; // raw phone, only ever used transiently to compute phoneHash
  url?: string;
  rawPayload?: unknown;
}

export interface ListingSource {
  name: string;
  fetchListings(params: { neighborhood: string }): Promise<RawListing[]>;
}
