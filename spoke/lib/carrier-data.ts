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
  temp_capability_min: number | null;
  temp_capability_max: number | null;
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
const SEED_VERSION = "5"; // Bump this when seed data changes to force re-seed

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
    rating: 4.7,
    total_loads_completed: 256,
    on_time_pickup_rate: 0.93,
    on_time_delivery_rate: 0.91,
    acceptance_rate: 0.85,
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
  // C6 — Volunteer Freight Lines (dry van specialist)
  {
    id: "c6000000-0000-0000-0000-000000000006",
    company_name: "Volunteer Freight Lines",
    contact_name: "Bobby Harrell",
    email: "dispatch@volunteerfreight.com",
    phone: "615-555-0666",
    city: "Nashville", state: "TN", domicile_state: "TN",
    platform_status: "approved",
    operating_authority_active: true,
    mc_number: "MC-334567", dot_number: "DOT-4201555",
    insurance_current: true, insurance_expiry_date: "2027-08-01", insurance_coverage_usd: 1000000,
    certified_commodity_types: ["general", "electronics", "automotive", "paper"],
    trailer_type: "carrier_owned", haul_preference: "any",
    capabilities: ["gps_tracking", "lift_gate"],
    rating: 4.62, total_loads_completed: 523,
    on_time_pickup_rate: 0.945, on_time_delivery_rate: 0.938, acceptance_rate: 0.810,
    quick_pay_required: false,
    created_at: "2025-11-10T08:00:00Z",
  },
  // C7 — Iron City Flatbed Co (flatbed specialist)
  {
    id: "c7000000-0000-0000-0000-000000000007",
    company_name: "Iron City Flatbed Co",
    contact_name: "Ray Dawson",
    email: "dispatch@ironcityflatbed.com",
    phone: "205-555-0777",
    city: "Birmingham", state: "AL", domicile_state: "AL",
    platform_status: "approved",
    operating_authority_active: true,
    mc_number: "MC-228901", dot_number: "DOT-4455678",
    insurance_current: true, insurance_expiry_date: "2027-05-15", insurance_coverage_usd: 1500000,
    certified_commodity_types: ["steel", "lumber", "machinery", "construction"],
    trailer_type: "carrier_owned", haul_preference: "long",
    capabilities: ["gps_tracking", "oversize_permits", "tarping"],
    rating: 4.79, total_loads_completed: 387,
    on_time_pickup_rate: 0.955, on_time_delivery_rate: 0.950, acceptance_rate: 0.720,
    quick_pay_required: false,
    created_at: "2025-09-05T08:00:00Z",
  },
  // C8 — Commonwealth Carriers (mixed dry van + reefer)
  {
    id: "c8000000-0000-0000-0000-000000000008",
    company_name: "Commonwealth Carriers Inc",
    contact_name: "Angela Torres",
    email: "dispatch@commonwealthcarriers.com",
    phone: "804-555-0888",
    city: "Richmond", state: "VA", domicile_state: "VA",
    platform_status: "approved",
    operating_authority_active: true,
    mc_number: "MC-115432", dot_number: "DOT-3998127",
    insurance_current: true, insurance_expiry_date: "2027-11-30", insurance_coverage_usd: 1200000,
    certified_commodity_types: ["produce", "dairy", "general", "electronics", "beverages"],
    trailer_type: "carrier_owned", haul_preference: "any",
    capabilities: ["food_grade_washout", "gps_tracking", "temp_monitoring", "lift_gate"],
    rating: 4.88, total_loads_completed: 612,
    on_time_pickup_rate: 0.970, on_time_delivery_rate: 0.965, acceptance_rate: 0.760,
    quick_pay_required: false,
    created_at: "2025-07-20T08:00:00Z",
  },
  // C9 — Delta Heavy Haul (flatbed + step deck)
  {
    id: "c9000000-0000-0000-0000-000000000009",
    company_name: "Delta Heavy Haul LLC",
    contact_name: "James Whitfield",
    email: "dispatch@deltaheavyhaul.com",
    phone: "601-555-0999",
    city: "Jackson", state: "MS", domicile_state: "MS",
    platform_status: "approved",
    operating_authority_active: true,
    mc_number: "MC-667890", dot_number: "DOT-4312099",
    insurance_current: true, insurance_expiry_date: "2027-07-20", insurance_coverage_usd: 2000000,
    certified_commodity_types: ["steel", "machinery", "construction", "lumber", "equipment"],
    trailer_type: "carrier_owned", haul_preference: "long",
    capabilities: ["gps_tracking", "oversize_permits", "tarping", "hazmat_cert"],
    rating: 4.71, total_loads_completed: 198,
    on_time_pickup_rate: 0.935, on_time_delivery_rate: 0.928, acceptance_rate: 0.680,
    quick_pay_required: false,
    created_at: "2026-01-15T08:00:00Z",
  },
  // C10 — Bayou Express Transport (mixed dry van + reefer)
  {
    id: "ca000000-0000-0000-0000-00000000000a",
    company_name: "Bayou Express Transport",
    contact_name: "Claire Fontenot",
    email: "dispatch@bayouexpress.com",
    phone: "504-555-1010",
    city: "New Orleans", state: "LA", domicile_state: "LA",
    platform_status: "approved",
    operating_authority_active: true,
    mc_number: "MC-889012", dot_number: "DOT-4509832",
    insurance_current: true, insurance_expiry_date: "2027-02-28", insurance_coverage_usd: 1000000,
    certified_commodity_types: ["produce", "frozen", "general", "beverages", "seafood"],
    trailer_type: "carrier_owned", haul_preference: "short",
    capabilities: ["food_grade_washout", "gps_tracking", "temp_monitoring"],
    rating: 4.83, total_loads_completed: 341,
    on_time_pickup_rate: 0.958, on_time_delivery_rate: 0.952, acceptance_rate: 0.790,
    quick_pay_required: false,
    created_at: "2025-12-01T08:00:00Z",
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

  // Volunteer Freight Lines (C6) — 15 dry vans
  { id: "t6100000-0000-0000-0000-000000000001", carrier_id: "c6000000-0000-0000-0000-000000000006", unit_number: "VFL-001", equipment_type: "dry_van", max_payload_lbs: 45000, temp_capability_min: null, temp_capability_max: null, current_load_status: "available", current_location_city: "Nashville", current_location_state: "TN", availability_window_start: "2026-04-24T06:00:00Z", availability_window_end: "2026-04-30T18:00:00Z" },
  { id: "t6100000-0000-0000-0000-000000000002", carrier_id: "c6000000-0000-0000-0000-000000000006", unit_number: "VFL-002", equipment_type: "dry_van", max_payload_lbs: 45000, temp_capability_min: null, temp_capability_max: null, current_load_status: "available", current_location_city: "Memphis", current_location_state: "TN", availability_window_start: "2026-04-24T06:00:00Z", availability_window_end: "2026-04-30T18:00:00Z" },
  { id: "t6100000-0000-0000-0000-000000000003", carrier_id: "c6000000-0000-0000-0000-000000000006", unit_number: "VFL-003", equipment_type: "dry_van", max_payload_lbs: 45000, temp_capability_min: null, temp_capability_max: null, current_load_status: "on_load", current_location_city: "Knoxville", current_location_state: "TN", availability_window_start: "2026-04-24T06:00:00Z", availability_window_end: "2026-04-30T18:00:00Z" },
  { id: "t6100000-0000-0000-0000-000000000004", carrier_id: "c6000000-0000-0000-0000-000000000006", unit_number: "VFL-004", equipment_type: "dry_van", max_payload_lbs: 45000, temp_capability_min: null, temp_capability_max: null, current_load_status: "available", current_location_city: "Chattanooga", current_location_state: "TN", availability_window_start: "2026-04-24T06:00:00Z", availability_window_end: "2026-04-30T18:00:00Z" },
  { id: "t6100000-0000-0000-0000-000000000005", carrier_id: "c6000000-0000-0000-0000-000000000006", unit_number: "VFL-005", equipment_type: "dry_van", max_payload_lbs: 45000, temp_capability_min: null, temp_capability_max: null, current_load_status: "available", current_location_city: "Nashville", current_location_state: "TN", availability_window_start: "2026-04-24T06:00:00Z", availability_window_end: "2026-04-30T18:00:00Z" },

  // Iron City Flatbed (C7) — 8 flatbed/step deck
  { id: "t7100000-0000-0000-0000-000000000001", carrier_id: "c7000000-0000-0000-0000-000000000007", unit_number: "ICF-001", equipment_type: "flatbed", max_payload_lbs: 48000, temp_capability_min: null, temp_capability_max: null, current_load_status: "available", current_location_city: "Birmingham", current_location_state: "AL", availability_window_start: "2026-04-24T06:00:00Z", availability_window_end: "2026-04-30T18:00:00Z" },
  { id: "t7100000-0000-0000-0000-000000000002", carrier_id: "c7000000-0000-0000-0000-000000000007", unit_number: "ICF-002", equipment_type: "flatbed", max_payload_lbs: 48000, temp_capability_min: null, temp_capability_max: null, current_load_status: "available", current_location_city: "Huntsville", current_location_state: "AL", availability_window_start: "2026-04-24T06:00:00Z", availability_window_end: "2026-04-30T18:00:00Z" },
  { id: "t7100000-0000-0000-0000-000000000003", carrier_id: "c7000000-0000-0000-0000-000000000007", unit_number: "ICF-003", equipment_type: "step_deck", max_payload_lbs: 48000, temp_capability_min: null, temp_capability_max: null, current_load_status: "on_load", current_location_city: "Mobile", current_location_state: "AL", availability_window_start: "2026-04-24T06:00:00Z", availability_window_end: "2026-04-30T18:00:00Z" },
  { id: "t7100000-0000-0000-0000-000000000004", carrier_id: "c7000000-0000-0000-0000-000000000007", unit_number: "ICF-004", equipment_type: "flatbed", max_payload_lbs: 48000, temp_capability_min: null, temp_capability_max: null, current_load_status: "available", current_location_city: "Montgomery", current_location_state: "AL", availability_window_start: "2026-04-24T06:00:00Z", availability_window_end: "2026-04-30T18:00:00Z" },
  { id: "t7100000-0000-0000-0000-000000000005", carrier_id: "c7000000-0000-0000-0000-000000000007", unit_number: "ICF-005", equipment_type: "step_deck", max_payload_lbs: 48000, temp_capability_min: null, temp_capability_max: null, current_load_status: "available", current_location_city: "Birmingham", current_location_state: "AL", availability_window_start: "2026-04-24T06:00:00Z", availability_window_end: "2026-04-30T18:00:00Z" },

  // Commonwealth Carriers (C8) — 10 trucks (mixed dry van + reefer)
  { id: "t8100000-0000-0000-0000-000000000001", carrier_id: "c8000000-0000-0000-0000-000000000008", unit_number: "CWC-001", equipment_type: "dry_van", max_payload_lbs: 45000, temp_capability_min: null, temp_capability_max: null, current_load_status: "available", current_location_city: "Richmond", current_location_state: "VA", availability_window_start: "2026-04-24T06:00:00Z", availability_window_end: "2026-04-30T18:00:00Z" },
  { id: "t8100000-0000-0000-0000-000000000002", carrier_id: "c8000000-0000-0000-0000-000000000008", unit_number: "CWC-002", equipment_type: "reefer_53", max_payload_lbs: 44000, temp_capability_min: -20, temp_capability_max: 70, current_load_status: "available", current_location_city: "Norfolk", current_location_state: "VA", availability_window_start: "2026-04-24T06:00:00Z", availability_window_end: "2026-04-30T18:00:00Z" },
  { id: "t8100000-0000-0000-0000-000000000003", carrier_id: "c8000000-0000-0000-0000-000000000008", unit_number: "CWC-003", equipment_type: "dry_van", max_payload_lbs: 45000, temp_capability_min: null, temp_capability_max: null, current_load_status: "on_load", current_location_city: "Virginia Beach", current_location_state: "VA", availability_window_start: "2026-04-24T06:00:00Z", availability_window_end: "2026-04-30T18:00:00Z" },
  { id: "t8100000-0000-0000-0000-000000000004", carrier_id: "c8000000-0000-0000-0000-000000000008", unit_number: "CWC-004", equipment_type: "reefer_53", max_payload_lbs: 44000, temp_capability_min: -10, temp_capability_max: 70, current_load_status: "available", current_location_city: "Roanoke", current_location_state: "VA", availability_window_start: "2026-04-24T06:00:00Z", availability_window_end: "2026-04-30T18:00:00Z" },
  { id: "t8100000-0000-0000-0000-000000000005", carrier_id: "c8000000-0000-0000-0000-000000000008", unit_number: "CWC-005", equipment_type: "dry_van", max_payload_lbs: 45000, temp_capability_min: null, temp_capability_max: null, current_load_status: "available", current_location_city: "Richmond", current_location_state: "VA", availability_window_start: "2026-04-24T06:00:00Z", availability_window_end: "2026-04-30T18:00:00Z" },

  // Delta Heavy Haul (C9) — 5 flatbed/step deck
  { id: "t9100000-0000-0000-0000-000000000001", carrier_id: "c9000000-0000-0000-0000-000000000009", unit_number: "DHH-001", equipment_type: "flatbed", max_payload_lbs: 48000, temp_capability_min: null, temp_capability_max: null, current_load_status: "available", current_location_city: "Jackson", current_location_state: "MS", availability_window_start: "2026-04-24T06:00:00Z", availability_window_end: "2026-04-30T18:00:00Z" },
  { id: "t9100000-0000-0000-0000-000000000002", carrier_id: "c9000000-0000-0000-0000-000000000009", unit_number: "DHH-002", equipment_type: "step_deck", max_payload_lbs: 48000, temp_capability_min: null, temp_capability_max: null, current_load_status: "available", current_location_city: "Gulfport", current_location_state: "MS", availability_window_start: "2026-04-24T06:00:00Z", availability_window_end: "2026-04-30T18:00:00Z" },
  { id: "t9100000-0000-0000-0000-000000000003", carrier_id: "c9000000-0000-0000-0000-000000000009", unit_number: "DHH-003", equipment_type: "flatbed", max_payload_lbs: 48000, temp_capability_min: null, temp_capability_max: null, current_load_status: "on_load", current_location_city: "Hattiesburg", current_location_state: "MS", availability_window_start: "2026-04-24T06:00:00Z", availability_window_end: "2026-04-30T18:00:00Z" },

  // Bayou Express Transport (C10) — 5 trucks (mixed dry van + reefer)
  { id: "ta100000-0000-0000-0000-000000000001", carrier_id: "ca000000-0000-0000-0000-00000000000a", unit_number: "BET-001", equipment_type: "reefer_53", max_payload_lbs: 44000, temp_capability_min: -20, temp_capability_max: 70, current_load_status: "available", current_location_city: "New Orleans", current_location_state: "LA", availability_window_start: "2026-04-24T06:00:00Z", availability_window_end: "2026-04-30T18:00:00Z" },
  { id: "ta100000-0000-0000-0000-000000000002", carrier_id: "ca000000-0000-0000-0000-00000000000a", unit_number: "BET-002", equipment_type: "dry_van", max_payload_lbs: 45000, temp_capability_min: null, temp_capability_max: null, current_load_status: "available", current_location_city: "Baton Rouge", current_location_state: "LA", availability_window_start: "2026-04-24T06:00:00Z", availability_window_end: "2026-04-30T18:00:00Z" },
  { id: "ta100000-0000-0000-0000-000000000003", carrier_id: "ca000000-0000-0000-0000-00000000000a", unit_number: "BET-003", equipment_type: "reefer_53", max_payload_lbs: 44000, temp_capability_min: -10, temp_capability_max: 70, current_load_status: "available", current_location_city: "Shreveport", current_location_state: "LA", availability_window_start: "2026-04-24T06:00:00Z", availability_window_end: "2026-04-30T18:00:00Z" },
  { id: "ta100000-0000-0000-0000-000000000004", carrier_id: "ca000000-0000-0000-0000-00000000000a", unit_number: "BET-004", equipment_type: "dry_van", max_payload_lbs: 45000, temp_capability_min: null, temp_capability_max: null, current_load_status: "on_load", current_location_city: "Lafayette", current_location_state: "LA", availability_window_start: "2026-04-24T06:00:00Z", availability_window_end: "2026-04-30T18:00:00Z" },
  { id: "ta100000-0000-0000-0000-000000000005", carrier_id: "ca000000-0000-0000-0000-00000000000a", unit_number: "BET-005", equipment_type: "dry_van", max_payload_lbs: 45000, temp_capability_min: null, temp_capability_max: null, current_load_status: "available", current_location_city: "New Orleans", current_location_state: "LA", availability_window_start: "2026-04-24T06:00:00Z", availability_window_end: "2026-04-30T18:00:00Z" },
];

// ─── Repeat booking history ─────────────────────────────────────────────────

const SEED_REPEAT_BOOKING: RepeatBookingEntry[] = [
  { carrier_id: "c1000000-0000-0000-0000-000000000001", broker_id: "b1000000-0000-0000-0000-000000000001", completed_loads: 48 },
  { carrier_id: "c1000000-0000-0000-0000-000000000001", broker_id: "b2000000-0000-0000-0000-000000000002", completed_loads: 22 },
  { carrier_id: "c2000000-0000-0000-0000-000000000002", broker_id: "b1000000-0000-0000-0000-000000000001", completed_loads: 35 },
  { carrier_id: "c2000000-0000-0000-0000-000000000002", broker_id: "b2000000-0000-0000-0000-000000000002", completed_loads: 29 },
  { carrier_id: "c3000000-0000-0000-0000-000000000003", broker_id: "b1000000-0000-0000-0000-000000000001", completed_loads: 41 },
  { carrier_id: "c3000000-0000-0000-0000-000000000003", broker_id: "b2000000-0000-0000-0000-000000000002", completed_loads: 26 },
  { carrier_id: "c4000000-0000-0000-0000-000000000004", broker_id: "b1000000-0000-0000-0000-000000000001", completed_loads: 33 },
  { carrier_id: "c4000000-0000-0000-0000-000000000004", broker_id: "b2000000-0000-0000-0000-000000000002", completed_loads: 19 },
  { carrier_id: "c5000000-0000-0000-0000-000000000005", broker_id: "b1000000-0000-0000-0000-000000000001", completed_loads: 25 },
  { carrier_id: "c5000000-0000-0000-0000-000000000005", broker_id: "b3000000-0000-0000-0000-000000000003", completed_loads: 18 },
  { carrier_id: "c6000000-0000-0000-0000-000000000006", broker_id: "b1000000-0000-0000-0000-000000000001", completed_loads: 52 },
  { carrier_id: "c6000000-0000-0000-0000-000000000006", broker_id: "b2000000-0000-0000-0000-000000000002", completed_loads: 38 },
  { carrier_id: "c7000000-0000-0000-0000-000000000007", broker_id: "b1000000-0000-0000-0000-000000000001", completed_loads: 44 },
  { carrier_id: "c7000000-0000-0000-0000-000000000007", broker_id: "b2000000-0000-0000-0000-000000000002", completed_loads: 31 },
  { carrier_id: "c8000000-0000-0000-0000-000000000008", broker_id: "b1000000-0000-0000-0000-000000000001", completed_loads: 58 },
  { carrier_id: "c8000000-0000-0000-0000-000000000008", broker_id: "b2000000-0000-0000-0000-000000000002", completed_loads: 42 },
  { carrier_id: "c9000000-0000-0000-0000-000000000009", broker_id: "b1000000-0000-0000-0000-000000000001", completed_loads: 36 },
  { carrier_id: "c9000000-0000-0000-0000-000000000009", broker_id: "b2000000-0000-0000-0000-000000000002", completed_loads: 22 },
  { carrier_id: "ca000000-0000-0000-0000-00000000000a", broker_id: "b1000000-0000-0000-0000-000000000001", completed_loads: 45 },
  { carrier_id: "ca000000-0000-0000-0000-00000000000a", broker_id: "b2000000-0000-0000-0000-000000000002", completed_loads: 33 },
];

const SEED_LANE_HISTORY: LaneHistoryEntry[] = [
  // c1 — Blue Ridge Reefer (SC)
  { carrier_id: "c1000000-0000-0000-0000-000000000001", origin_region: "SC", destination_region: "GA", runs: 120 },
  { carrier_id: "c1000000-0000-0000-0000-000000000001", origin_region: "SC", destination_region: "NC", runs: 95 },
  { carrier_id: "c1000000-0000-0000-0000-000000000001", origin_region: "SC", destination_region: "FL", runs: 82 },
  { carrier_id: "c1000000-0000-0000-0000-000000000001", origin_region: "GA", destination_region: "NC", runs: 64 },
  { carrier_id: "c1000000-0000-0000-0000-000000000001", origin_region: "GA", destination_region: "SC", runs: 78 },
  { carrier_id: "c1000000-0000-0000-0000-000000000001", origin_region: "NC", destination_region: "FL", runs: 55 },
  // c2 — Coastal Protein Transport (GA)
  { carrier_id: "c2000000-0000-0000-0000-000000000002", origin_region: "GA", destination_region: "SC", runs: 105 },
  { carrier_id: "c2000000-0000-0000-0000-000000000002", origin_region: "GA", destination_region: "FL", runs: 88 },
  { carrier_id: "c2000000-0000-0000-0000-000000000002", origin_region: "GA", destination_region: "NC", runs: 72 },
  { carrier_id: "c2000000-0000-0000-0000-000000000002", origin_region: "SC", destination_region: "GA", runs: 91 },
  { carrier_id: "c2000000-0000-0000-0000-000000000002", origin_region: "FL", destination_region: "GA", runs: 67 },
  // c3 — Sunbelt Cold Haul (FL)
  { carrier_id: "c3000000-0000-0000-0000-000000000003", origin_region: "FL", destination_region: "GA", runs: 115 },
  { carrier_id: "c3000000-0000-0000-0000-000000000003", origin_region: "FL", destination_region: "SC", runs: 89 },
  { carrier_id: "c3000000-0000-0000-0000-000000000003", origin_region: "FL", destination_region: "NC", runs: 68 },
  { carrier_id: "c3000000-0000-0000-0000-000000000003", origin_region: "GA", destination_region: "FL", runs: 98 },
  { carrier_id: "c3000000-0000-0000-0000-000000000003", origin_region: "SC", destination_region: "FL", runs: 74 },
  // c4 — Piedmont Express (NC)
  { carrier_id: "c4000000-0000-0000-0000-000000000004", origin_region: "NC", destination_region: "SC", runs: 92 },
  { carrier_id: "c4000000-0000-0000-0000-000000000004", origin_region: "NC", destination_region: "GA", runs: 78 },
  { carrier_id: "c4000000-0000-0000-0000-000000000004", origin_region: "NC", destination_region: "VA", runs: 85 },
  { carrier_id: "c4000000-0000-0000-0000-000000000004", origin_region: "SC", destination_region: "NC", runs: 71 },
  { carrier_id: "c4000000-0000-0000-0000-000000000004", origin_region: "NC", destination_region: "FL", runs: 56 },
  // c5 — Magnolia Freight (GA)
  { carrier_id: "c5000000-0000-0000-0000-000000000005", origin_region: "GA", destination_region: "FL", runs: 82 },
  { carrier_id: "c5000000-0000-0000-0000-000000000005", origin_region: "GA", destination_region: "SC", runs: 75 },
  { carrier_id: "c5000000-0000-0000-0000-000000000005", origin_region: "FL", destination_region: "GA", runs: 69 },
  { carrier_id: "c5000000-0000-0000-0000-000000000005", origin_region: "GA", destination_region: "NC", runs: 58 },
  // c6 — Volunteer Freight Lines (TN)
  { carrier_id: "c6000000-0000-0000-0000-000000000006", origin_region: "TN", destination_region: "GA", runs: 135 },
  { carrier_id: "c6000000-0000-0000-0000-000000000006", origin_region: "TN", destination_region: "SC", runs: 98 },
  { carrier_id: "c6000000-0000-0000-0000-000000000006", origin_region: "TN", destination_region: "NC", runs: 112 },
  { carrier_id: "c6000000-0000-0000-0000-000000000006", origin_region: "GA", destination_region: "TN", runs: 105 },
  { carrier_id: "c6000000-0000-0000-0000-000000000006", origin_region: "TN", destination_region: "FL", runs: 78 },
  { carrier_id: "c6000000-0000-0000-0000-000000000006", origin_region: "TN", destination_region: "AL", runs: 89 },
  // c7 — Iron City Flatbed (AL)
  { carrier_id: "c7000000-0000-0000-0000-000000000007", origin_region: "AL", destination_region: "GA", runs: 118 },
  { carrier_id: "c7000000-0000-0000-0000-000000000007", origin_region: "AL", destination_region: "TN", runs: 96 },
  { carrier_id: "c7000000-0000-0000-0000-000000000007", origin_region: "AL", destination_region: "SC", runs: 72 },
  { carrier_id: "c7000000-0000-0000-0000-000000000007", origin_region: "GA", destination_region: "AL", runs: 88 },
  { carrier_id: "c7000000-0000-0000-0000-000000000007", origin_region: "AL", destination_region: "FL", runs: 65 },
  // c8 — Commonwealth Carriers (VA)
  { carrier_id: "c8000000-0000-0000-0000-000000000008", origin_region: "VA", destination_region: "NC", runs: 142 },
  { carrier_id: "c8000000-0000-0000-0000-000000000008", origin_region: "VA", destination_region: "SC", runs: 108 },
  { carrier_id: "c8000000-0000-0000-0000-000000000008", origin_region: "VA", destination_region: "GA", runs: 85 },
  { carrier_id: "c8000000-0000-0000-0000-000000000008", origin_region: "NC", destination_region: "VA", runs: 125 },
  { carrier_id: "c8000000-0000-0000-0000-000000000008", origin_region: "NC", destination_region: "FL", runs: 72 },
  { carrier_id: "c8000000-0000-0000-0000-000000000008", origin_region: "NC", destination_region: "SC", runs: 91 },
  // c9 — Delta Heavy Haul (MS)
  { carrier_id: "c9000000-0000-0000-0000-000000000009", origin_region: "MS", destination_region: "GA", runs: 88 },
  { carrier_id: "c9000000-0000-0000-0000-000000000009", origin_region: "MS", destination_region: "AL", runs: 95 },
  { carrier_id: "c9000000-0000-0000-0000-000000000009", origin_region: "MS", destination_region: "TN", runs: 78 },
  { carrier_id: "c9000000-0000-0000-0000-000000000009", origin_region: "GA", destination_region: "MS", runs: 72 },
  { carrier_id: "c9000000-0000-0000-0000-000000000009", origin_region: "MS", destination_region: "FL", runs: 55 },
  // c10 — Bayou Express (LA)
  { carrier_id: "ca000000-0000-0000-0000-00000000000a", origin_region: "LA", destination_region: "GA", runs: 102 },
  { carrier_id: "ca000000-0000-0000-0000-00000000000a", origin_region: "LA", destination_region: "FL", runs: 118 },
  { carrier_id: "ca000000-0000-0000-0000-00000000000a", origin_region: "LA", destination_region: "SC", runs: 75 },
  { carrier_id: "ca000000-0000-0000-0000-00000000000a", origin_region: "FL", destination_region: "LA", runs: 95 },
  { carrier_id: "ca000000-0000-0000-0000-00000000000a", origin_region: "GA", destination_region: "LA", runs: 82 },
  { carrier_id: "ca000000-0000-0000-0000-00000000000a", origin_region: "LA", destination_region: "NC", runs: 58 },
];

// ─── Accessors ──────────────────────────────────────────────────────────────

export function ensureCarrierData(): void {
  if (typeof window === "undefined") return;
  // Force re-seed when seed version changes
  const currentVersion = sessionStorage.getItem(KEY_SEED_VERSION);
  const needsReseed = currentVersion !== SEED_VERSION;
  if (needsReseed) {
    sessionStorage.setItem(KEY_CARRIERS, JSON.stringify(SEED_CARRIERS));
    sessionStorage.setItem(KEY_CARRIER_TRUCKS, JSON.stringify(SEED_CARRIER_TRUCKS));
    sessionStorage.setItem(KEY_REPEAT_BOOKING, JSON.stringify(SEED_REPEAT_BOOKING));
    sessionStorage.setItem(KEY_LANE_HISTORY, JSON.stringify(SEED_LANE_HISTORY));
    sessionStorage.setItem(KEY_SEED_VERSION, SEED_VERSION);
    return;
  }
  // Fall back to seeds if keys are missing (e.g. Supabase sync hasn't run)
  if (!sessionStorage.getItem(KEY_CARRIERS)) {
    sessionStorage.setItem(KEY_CARRIERS, JSON.stringify(SEED_CARRIERS));
  }
  if (!sessionStorage.getItem(KEY_CARRIER_TRUCKS)) {
    sessionStorage.setItem(KEY_CARRIER_TRUCKS, JSON.stringify(SEED_CARRIER_TRUCKS));
  }
  if (!sessionStorage.getItem(KEY_REPEAT_BOOKING)) {
    sessionStorage.setItem(KEY_REPEAT_BOOKING, JSON.stringify(SEED_REPEAT_BOOKING));
  }
  if (!sessionStorage.getItem(KEY_LANE_HISTORY)) {
    sessionStorage.setItem(KEY_LANE_HISTORY, JSON.stringify(SEED_LANE_HISTORY));
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
