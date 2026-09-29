-- Nairobi Property Intelligence — core schema
-- Design principle: raw_observations is append-only and never mutated.
-- Everything else (entities, entity_observations, review_queue) is a
-- *derived* layer that can be safely rebuilt as matching logic improves.

CREATE TABLE IF NOT EXISTS raw_observations (
    id                  BIGSERIAL PRIMARY KEY,
    source              TEXT NOT NULL,              -- e.g. 'buyrentkenya', 'property24'
    source_listing_id   TEXT NOT NULL,               -- source's own id/slug for the listing
    scraped_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    neighborhood        TEXT NOT NULL,               -- normalized, e.g. 'kilimani'
    location_text_raw   TEXT,                        -- whatever the source displayed

    bedrooms            SMALLINT,
    size_sqm            NUMERIC,
    price               NUMERIC NOT NULL,
    price_type          TEXT NOT NULL DEFAULT 'asking', -- 'asking' only for v1; leave room for 'confirmed'

    building_name_raw   TEXT,                        -- as scraped, unnormalized
    building_name_norm  TEXT,                         -- lowercased/stripped, used for matching

    phone_hash          TEXT,                        -- sha256 of phone number; never store raw number
    url                 TEXT,

    raw_payload         JSONB,                       -- full original scrape, for future re-processing

    UNIQUE (source, source_listing_id, scraped_at)
);

CREATE INDEX IF NOT EXISTS idx_raw_obs_neighborhood ON raw_observations (neighborhood, bedrooms);
CREATE INDEX IF NOT EXISTS idx_raw_obs_building_norm ON raw_observations (building_name_norm);
CREATE INDEX IF NOT EXISTS idx_raw_obs_phone_hash ON raw_observations (phone_hash);
CREATE INDEX IF NOT EXISTS idx_raw_obs_scraped_at ON raw_observations (scraped_at);

-- An "entity" is our best guess at a real, distinct physical unit/listing.
-- Populated only by the matcher job, never written to directly by scrapers.
CREATE TABLE IF NOT EXISTS entities (
    id                  BIGSERIAL PRIMARY KEY,
    neighborhood        TEXT NOT NULL,
    bedrooms            SMALLINT,
    canonical_building  TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Links raw observations to the entity the matcher believes they belong to,
-- with a confidence tier so downstream queries can decide how much to trust it.
CREATE TABLE IF NOT EXISTS entity_observations (
    id                  BIGSERIAL PRIMARY KEY,
    entity_id           BIGINT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    raw_observation_id  BIGINT NOT NULL REFERENCES raw_observations(id) ON DELETE CASCADE,
    match_confidence     TEXT NOT NULL CHECK (match_confidence IN ('high', 'medium', 'low')),
    matched_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (raw_observation_id)
);

CREATE INDEX IF NOT EXISTS idx_entity_obs_entity ON entity_observations (entity_id);

-- Medium-confidence matches are NOT auto-merged. They land here for a human
-- to eyeball (during the pilot: just export this table to a spreadsheet weekly).
CREATE TABLE IF NOT EXISTS review_queue (
    id                  BIGSERIAL PRIMARY KEY,
    raw_observation_id  BIGINT NOT NULL REFERENCES raw_observations(id) ON DELETE CASCADE,
    candidate_entity_id BIGINT REFERENCES entities(id) ON DELETE CASCADE,
    reason              TEXT,                        -- why the matcher flagged this
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved            BOOLEAN NOT NULL DEFAULT false
);
