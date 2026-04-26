/**
 * Carrier and truck seed data for the matching algorithm.
 * Source: TEST_DATA.md — 5 carrier companies, 50 trucks, 3 brokers.
 * All UUIDs are fixed for reproducibility.
 *
 * Stored in sessionStorage under "ch_carrier_profiles" and "ch_carrier_trucks".
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CarrierProfile {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  domicile_state: string;
  platform_status: "pending" | "approved" | "suspended" | "removed";
  operating_authority_active: boolean;
  mc_number: string;
  dot_number: string;
  insurance_current: boolean;
  insurance_expiry_date: string;
  insurance_coverage_usd: number;
  certified_commodity_types: string[];
  trailer_type: "carrier_owned" | "power_only" | "both";
  haul_preference: "short" | "long" | "any";
  capabilities: string[];
  rating: number | null;
  total_loads_completed: number;
  on_time_pickup_rate: number | null;
  on_time_delivery_rate: number | null;
  acceptance_rate: number | null;
  quick_pay_required: boolean;
  created_at: string;
}

export interface CarrierTruck {
  id: string;
  carrier_id: string;
  unit_number: string;
  equipment_type: string;
  max_payload_lbs: number;
  temp_capability_min: number;
  temp_capability_max: number;
  current_load_status: "available" | "on_load" | "maintenance" | "inactive";
  current_location_city: string;
  current_location_state: string;
  availability_window_start: string;
  availability_window_end: string;
}

export interface RepeatBookingEntry {
  carrier_id: string;
  broker_id: string;
  completed_loads: number;
}

export interface LaneHistoryEntry {
  carrier_id: string;
  origin_region: string;
  destination_region: string;
  runs: number;
}

// ─── Storage keys ───────────────────────────────────────────────────────────

const KEY_CARRIERS = "ch_carrier_profiles";
const KEY_CARRIER_TRUCKS = "ch_carrier_trucks";
const KEY_REPEAT_BOOKING = "ch_repeat_booking_history";
const KEY_LANE_HISTORY = "ch_lane_history";
const KEY_SEED_VERSION = "ch_seed_version";
const SEED_VERSION = "3"; // Bump this when seed data changes to force re-seed

// ─── Carriers ───────────────────────────────────────────────────────────────

const SEED_CARRIERS: CarrierProfile[] = [
  {
    id: "c1000000-0000-0000-0000-000000000001",
    company_name: "Blue Ridge Reefer LLC",
    contact_name: "Thomas Greer",
    email: "dispatch@blueridgereefer.com",
    phone: "864-555-0111",
    city: "Greenville",
    state: "SC",
    domicile_state: "SC",
    platform_status: "approved",
    operating_authority_active: true,
    mc_number: "MC-881234",
    dot_number: "DOT-3341122",
    insurance_current: true,
    insurance_expiry_date: "2027-03-01",
    insurance_coverage_usd: 1000000,
    certified_commodity_types: ["produce", "dairy", "floral"],
    trailer_type: "carrier_owned",
    haul_preference: "long",
    capabilities: ["food_grade_washout", "team_drivers_available"],
    rating: 4.8,
    total_loads_completed: 312,
    on_time_pickup_rate: 0.96,
    on_time_delivery_rate: 0.94,
    acceptance_rate: 0.88,
    quick_pay_required: false,
    created_at: "2026-01-10T08:00:00Z",
  },
  {
    id: "c2000000-0000-0000-0000-000000000002",
    company_name: "Coastal Protein Transport",
    contact_name: "Leah Simmons",
    email: "ops@coastalprotein.com",
    phone: "912-555-0222",
    city: "Savannah",
    state: "GA",
    domicile_state: "GA",
    platform_status: "approved",
    operating_authority_active: true,
    mc_number: "MC-774421",
    dot_number: "DOT-2298843",
    insurance_current: true,
    insurance_expiry_date: "2026-11-15",
    insurance_coverage_usd: 1000000,
    certified_commodity_types: ["protein", "frozen", "dairy"],
    trailer_type: "power_only",
    haul_preference: "short",
    capabilities: ["food_grade_washout", "hazmat_certified"],
    rating: 4.5,
    total_loads_completed: 187,
    on_time_pickup_rate: 0.91,
    on_time_delivery_rate: 0.89,
    acceptance_rate: 0.82,
    quick_pay_required: true,
    created_at: "2026-01-22T08:00:00Z",
  },
  {
    id: "c3000000-0000-0000-0000-000000000003",
    company_name: "Sunbelt Cold Haul Inc",
    contact_name: "Andre Baptiste",
    email: "dispatch@sunbeltcoldhaul.com",
    phone: "305-555-0333",
    city: "Miami",
    state: "FL",
    domicile_state: "FL",
    platform_status: "approved",
    operating_authority_active: true,
    mc_number: "MC-662887",
    dot_number: "DOT-4412209",
    insurance_current: true,
    insurance_expiry_date: "2027-01-31",
    insurance_coverage_usd: 1000000,
    certified_commodity_types: ["produce", "protein", "dairy", "frozen", "pharma", "floral"],
    trailer_type: "carrier_owned",
    haul_preference: "any",
    capabilities: ["food_grade_washout", "temp_logging_continuous", "chain_of_custody"],
    rating: null,
    total_loads_completed: 0,
    on_time_pickup_rate: null,
    on_time_delivery_rate: null,
    acceptance_rate: null,
    quick_pay_required: false,
    created_at: "2026-03-10T08:00:00Z",
  },
  {
    id: "c4000000-0000-0000-0000-000000000004",
    company_name: "Piedmont Express Refrigerated",
    contact_name: "Sandra Bowen",
    email: "sandra@piedmontexpress.com",
    phone: "336-555-0444",
    city: "Greensboro",
    state: "NC",
    domicile_state: "NC",
    platform_status: "approved",
    operating_authority_active: true,
    mc_number: "MC-553312",
    dot_number: "DOT-1987654",
    insurance_current: true,
    insurance_expiry_date: "2026-05-01",
    insurance_coverage_usd: 750000,
    certified_commodity_types: ["produce", "dairy", "floral"],
    trailer_type: "carrier_owned",
    haul_preference: "short",
    capabilities: ["food_grade_washout"],
    rating: 4.3,
    total_loads_completed: 94,
    on_time_pickup_rate: 0.88,
    on_time_delivery_rate: 0.86,
    acceptance_rate: 0.79,
    quick_pay_required: false,
    created_at: "2026-02-05T08:00:00Z",
  },
  {
    id: "c5000000-0000-0000-0000-000000000005",
    company_name: "Magnolia Freight Solutions",
    contact_name: "Calvin Pruett",
    email: "calvin@magnoliafreight.com",
    phone: "229-555-0555",
    city: "Albany",
    state: "GA",
    domicile_state: "GA",
    platform_status: "approved",
    operating_authority_active: true,
    mc_number: "MC-441098",
    dot_number: "DOT-5523310",
    insurance_current: true,
    insurance_expiry_date: "2026-12-01",
    insurance_coverage_usd: 1000000,
    certified_commodity_types: ["produce", "protein", "frozen"],
    trailer_type: "both",
    haul_preference: "any",
    capabilities: ["food_grade_washout"],
    rating: 3.6,
    total_loads_completed: 41,
    on_time_pickup_rate: 0.74,
    on_time_delivery_rate: 0.71,
    acceptance_rate: 0.65,
    quick_pay_required: true,
    created_at: "2026-02-18T08:00:00Z",
  },
];

// ─── Trucks (50 total) ──────────────────────────────────────────────────────

const SEED_CARRIER_TRUCKS: CarrierTruck[] = [
  // Blue Ridge Reefer (C1) — 10 trucks
  { id: "t1100000-0000-0000-0000-000000000001", carrier_id: "c1000000-0000-0000-0000-000000000001", unit_number: "BRR-101", equipment_type: "reefer_53", max_payload_lbs: 44000, temp_capability_min: -20, temp_capability_max: 70, current_load_status: "available", current_location_city: "Greenville", current_location_state: "SC", availability_window_start: "2026-03-24T06:00:00Z", availability_window_end: "2026-03-26T18:00:00Z" },
  { id: "t1100000-0000-0000-0000-000000000002", carrier_id: "c1000000-0000-0000-0000-000000000001", unit_number: "BRR-102", equipment_type: "reefer_53", max_payload_lbs: 44000, temp_capability_min: -20, temp_capability_max: 70, current_load_status: "on_load", current_location_city: "Columbia", current_location_state: "SC", availability_window_start: "2026-03-25T14:00:00Z", availability_window_end: "2026-03-28T10:00:00Z" },
  { id: "t1100000-0000-0000-0000-000000000003", carrier_id: "c1000000-0000-0000-0000-000000000001", unit_number: "BRR-103", equipment_type: "reefer_53", max_payload_lbs: 43500, temp_capability_min: -10, temp_capability_max: 70, current_load_status: "available", current_location_city: "Spartanburg", current_location_state: "SC", availability_window_start: "2026-03-24T08:00:00Z", availability_window_end: "2026-03-27T20:00:00Z" },
  { id: "t1100000-0000-0000-0000-000000000004", carrier_id: "c1000000-0000-0000-0000-000000000001", unit_number: "BRR-104", equipment_type: "reefer_48", max_payload_lbs: 42000, temp_capability_min: -20, temp_capability_max: 70, current_load_status: "available", current_location_city: "Anderson", current_location_state: "SC", availability_window_start: "2026-03-24T10:00:00Z", availability_window_end: "2026-03-26T22:00:00Z" },
  { id: "t1100000-0000-0000-0000-000000000005", carrier_id: "c1000000-0000-0000-0000-000000000001", unit_number: "BRR-105", equipment_type: "reefer_53", max_payload_lbs: 44000, temp_capability_min: -20, temp_capability_max: 70, current_load_status: "available", current_location_city: "Greenville", current_location_state: "SC", availability_window_start: "2026-03-25T00:00:00Z", availability_window_end: "2026-03-28T00:00:00Z" },
  { id: "t1100000-0000-0000-0000-000000000006", carrier_id: "c1000000-0000-0000-0000-000000000001", unit_number: "BRR-106", equipment_type: "reefer_53", max_payload_lbs: 44000, temp_capability_min: -20, temp_capability_max: 70, current_load_status: "available", current_location_city: "Charlotte", current_location_state: "NC", availability_window_start: "2026-03-24T12:00:00Z", availability_window_end: "2026-03-27T12:00:00Z" },
  { id: "t1100000-0000-0000-0000-000000000007", carrier_id: "c1000000-0000-0000-0000-000000000001", unit_number: "BRR-107", equipment_type: "reefer_53", max_payload_lbs: 43000, temp_capability_min: -10, temp_capability_max: 70, current_load_status: "available", current_location_city: "Augusta", current_location_state: "GA", availability_window_start: "2026-03-24T06:00:00Z", availability_window_end: "2026-03-25T18:00:00Z" },
  { id: "t1100000-0000-0000-0000-000000000008", carrier_id: "c1000000-0000-0000-0000-000000000001", unit_number: "BRR-108", equipment_type: "reefer_53", max_payload_lbs: 44000, temp_capability_min: -20, temp_capability_max: 70, current_load_status: "on_load", current_location_city: "Atlanta", current_location_state: "GA", availability_window_start: "2026-03-26T08:00:00Z", availability_window_end: "2026-03-29T08:00:00Z" },
  { id: "t1100000-0000-0000-0000-000000000009", carrier_id: "c1000000-0000-0000-0000-000000000001", unit_number: "BRR-109", equipment_type: "reefer_48", max_payload_lbs: 41000, temp_capability_min: 0, temp_capability_max: 70, current_load_status: "available", current_location_city: "Greenville", current_location_state: "SC", availability_window_start: "2026-03-24T07:00:00Z", availability_window_end: "2026-03-27T07:00:00Z" },
  { id: "t1100000-0000-0000-0000-000000000010", carrier_id: "c1000000-0000-0000-0000-000000000001", unit_number: "BRR-110", equipment_type: "reefer_53", max_payload_lbs: 44000, temp_capability_min: -20, temp_capability_max: 70, current_load_status: "available", current_location_city: "Rock Hill", current_location_state: "SC", availability_window_start: "2026-03-24T09:00:00Z", availability_window_end: "2026-03-26T21:00:00Z" },

  // Coastal Protein Transport (C2) — 10 trucks
  { id: "t2100000-0000-0000-0000-000000000001", carrier_id: "c2000000-0000-0000-0000-000000000002", unit_number: "CPT-201", equipment_type: "power_only", max_payload_lbs: 45000, temp_capability_min: -20, temp_capability_max: 70, current_load_status: "available", current_location_city: "Savannah", current_location_state: "GA", availability_window_start: "2026-03-24T06:00:00Z", availability_window_end: "2026-03-26T18:00:00Z" },
  { id: "t2100000-0000-0000-0000-000000000002", carrier_id: "c2000000-0000-0000-0000-000000000002", unit_number: "CPT-202", equipment_type: "power_only", max_payload_lbs: 45000, temp_capability_min: -20, temp_capability_max: 70, current_load_status: "available", current_location_city: "Brunswick", current_location_state: "GA", availability_window_start: "2026-03-24T08:00:00Z", availability_window_end: "2026-03-27T08:00:00Z" },
  { id: "t2100000-0000-0000-0000-000000000003", carrier_id: "c2000000-0000-0000-0000-000000000002", unit_number: "CPT-203", equipment_type: "power_only", max_payload_lbs: 45000, temp_capability_min: -20, temp_capability_max: 70, current_load_status: "on_load", current_location_city: "Jacksonville", current_location_state: "FL", availability_window_start: "2026-03-25T10:00:00Z", availability_window_end: "2026-03-28T10:00:00Z" },
  { id: "t2100000-0000-0000-0000-000000000004", carrier_id: "c2000000-0000-0000-0000-000000000002", unit_number: "CPT-204", equipment_type: "power_only", max_payload_lbs: 44000, temp_capability_min: -20, temp_capability_max: 70, current_load_status: "available", current_location_city: "Savannah", current_location_state: "GA", availability_window_start: "2026-03-24T12:00:00Z", availability_window_end: "2026-03-26T12:00:00Z" },
  { id: "t2100000-0000-0000-0000-000000000005", carrier_id: "c2000000-0000-0000-0000-000000000002", unit_number: "CPT-205", equipment_type: "power_only", max_payload_lbs: 45000, temp_capability_min: -20, temp_capability_max: 70, current_load_status: "available", current_location_city: "Statesboro", current_location_state: "GA", availability_window_start: "2026-03-24T07:00:00Z", availability_window_end: "2026-03-27T19:00:00Z" },
  { id: "t2100000-0000-0000-0000-000000000006", carrier_id: "c2000000-0000-0000-0000-000000000002", unit_number: "CPT-206", equipment_type: "power_only", max_payload_lbs: 45000, temp_capability_min: -20, temp_capability_max: 70, current_load_status: "available", current_location_city: "Savannah", current_location_state: "GA", availability_window_start: "2026-03-25T06:00:00Z", availability_window_end: "2026-03-28T06:00:00Z" },
  { id: "t2100000-0000-0000-0000-000000000007", carrier_id: "c2000000-0000-0000-0000-000000000002", unit_number: "CPT-207", equipment_type: "power_only", max_payload_lbs: 43000, temp_capability_min: -10, temp_capability_max: 70, current_load_status: "available", current_location_city: "Augusta", current_location_state: "GA", availability_window_start: "2026-03-24T10:00:00Z", availability_window_end: "2026-03-26T22:00:00Z" },
  { id: "t2100000-0000-0000-0000-000000000008", carrier_id: "c2000000-0000-0000-0000-000000000002", unit_number: "CPT-208", equipment_type: "power_only", max_payload_lbs: 45000, temp_capability_min: -20, temp_capability_max: 70, current_load_status: "on_load", current_location_city: "Columbia", current_location_state: "SC", availability_window_start: "2026-03-26T08:00:00Z", availability_window_end: "2026-03-29T08:00:00Z" },
  { id: "t2100000-0000-0000-0000-000000000009", carrier_id: "c2000000-0000-0000-0000-000000000002", unit_number: "CPT-209", equipment_type: "power_only", max_payload_lbs: 45000, temp_capability_min: -20, temp_capability_max: 70, current_load_status: "available", current_location_city: "Hinesville", current_location_state: "GA", availability_window_start: "2026-03-24T06:00:00Z", availability_window_end: "2026-03-27T06:00:00Z" },
  { id: "t2100000-0000-0000-0000-000000000010", carrier_id: "c2000000-0000-0000-0000-000000000002", unit_number: "CPT-210", equipment_type: "power_only", max_payload_lbs: 45000, temp_capability_min: -20, temp_capability_max: 70, current_load_status: "available", current_location_city: "Savannah", current_location_state: "GA", availability_window_start: "2026-03-24T14:00:00Z", availability_window_end: "2026-03-28T14:00:00Z" },

  // Sunbelt Cold Haul (C3) — 10 trucks
  { id: "t3100000-0000-0000-0000-000000000001", carrier_id: "c3000000-0000-0000-0000-000000000003", unit_number: "SBH-301", equipment_type: "reefer_53", max_payload_lbs: 44000, temp_capability_min: -20, temp_capability_max: 70, current_load_status: "available", current_location_city: "Miami", current_location_state: "FL", availability_window_start: "2026-03-24T06:00:00Z", availability_window_end: "2026-03-28T18:00:00Z" },
  { id: "t3100000-0000-0000-0000-000000000002", carrier_id: "c3000000-0000-0000-0000-000000000003", unit_number: "SBH-302", equipment_type: "reefer_53", max_payload_lbs: 44000, temp_capability_min: -20, temp_capability_max: 70, current_load_status: "available", current_location_city: "Fort Lauderdale", current_location_state: "FL", availability_window_start: "2026-03-24T08:00:00Z", availability_window_end: "2026-03-28T08:00:00Z" },
  { id: "t3100000-0000-0000-0000-000000000003", carrier_id: "c3000000-0000-0000-0000-000000000003", unit_number: "SBH-303", equipment_type: "reefer_53", max_payload_lbs: 44000, temp_capability_min: -20, temp_capability_max: 70, current_load_status: "available", current_location_city: "Tampa", current_location_state: "FL", availability_window_start: "2026-03-24T10:00:00Z", availability_window_end: "2026-03-27T10:00:00Z" },
  { id: "t3100000-0000-0000-0000-000000000004", carrier_id: "c3000000-0000-0000-0000-000000000003", unit_number: "SBH-304", equipment_type: "reefer_53", max_payload_lbs: 43000, temp_capability_min: -20, temp_capability_max: 70, current_load_status: "available", current_location_city: "Orlando", current_location_state: "FL", availability_window_start: "2026-03-24T06:00:00Z", availability_window_end: "2026-03-27T06:00:00Z" },
  { id: "t3100000-0000-0000-0000-000000000005", carrier_id: "c3000000-0000-0000-0000-000000000003", unit_number: "SBH-305", equipment_type: "reefer_53", max_payload_lbs: 44000, temp_capability_min: -20, temp_capability_max: 70, current_load_status: "available", current_location_city: "Miami", current_location_state: "FL", availability_window_start: "2026-03-25T00:00:00Z", availability_window_end: "2026-03-28T00:00:00Z" },
  { id: "t3100000-0000-0000-0000-000000000006", carrier_id: "c3000000-0000-0000-0000-000000000003", unit_number: "SBH-306", equipment_type: "reefer_48", max_payload_lbs: 42000, temp_capability_min: -10, temp_capability_max: 70, current_load_status: "available", current_location_city: "Jacksonville", current_location_state: "FL", availability_window_start: "2026-03-24T12:00:00Z", availability_window_end: "2026-03-27T12:00:00Z" },
  { id: "t3100000-0000-0000-0000-000000000007", carrier_id: "c3000000-0000-0000-0000-000000000003", unit_number: "SBH-307", equipment_type: "reefer_53", max_payload_lbs: 44000, temp_capability_min: -20, temp_capability_max: 70, current_load_status: "available", current_location_city: "Gainesville", current_location_state: "FL", availability_window_start: "2026-03-24T08:00:00Z", availability_window_end: "2026-03-28T08:00:00Z" },
  { id: "t3100000-0000-0000-0000-000000000008", carrier_id: "c3000000-0000-0000-0000-000000000003", unit_number: "SBH-308", equipment_type: "reefer_53", max_payload_lbs: 44000, temp_capability_min: -20, temp_capability_max: 70, current_load_status: "available", current_location_city: "Miami", current_location_state: "FL", availability_window_start: "2026-03-24T06:00:00Z", availability_window_end: "2026-03-26T18:00:00Z" },
  { id: "t3100000-0000-0000-0000-000000000009", carrier_id: "c3000000-0000-0000-0000-000000000003", unit_number: "SBH-309", equipment_type: "reefer_53", max_payload_lbs: 44000, temp_capability_min: -20, temp_capability_max: 70, current_load_status: "available", current_location_city: "Boca Raton", current_location_state: "FL", availability_window_start: "2026-03-24T07:00:00Z", availability_window_end: "2026-03-28T07:00:00Z" },
  { id: "t3100000-0000-0000-0000-000000000010", carrier_id: "c3000000-0000-0000-0000-000000000003", unit_number: "SBH-310", equipment_type: "reefer_53", max_payload_lbs: 44000, temp_capability_min: -20, temp_capability_max: 70, current_load_status: "available", current_location_city: "Tallahassee", current_location_state: "FL", availability_window_start: "2026-03-24T10:00:00Z", availability_window_end: "2026-03-27T22:00:00Z" },

  // Piedmont Express Refrigerated (C4) — 10 trucks
  { id: "t4100000-0000-0000-0000-000000000001", carrier_id: "c4000000-0000-0000-0000-000000000004", unit_number: "PER-401", equipment_type: "reefer_53", max_payload_lbs: 44000, temp_capability_min: -10, temp_capability_max: 70, current_load_status: "available", current_location_city: "Greensboro", current_location_state: "NC", availability_window_start: "2026-03-24T07:00:00Z", availability_window_end: "2026-03-27T19:00:00Z" },
  { id: "t4100000-0000-0000-0000-000000000002", carrier_id: "c4000000-0000-0000-0000-000000000004", unit_number: "PER-402", equipment_type: "reefer_53", max_payload_lbs: 44000, temp_capability_min: -10, temp_capability_max: 70, current_load_status: "available", current_location_city: "Charlotte", current_location_state: "NC", availability_window_start: "2026-03-24T09:00:00Z", availability_window_end: "2026-03-26T21:00:00Z" },
  { id: "t4100000-0000-0000-0000-000000000003", carrier_id: "c4000000-0000-0000-0000-000000000004", unit_number: "PER-403", equipment_type: "reefer_48", max_payload_lbs: 42000, temp_capability_min: 0, temp_capability_max: 70, current_load_status: "on_load", current_location_city: "Columbia", current_location_state: "SC", availability_window_start: "2026-03-25T16:00:00Z", availability_window_end: "2026-03-28T16:00:00Z" },
  { id: "t4100000-0000-0000-0000-000000000004", carrier_id: "c4000000-0000-0000-0000-000000000004", unit_number: "PER-404", equipment_type: "reefer_53", max_payload_lbs: 43000, temp_capability_min: -10, temp_capability_max: 70, current_load_status: "available", current_location_city: "Winston-Salem", current_location_state: "NC", availability_window_start: "2026-03-24T08:00:00Z", availability_window_end: "2026-03-27T08:00:00Z" },
  { id: "t4100000-0000-0000-0000-000000000005", carrier_id: "c4000000-0000-0000-0000-000000000004", unit_number: "PER-405", equipment_type: "reefer_53", max_payload_lbs: 44000, temp_capability_min: -10, temp_capability_max: 70, current_load_status: "available", current_location_city: "Durham", current_location_state: "NC", availability_window_start: "2026-03-24T10:00:00Z", availability_window_end: "2026-03-26T22:00:00Z" },
  { id: "t4100000-0000-0000-0000-000000000006", carrier_id: "c4000000-0000-0000-0000-000000000004", unit_number: "PER-406", equipment_type: "reefer_53", max_payload_lbs: 44000, temp_capability_min: -10, temp_capability_max: 70, current_load_status: "available", current_location_city: "Greensboro", current_location_state: "NC", availability_window_start: "2026-03-25T06:00:00Z", availability_window_end: "2026-03-28T06:00:00Z" },
  { id: "t4100000-0000-0000-0000-000000000007", carrier_id: "c4000000-0000-0000-0000-000000000004", unit_number: "PER-407", equipment_type: "reefer_53", max_payload_lbs: 44000, temp_capability_min: -10, temp_capability_max: 70, current_load_status: "available", current_location_city: "Raleigh", current_location_state: "NC", availability_window_start: "2026-03-24T11:00:00Z", availability_window_end: "2026-03-27T11:00:00Z" },
  { id: "t4100000-0000-0000-0000-000000000008", carrier_id: "c4000000-0000-0000-0000-000000000004", unit_number: "PER-408", equipment_type: "reefer_53", max_payload_lbs: 44000, temp_capability_min: -10, temp_capability_max: 70, current_load_status: "available", current_location_city: "Fayetteville", current_location_state: "NC", availability_window_start: "2026-03-24T07:00:00Z", availability_window_end: "2026-03-27T07:00:00Z" },
  { id: "t4100000-0000-0000-0000-000000000009", carrier_id: "c4000000-0000-0000-0000-000000000004", unit_number: "PER-409", equipment_type: "reefer_53", max_payload_lbs: 44000, temp_capability_min: -10, temp_capability_max: 70, current_load_status: "available", current_location_city: "Greensboro", current_location_state: "NC", availability_window_start: "2026-03-24T06:00:00Z", availability_window_end: "2026-03-27T18:00:00Z" },
  { id: "t4100000-0000-0000-0000-000000000010", carrier_id: "c4000000-0000-0000-0000-000000000004", unit_number: "PER-410", equipment_type: "reefer_48", max_payload_lbs: 41000, temp_capability_min: 0, temp_capability_max: 70, current_load_status: "available", current_location_city: "Asheville", current_location_state: "NC", availability_window_start: "2026-03-24T09:00:00Z", availability_window_end: "2026-03-27T21:00:00Z" },

  // Magnolia Freight Solutions (C5) — 10 trucks
  { id: "t5100000-0000-0000-0000-000000000001", carrier_id: "c5000000-0000-0000-0000-000000000005", unit_number: "MFS-501", equipment_type: "reefer_53", max_payload_lbs: 44000, temp_capability_min: -20, temp_capability_max: 70, current_load_status: "available", current_location_city: "Albany", current_location_state: "GA", availability_window_start: "2026-03-24T06:00:00Z", availability_window_end: "2026-03-27T18:00:00Z" },
  { id: "t5100000-0000-0000-0000-000000000002", carrier_id: "c5000000-0000-0000-0000-000000000005", unit_number: "MFS-502", equipment_type: "reefer_53", max_payload_lbs: 44000, temp_capability_min: -20, temp_capability_max: 70, current_load_status: "available", current_location_city: "Valdosta", current_location_state: "GA", availability_window_start: "2026-03-24T08:00:00Z", availability_window_end: "2026-03-27T08:00:00Z" },
  { id: "t5100000-0000-0000-0000-000000000003", carrier_id: "c5000000-0000-0000-0000-000000000005", unit_number: "MFS-503", equipment_type: "reefer_53", max_payload_lbs: 44000, temp_capability_min: -20, temp_capability_max: 70, current_load_status: "available", current_location_city: "Macon", current_location_state: "GA", availability_window_start: "2026-03-24T10:00:00Z", availability_window_end: "2026-03-26T22:00:00Z" },
  { id: "t5100000-0000-0000-0000-000000000004", carrier_id: "c5000000-0000-0000-0000-000000000005", unit_number: "MFS-504", equipment_type: "power_only", max_payload_lbs: 45000, temp_capability_min: -20, temp_capability_max: 70, current_load_status: "on_load", current_location_city: "Tallahassee", current_location_state: "FL", availability_window_start: "2026-03-25T12:00:00Z", availability_window_end: "2026-03-28T12:00:00Z" },
  { id: "t5100000-0000-0000-0000-000000000005", carrier_id: "c5000000-0000-0000-0000-000000000005", unit_number: "MFS-505", equipment_type: "reefer_53", max_payload_lbs: 42000, temp_capability_min: -10, temp_capability_max: 70, current_load_status: "available", current_location_city: "Albany", current_location_state: "GA", availability_window_start: "2026-03-24T06:00:00Z", availability_window_end: "2026-03-26T18:00:00Z" },
  { id: "t5100000-0000-0000-0000-000000000006", carrier_id: "c5000000-0000-0000-0000-000000000005", unit_number: "MFS-506", equipment_type: "reefer_53", max_payload_lbs: 44000, temp_capability_min: -20, temp_capability_max: 70, current_load_status: "available", current_location_city: "Columbus", current_location_state: "GA", availability_window_start: "2026-03-24T12:00:00Z", availability_window_end: "2026-03-27T12:00:00Z" },
  { id: "t5100000-0000-0000-0000-000000000007", carrier_id: "c5000000-0000-0000-0000-000000000005", unit_number: "MFS-507", equipment_type: "reefer_53", max_payload_lbs: 44000, temp_capability_min: -20, temp_capability_max: 70, current_load_status: "available", current_location_city: "Albany", current_location_state: "GA", availability_window_start: "2026-03-24T08:00:00Z", availability_window_end: "2026-03-27T20:00:00Z" },
  { id: "t5100000-0000-0000-0000-000000000008", carrier_id: "c5000000-0000-0000-0000-000000000005", unit_number: "MFS-508", equipment_type: "reefer_48", max_payload_lbs: 41000, temp_capability_min: 0, temp_capability_max: 70, current_load_status: "available", current_location_city: "Dothan", current_location_state: "GA", availability_window_start: "2026-03-24T09:00:00Z", availability_window_end: "2026-03-27T09:00:00Z" },
  { id: "t5100000-0000-0000-0000-000000000009", carrier_id: "c5000000-0000-0000-0000-000000000005", unit_number: "MFS-509", equipment_type: "reefer_53", max_payload_lbs: 44000, temp_capability_min: -20, temp_capability_max: 70, current_load_status: "available", current_location_city: "Thomasville", current_location_state: "GA", availability_window_start: "2026-03-24T07:00:00Z", availability_window_end: "2026-03-28T07:00:00Z" },
  { id: "t5100000-0000-0000-0000-000000000010", carrier_id: "c5000000-0000-0000-0000-000000000005", unit_number: "MFS-510", equipment_type: "reefer_53", max_payload_lbs: 44000, temp_capability_min: -20, temp_capability_max: 70, current_load_status: "on_load", current_location_city: "Atlanta", current_location_state: "GA", availability_window_start: "2026-03-26T10:00:00Z", availability_window_end: "2026-03-29T10:00:00Z" },
];

// ─── Repeat booking history ─────────────────────────────────────────────────

const SEED_REPEAT_BOOKING: RepeatBookingEntry[] = [
  { carrier_id: "c1000000-0000-0000-0000-000000000001", broker_id: "b1000000-0000-0000-0000-000000000001", completed_loads: 18 },
  { carrier_id: "c1000000-0000-0000-0000-000000000001", broker_id: "b2000000-0000-0000-0000-000000000002", completed_loads: 4 },
  { carrier_id: "c2000000-0000-0000-0000-000000000002", broker_id: "b2000000-0000-0000-0000-000000000002", completed_loads: 11 },
  { carrier_id: "c4000000-0000-0000-0000-000000000004", broker_id: "b2000000-0000-0000-0000-000000000002", completed_loads: 7 },
  { carrier_id: "c5000000-0000-0000-0000-000000000005", broker_id: "b3000000-0000-0000-0000-000000000003", completed_loads: 3 },
];

const SEED_LANE_HISTORY: LaneHistoryEntry[] = [
  { carrier_id: "c1000000-0000-0000-0000-000000000001", origin_region: "SC", destination_region: "GA", runs: 47 },
  { carrier_id: "c1000000-0000-0000-0000-000000000001", origin_region: "SC", destination_region: "NC", runs: 38 },
  { carrier_id: "c1000000-0000-0000-0000-000000000001", origin_region: "SC", destination_region: "FL", runs: 29 },
  { carrier_id: "c1000000-0000-0000-0000-000000000001", origin_region: "GA", destination_region: "NC", runs: 12 },
  { carrier_id: "c2000000-0000-0000-0000-000000000002", origin_region: "GA", destination_region: "SC", runs: 34 },
  { carrier_id: "c2000000-0000-0000-0000-000000000002", origin_region: "GA", destination_region: "FL", runs: 28 },
  { carrier_id: "c2000000-0000-0000-0000-000000000002", origin_region: "GA", destination_region: "NC", runs: 15 },
  { carrier_id: "c4000000-0000-0000-0000-000000000004", origin_region: "NC", destination_region: "SC", runs: 28 },
  { carrier_id: "c4000000-0000-0000-0000-000000000004", origin_region: "NC", destination_region: "GA", runs: 19 },
  { carrier_id: "c4000000-0000-0000-0000-000000000004", origin_region: "NC", destination_region: "VA", runs: 11 },
  { carrier_id: "c5000000-0000-0000-0000-000000000005", origin_region: "GA", destination_region: "FL", runs: 14 },
  { carrier_id: "c5000000-0000-0000-0000-000000000005", origin_region: "GA", destination_region: "SC", runs: 9 },
  { carrier_id: "c5000000-0000-0000-0000-000000000005", origin_region: "FL", destination_region: "GA", runs: 8 },
];

// ─── Accessors ──────────────────────────────────────────────────────────────

export function ensureCarrierData(): void {
  if (typeof window === "undefined") return;
  const currentVersion = sessionStorage.getItem(KEY_SEED_VERSION);
  const needsReseed = currentVersion !== SEED_VERSION;
  if (needsReseed || !sessionStorage.getItem(KEY_CARRIERS)) {
    sessionStorage.setItem(KEY_CARRIERS, JSON.stringify(SEED_CARRIERS));
  }
  if (needsReseed || !sessionStorage.getItem(KEY_CARRIER_TRUCKS)) {
    sessionStorage.setItem(KEY_CARRIER_TRUCKS, JSON.stringify(SEED_CARRIER_TRUCKS));
  }
  if (needsReseed || !sessionStorage.getItem(KEY_REPEAT_BOOKING)) {
    sessionStorage.setItem(KEY_REPEAT_BOOKING, JSON.stringify(SEED_REPEAT_BOOKING));
  }
  if (needsReseed || !sessionStorage.getItem(KEY_LANE_HISTORY)) {
    sessionStorage.setItem(KEY_LANE_HISTORY, JSON.stringify(SEED_LANE_HISTORY));
  }
  if (needsReseed) {
    sessionStorage.setItem(KEY_SEED_VERSION, SEED_VERSION);
  }
}

export function getCarrierProfiles(): CarrierProfile[] {
  ensureCarrierData();
  try { return JSON.parse(sessionStorage.getItem(KEY_CARRIERS) || "[]"); } catch { return []; }
}

export function getCarrierTrucks(): CarrierTruck[] {
  ensureCarrierData();
  try { return JSON.parse(sessionStorage.getItem(KEY_CARRIER_TRUCKS) || "[]"); } catch { return []; }
}

export function getRepeatBookingHistory(): RepeatBookingEntry[] {
  ensureCarrierData();
  try { return JSON.parse(sessionStorage.getItem(KEY_REPEAT_BOOKING) || "[]"); } catch { return []; }
}

export function getLaneHistory(): LaneHistoryEntry[] {
  ensureCarrierData();
  try { return JSON.parse(sessionStorage.getItem(KEY_LANE_HISTORY) || "[]"); } catch { return []; }
}
