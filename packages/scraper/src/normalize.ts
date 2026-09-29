import { createHash } from "crypto";

/** Hash a phone number so we can match on it without ever storing the raw value. */
export function hashPhone(phone?: string | null): string | undefined {
  if (!phone) return undefined;
  const digitsOnly = phone.replace(/[^0-9]/g, "");
  if (!digitsOnly) return undefined;
  return createHash("sha256").update(digitsOnly).digest("hex");
}

/** Lowercase + strip punctuation/whitespace so "Argwings Apartments" and
 *  "Argwings Apartment" land close enough for the matcher to compare. */
export function normalizeBuildingName(name?: string | null): string | undefined {
  if (!name) return undefined;
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeNeighborhood(name: string): string {
  return name.toLowerCase().trim();
}
