-- =============================================================================
-- ColdHaul Matching Algorithm — Supabase Postgres Schema
-- =============================================================================
-- Run this migration in the Supabase SQL editor when the project is created.
-- TODO(supabase): Execute this file via Supabase Dashboard → SQL Editor → New Query
-- =============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- BROKERS
-- =============================================================================
CREATE TABLE brokers (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name            TEXT NOT NULL,
    contact_name            TEXT NOT NULL,
    email                   TEXT NOT NULL UNIQUE,
    phone                   TEXT,
    city                    TEXT NOT NULL,
    state                   TEXT NOT NULL,
    platform_status         TEXT NOT NULL DEFAULT 'approved'
        CHECK (platform_status IN ('pending', 'approved', 'suspended', 'removed')),
    primary_commodity_types TEXT[] NOT NULL DEFAULT '{}',
    typical_lanes           TEXT[] NOT NULL DEFAULT '{}',
    typical_load_weight_lbs INTEGER,
    requires_food_grade     BOOLEAN NOT NULL DEFAULT false,
    subscription_tier       TEXT NOT NULL DEFAULT 'professional'
        CHECK (subscription_tier IN ('starter', 'professional', 'enterprise')),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- CARRIERS
-- =============================================================================
CREATE TABLE carriers (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name                TEXT NOT NULL,
    contact_name                TEXT NOT NULL,
    email                       TEXT NOT NULL UNIQUE,
    phone                       TEXT,
    city                        TEXT NOT NULL,
    state                       TEXT NOT NULL,
    domicile_state              TEXT NOT NULL,

    -- Platform vetting — first filter check, always
    platform_status             TEXT NOT NULL DEFAULT 'pending'
        CHECK (platform_status IN ('pending', 'approved', 'suspended', 'removed')),

    -- Compliance
    operating_authority_active  BOOLEAN NOT NULL DEFAULT false,
    mc_number                   TEXT,
    dot_number                  TEXT,
    insurance_current           BOOLEAN NOT NULL DEFAULT false,
    insurance_expiry_date       DATE,
    insurance_coverage_usd      INTEGER,

    -- Equipment and capability
    certified_commodity_types   TEXT[] NOT NULL DEFAULT '{}',
    trailer_type                TEXT NOT NULL DEFAULT 'carrier_owned'
        CHECK (trailer_type IN ('carrier_owned', 'power_only', 'both')),
    haul_preference             TEXT NOT NULL DEFAULT 'any'
        CHECK (haul_preference IN ('short', 'long', 'any')),
    capabilities                TEXT[] NOT NULL DEFAULT '{}',

    -- Performance metrics
    rating                      DECIMAL(3,2),
    total_loads_completed       INTEGER NOT NULL DEFAULT 0,
    on_time_pickup_rate         DECIMAL(4,3),
    on_time_delivery_rate       DECIMAL(4,3),
    acceptance_rate             DECIMAL(4,3),

    -- Reserved for Phase 2
    quick_pay_required          BOOLEAN NOT NULL DEFAULT false,

    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- TRUCKS
-- =============================================================================
CREATE TABLE trucks (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    carrier_id                  UUID NOT NULL REFERENCES carriers(id) ON DELETE CASCADE,
    unit_number                 TEXT NOT NULL,
    equipment_type              TEXT NOT NULL,
    max_payload_lbs             INTEGER NOT NULL,
    temp_capability_min         INTEGER NOT NULL,
    temp_capability_max         INTEGER NOT NULL,
    current_load_status         TEXT NOT NULL DEFAULT 'available'
        CHECK (current_load_status IN ('available', 'on_load', 'maintenance', 'inactive')),
    current_location_city       TEXT,
    current_location_state      TEXT,
    availability_window_start   TIMESTAMPTZ,
    availability_window_end     TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_trucks_carrier ON trucks(carrier_id);
CREATE INDEX idx_trucks_status  ON trucks(current_load_status);

-- =============================================================================
-- LOADS
-- =============================================================================
CREATE TABLE loads (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    broker_id                   UUID NOT NULL REFERENCES brokers(id),
    status                      TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'matching', 'covered', 'in_transit', 'delivered', 'cancelled')),

    -- Commodity and temperature
    commodity_type              TEXT NOT NULL,
    required_temp_min           INTEGER NOT NULL,
    required_temp_max           INTEGER NOT NULL,

    -- Equipment requirements
    required_equipment_types    TEXT[] NOT NULL DEFAULT '{}',
    required_trailer_type       TEXT,  -- null = no preference

    -- Weight (hard filter — DOT compliance)
    weight_lbs                  INTEGER NOT NULL,

    -- Insurance requirement
    required_coverage_usd       INTEGER,

    -- Locations
    pickup_city                 TEXT NOT NULL,
    pickup_state                TEXT NOT NULL,
    delivery_city               TEXT NOT NULL,
    delivery_state              TEXT NOT NULL,

    -- Timing
    pickup_time                 TIMESTAMPTZ NOT NULL,
    estimated_transit_hours     INTEGER,

    -- Broker-set requirements
    required_capabilities       TEXT[] NOT NULL DEFAULT '{}',
    excluded_carrier_ids        UUID[] NOT NULL DEFAULT '{}',

    -- Reserved for Phase 2
    quick_pay_available         BOOLEAN NOT NULL DEFAULT false,

    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_loads_broker ON loads(broker_id);
CREATE INDEX idx_loads_status ON loads(status);

-- =============================================================================
-- CARRIER AVAILABILITY
-- =============================================================================
CREATE TABLE carrier_availability (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    carrier_id      UUID NOT NULL REFERENCES carriers(id) ON DELETE CASCADE,
    truck_id        UUID REFERENCES trucks(id),
    status          TEXT NOT NULL DEFAULT 'available'
        CHECK (status IN ('available', 'on_load', 'maintenance', 'inactive')),
    current_load_id UUID REFERENCES loads(id),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_carrier_avail_carrier ON carrier_availability(carrier_id);

-- =============================================================================
-- MATCH NOTIFICATIONS — Supabase Realtime broadcasts on INSERT
-- =============================================================================
CREATE TABLE match_notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    load_id         UUID NOT NULL REFERENCES loads(id),
    carrier_id      UUID NOT NULL REFERENCES carriers(id),
    match_score     DECIMAL(6,4) NOT NULL,
    rank_position   INTEGER NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'rejected', 'expired', 'backfilled')),
    notified_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at      TIMESTAMPTZ,
    responded_at    TIMESTAMPTZ
);

CREATE INDEX idx_match_notif_load    ON match_notifications(load_id);
CREATE INDEX idx_match_notif_carrier ON match_notifications(carrier_id);
CREATE INDEX idx_match_notif_status  ON match_notifications(status);

-- =============================================================================
-- MATCH EVENTS — Outcome logging for Phase 2 ML training dataset
-- =============================================================================
CREATE TABLE match_events (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    load_id                 UUID NOT NULL REFERENCES loads(id),
    carrier_id              UUID NOT NULL REFERENCES carriers(id),
    match_score             DECIMAL(6,4) NOT NULL,
    rank_position           INTEGER NOT NULL,
    distance_score          DECIMAL(4,3),
    freshness_score         DECIMAL(4,3),
    repeat_booking_score    DECIMAL(4,3),
    rating_score            DECIMAL(4,3),
    reliability_score       DECIMAL(4,3),
    lane_runs_at_match      INTEGER,
    broker_loads_at_match   INTEGER,
    surfaced_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    accepted_at             TIMESTAMPTZ,
    rejected_at             TIMESTAMPTZ,
    expired_at              TIMESTAMPTZ
);

CREATE INDEX idx_match_events_load    ON match_events(load_id);
CREATE INDEX idx_match_events_carrier ON match_events(carrier_id);

-- =============================================================================
-- LOAD OUTCOMES — Training labels for Phase 2 LTR model
-- =============================================================================
CREATE TABLE load_outcomes (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    load_id             UUID NOT NULL REFERENCES loads(id),
    carrier_id          UUID NOT NULL REFERENCES carriers(id),
    on_time_pickup      BOOLEAN,
    on_time_delivery    BOOLEAN,
    temp_excursion      BOOLEAN,
    disputed            BOOLEAN,
    broker_rating       INTEGER CHECK (broker_rating >= 1 AND broker_rating <= 5),
    completed_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_load_outcomes_load    ON load_outcomes(load_id);
CREATE INDEX idx_load_outcomes_carrier ON load_outcomes(carrier_id);

-- =============================================================================
-- REPEAT BOOKING HISTORY — Tracks carrier-broker and carrier-lane history
-- =============================================================================
CREATE TABLE repeat_booking_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    carrier_id      UUID NOT NULL REFERENCES carriers(id) ON DELETE CASCADE,
    broker_id       UUID REFERENCES brokers(id),
    completed_loads INTEGER NOT NULL DEFAULT 0,
    UNIQUE(carrier_id, broker_id)
);

CREATE TABLE lane_history (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    carrier_id          UUID NOT NULL REFERENCES carriers(id) ON DELETE CASCADE,
    origin_region       TEXT NOT NULL,
    destination_region  TEXT NOT NULL,
    runs                INTEGER NOT NULL DEFAULT 0,
    UNIQUE(carrier_id, origin_region, destination_region)
);

-- =============================================================================
-- SUPABASE REALTIME — Enable REPLICA IDENTITY FULL on broadcast tables
-- =============================================================================
-- TODO(supabase): These must be run after table creation in Supabase
ALTER TABLE loads               SET (REPLICA IDENTITY FULL);
ALTER TABLE match_notifications SET (REPLICA IDENTITY FULL);
ALTER TABLE carrier_availability SET (REPLICA IDENTITY FULL);

-- =============================================================================
-- ACCEPT LOAD — Atomic RPC function with FOR UPDATE SKIP LOCKED
-- =============================================================================
CREATE OR REPLACE FUNCTION accept_load_atomic(p_load_id UUID, p_carrier_id UUID)
RETURNS JSON AS $$
DECLARE
    v_load loads%ROWTYPE;
BEGIN
    -- Lock the load row — SKIP LOCKED means concurrent attempts return immediately
    SELECT * INTO v_load FROM loads
    WHERE id = p_load_id AND status = 'open'
    FOR UPDATE SKIP LOCKED;

    -- If no row returned, load was already claimed or locked by another transaction
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'reason', 'load_already_claimed');
    END IF;

    -- Claim the load
    UPDATE loads SET status = 'covered', updated_at = now() WHERE id = p_load_id;

    -- Mark carrier as on_load
    UPDATE carrier_availability
    SET status = 'on_load', current_load_id = p_load_id, updated_at = now()
    WHERE carrier_id = p_carrier_id;

    -- Expire all other pending notifications for this load
    UPDATE match_notifications
    SET status = 'backfilled', responded_at = now()
    WHERE load_id = p_load_id AND carrier_id != p_carrier_id AND status = 'pending';

    -- Mark the accepting carrier's notification as accepted
    UPDATE match_notifications
    SET status = 'accepted', responded_at = now()
    WHERE load_id = p_load_id AND carrier_id = p_carrier_id;

    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- UPDATED_AT TRIGGER — Auto-update updated_at on row modification
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_brokers_updated    BEFORE UPDATE ON brokers             FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_carriers_updated   BEFORE UPDATE ON carriers            FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_trucks_updated     BEFORE UPDATE ON trucks              FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_loads_updated      BEFORE UPDATE ON loads               FOR EACH ROW EXECUTE FUNCTION update_updated_at();
