-- =============================================================================
-- Spoke Matching Algorithm — Supabase Postgres Schema
-- =============================================================================
-- Run this migration in the Supabase SQL editor when the project is created.
-- TODO(supabase): Execute this file via Supabase Dashboard → SQL Editor → New Query
-- =============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- PROFILES (unified auth table — supports 3pl, carrier, driver, admin roles)
-- =============================================================================
-- NOTE: When using Supabase Auth, this table links to auth.users via id.
-- The 'driver' role and parent_carrier_id are reserved for Phase 2 mobile app.
-- CREATE TABLE profiles (
--     id                UUID PRIMARY KEY REFERENCES auth.users(id),
--     role              TEXT NOT NULL CHECK (role IN ('3pl', 'carrier', 'driver', 'admin')),
--     parent_carrier_id UUID REFERENCES profiles(id),  -- driver→carrier link (Phase 2)
--     created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
-- );

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
-- DRIVERS (referenced by future tables — TMS Pro, Year 2)
-- =============================================================================
CREATE TABLE drivers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    carrier_id      UUID NOT NULL REFERENCES carriers(id) ON DELETE CASCADE,
    first_name      TEXT NOT NULL,
    last_name       TEXT NOT NULL,
    email           TEXT,
    phone           TEXT,
    cdl_number      TEXT,
    cdl_state       TEXT,
    cdl_expiry      DATE,
    status          TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive', 'terminated')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_drivers_carrier ON drivers(carrier_id);

-- =============================================================================
-- TRUCKS
-- =============================================================================
CREATE TABLE trucks (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    carrier_id                  UUID NOT NULL REFERENCES carriers(id) ON DELETE CASCADE,
    unit_number                 TEXT NOT NULL,
    equipment_type              TEXT NOT NULL
        CHECK (equipment_type IN ('dry_van', 'flatbed', 'step_deck', 'reefer_single', 'reefer_multi', 'tanker', 'lowboy', 'hotshot', 'box_truck', 'power_only', 'other')),
    max_payload_lbs             INTEGER NOT NULL,
    temp_capability_min         INTEGER,  -- nullable: only relevant for reefer equipment
    temp_capability_max         INTEGER,  -- nullable: only relevant for reefer equipment
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
    commodity_category          TEXT,  -- 'produce', 'frozen', 'dairy', 'dry_goods', 'industrial', 'hazmat', 'general', 'other'
    required_temp_min           INTEGER,  -- nullable: only required for reefer loads
    required_temp_max           INTEGER,  -- nullable: only required for reefer loads

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
    SELECT * INTO v_load FROM loads
    WHERE id = p_load_id AND status = 'open'
    FOR UPDATE SKIP LOCKED;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'reason', 'load_already_claimed');
    END IF;

    UPDATE loads SET status = 'covered', updated_at = now() WHERE id = p_load_id;

    UPDATE carrier_availability
    SET status = 'on_load', current_load_id = p_load_id, updated_at = now()
    WHERE carrier_id = p_carrier_id;

    UPDATE match_notifications
    SET status = 'backfilled', responded_at = now()
    WHERE load_id = p_load_id AND carrier_id != p_carrier_id AND status = 'pending';

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
CREATE TRIGGER trg_drivers_updated    BEFORE UPDATE ON drivers             FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- FUTURE-PROOF TABLES (TMS Pro, Year 2) — No UI yet, schema only
-- =============================================================================

-- Vehicle maintenance tracking
CREATE TABLE truck_maintenance_logs (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    truck_id          UUID NOT NULL REFERENCES trucks(id),
    maintenance_type  TEXT NOT NULL,  -- 'oil_change', 'tire_rotation', 'reefer_service', 'brake_inspection', 'dot_inspection', 'other'
    description       TEXT,
    cost              NUMERIC,
    performed_at      DATE NOT NULL,
    next_due_date     DATE,
    next_due_miles    NUMERIC,
    vendor_name       TEXT,
    created_at        TIMESTAMPTZ DEFAULT now()
);

-- Driver document management
CREATE TABLE driver_documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id       UUID NOT NULL REFERENCES drivers(id),
    doc_type        TEXT NOT NULL,  -- 'cdl', 'medical_card', 'drug_test', 'mvr', 'insurance', 'other'
    file_url        TEXT,
    issued_date     DATE,
    expiration_date DATE,
    is_current      BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- Temperature logs for reefer loads
CREATE TABLE temperature_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    load_id         UUID REFERENCES loads(id),
    truck_id        UUID REFERENCES trucks(id),
    recorded_at     TIMESTAMPTZ NOT NULL,
    temperature     NUMERIC NOT NULL,  -- °F
    threshold_min   NUMERIC,
    threshold_max   NUMERIC,
    is_excursion    BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- Fuel transactions
CREATE TABLE fuel_transactions (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    truck_id          UUID NOT NULL REFERENCES trucks(id),
    driver_id         UUID REFERENCES drivers(id),
    gallons           NUMERIC NOT NULL,
    cost_total        NUMERIC NOT NULL,
    cost_per_gallon   NUMERIC,
    location_name     TEXT,
    location_city     TEXT,
    location_state    TEXT,
    transaction_date  TIMESTAMPTZ NOT NULL,
    created_at        TIMESTAMPTZ DEFAULT now()
);

-- Driver settlements
CREATE TABLE settlements (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    carrier_id        UUID NOT NULL REFERENCES carriers(id),
    driver_id         UUID NOT NULL REFERENCES drivers(id),
    period_start      DATE NOT NULL,
    period_end        DATE NOT NULL,
    total_loads       INTEGER,
    gross_revenue     NUMERIC,
    fuel_deductions   NUMERIC,
    other_deductions  NUMERIC,
    net_pay           NUMERIC,
    status            TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'paid')),
    created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_maintenance_truck    ON truck_maintenance_logs(truck_id);
CREATE INDEX idx_maintenance_next_due ON truck_maintenance_logs(next_due_date);
CREATE INDEX idx_driver_docs_driver   ON driver_documents(driver_id);
CREATE INDEX idx_driver_docs_expiry   ON driver_documents(expiration_date);
CREATE INDEX idx_temp_logs_load       ON temperature_logs(load_id);
CREATE INDEX idx_fuel_truck           ON fuel_transactions(truck_id);
CREATE INDEX idx_settlements_carrier  ON settlements(carrier_id);
