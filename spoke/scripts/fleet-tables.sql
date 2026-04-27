-- =============================================================================
-- Fleet management tables — carrier-side trucks and drivers
-- Run in Supabase SQL Editor
-- =============================================================================

CREATE TABLE IF NOT EXISTS fleet_trucks (
    id              TEXT PRIMARY KEY,
    truck_num       TEXT NOT NULL,
    year            INTEGER,
    make            TEXT NOT NULL DEFAULT '',
    model           TEXT NOT NULL DEFAULT '',
    equipment_type  TEXT NOT NULL DEFAULT '',
    status          TEXT NOT NULL DEFAULT 'available',
    city            TEXT NOT NULL DEFAULT '',
    state           TEXT NOT NULL DEFAULT '',
    notes           TEXT NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fleet_drivers (
    id                TEXT PRIMARY KEY,
    name              TEXT NOT NULL DEFAULT '',
    phone             TEXT NOT NULL DEFAULT '',
    cdl_number        TEXT NOT NULL DEFAULT '',
    cdl_expiry        TEXT,
    status            TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive', 'on_leave')),
    assigned_truck_id TEXT REFERENCES fleet_trucks(id) ON DELETE SET NULL,
    home_city         TEXT NOT NULL DEFAULT '',
    home_state        TEXT NOT NULL DEFAULT '',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS + permissive policies for demo
ALTER TABLE fleet_trucks ENABLE ROW LEVEL SECURITY;
ALTER TABLE fleet_drivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON fleet_trucks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON fleet_drivers FOR ALL USING (true) WITH CHECK (true);
