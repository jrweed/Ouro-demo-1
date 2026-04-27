-- =============================================================================
-- APP_LOADS — Frontend load records (simpler than the matching-service loads table)
-- This stores loads as the UI creates them, before they go through matching.
-- =============================================================================

CREATE TABLE IF NOT EXISTS app_loads (
    id                TEXT PRIMARY KEY,
    status            TEXT NOT NULL DEFAULT 'open',
    origin            TEXT NOT NULL DEFAULT '',
    destination       TEXT NOT NULL DEFAULT '',
    pickup_date       TEXT,
    commodity         TEXT,
    temperature       TEXT,
    equipment_type    TEXT,
    weight_lbs        TEXT,
    distance_miles    NUMERIC DEFAULT 0,
    transit_minutes   NUMERIC DEFAULT 0,
    target_rate       TEXT,
    pricing_rate_min  NUMERIC DEFAULT 0,
    pricing_rate_max  NUMERIC DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE app_loads DISABLE ROW LEVEL SECURITY;
