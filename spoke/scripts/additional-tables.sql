-- =============================================================================
-- Additional tables for Spoke — conversations, bookings, invoices, notifications
-- Run AFTER schema.sql in Supabase SQL Editor
-- =============================================================================

-- =============================================================================
-- CONVERSATIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS conversations (
    id              TEXT PRIMARY KEY,
    load_id         TEXT NOT NULL,
    carrier_id      TEXT NOT NULL,
    carrier_name    TEXT NOT NULL DEFAULT '',
    driver_name     TEXT NOT NULL DEFAULT '',
    truck_num       TEXT NOT NULL DEFAULT '',
    origin          TEXT NOT NULL DEFAULT '',
    destination     TEXT NOT NULL DEFAULT '',
    offer           JSONB,
    last_message    TEXT NOT NULL DEFAULT '',
    last_activity   TIMESTAMPTZ NOT NULL DEFAULT now(),
    unread_broker   INTEGER NOT NULL DEFAULT 0,
    unread_carrier  INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- MESSAGES
-- =============================================================================
CREATE TABLE IF NOT EXISTS messages (
    id              TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender          TEXT NOT NULL CHECK (sender IN ('3pl', 'carrier')),
    body            TEXT NOT NULL DEFAULT '',
    offer_event     JSONB,
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id);

-- =============================================================================
-- BOOKINGS
-- =============================================================================
CREATE TABLE IF NOT EXISTS bookings (
    id              TEXT PRIMARY KEY,
    conv_id         TEXT,
    load_id         TEXT NOT NULL,
    carrier_id      TEXT NOT NULL DEFAULT '',
    carrier_name    TEXT NOT NULL DEFAULT '',
    driver_name     TEXT NOT NULL DEFAULT '',
    truck_num       TEXT NOT NULL DEFAULT '',
    origin          TEXT NOT NULL DEFAULT '',
    destination     TEXT NOT NULL DEFAULT '',
    accepted_rate   NUMERIC NOT NULL DEFAULT 0,
    pickup_date     TEXT,
    commodity       TEXT,
    temperature     TEXT,
    equipment_type  TEXT,
    distance_miles  NUMERIC,
    shipment_status TEXT NOT NULL DEFAULT 'confirmed'
        CHECK (shipment_status IN ('confirmed', 'pickup_scheduled', 'in_transit', 'delivered')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookings_load ON bookings(load_id);

-- =============================================================================
-- INVOICES
-- =============================================================================
CREATE TABLE IF NOT EXISTS invoices (
    id              TEXT PRIMARY KEY,
    invoice_number  TEXT NOT NULL,
    booking_id      TEXT NOT NULL,
    load_id         TEXT NOT NULL,
    conv_id         TEXT,
    broker_company  TEXT NOT NULL DEFAULT '',
    carrier_name    TEXT NOT NULL DEFAULT '',
    origin          TEXT NOT NULL DEFAULT '',
    destination     TEXT NOT NULL DEFAULT '',
    pickup_date     TEXT,
    commodity       TEXT,
    temperature     TEXT,
    equipment_type  TEXT,
    distance_miles  NUMERIC,
    driver_name     TEXT NOT NULL DEFAULT '',
    truck_num       TEXT NOT NULL DEFAULT '',
    freight_charge  NUMERIC NOT NULL DEFAULT 0,
    total           NUMERIC NOT NULL DEFAULT 0,
    status          TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'paid')),
    issued_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- APP NOTIFICATIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS app_notifications (
    id              TEXT PRIMARY KEY,
    type            TEXT NOT NULL,
    title           TEXT NOT NULL DEFAULT '',
    body            TEXT NOT NULL DEFAULT '',
    read            BOOLEAN NOT NULL DEFAULT false,
    role            TEXT NOT NULL DEFAULT 'both'
        CHECK (role IN ('3pl', 'carrier', 'both')),
    href            TEXT,
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- Disable RLS on these tables for now (demo mode — all users can read/write)
-- In production, add proper RLS policies based on auth.uid()
-- =============================================================================
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_notifications DISABLE ROW LEVEL SECURITY;

-- Also disable RLS on the core business tables for the demo
ALTER TABLE brokers DISABLE ROW LEVEL SECURITY;
ALTER TABLE carriers DISABLE ROW LEVEL SECURITY;
ALTER TABLE trucks DISABLE ROW LEVEL SECURITY;
ALTER TABLE loads DISABLE ROW LEVEL SECURITY;
ALTER TABLE drivers DISABLE ROW LEVEL SECURITY;
ALTER TABLE carrier_availability DISABLE ROW LEVEL SECURITY;
ALTER TABLE match_notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE match_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE load_outcomes DISABLE ROW LEVEL SECURITY;
ALTER TABLE repeat_booking_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE lane_history DISABLE ROW LEVEL SECURITY;
