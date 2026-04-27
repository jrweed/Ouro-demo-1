/**
 * Seed Supabase with demo carriers, trucks, brokers, and booking history.
 *
 * Usage: node spoke/scripts/seed-supabase.mjs
 *
 * Reads seed data from carrier-data.ts (imported as JSON constants below)
 * and inserts into the Supabase database via REST API.
 */

const SUPABASE_URL = process.env.SUPABASE_URL || "https://knpujbdjeqfdcylgqfow.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function supabaseInsert(table, rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "resolution=merge-duplicates",
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`Failed to insert into ${table}: ${res.status} ${text}`);
    return false;
  }
  console.log(`✓ ${table}: ${rows.length} rows inserted`);
  return true;
}

// ─── Broker seed data ─────────────────────────────────────────────────────────
const BROKERS = [
  {
    id: "b1000000-0000-0000-0000-000000000001",
    company_name: "Lowcountry Logistics",
    contact_name: "Jamie Carter",
    email: "dispatch@lowcountrylogistics.com",
    phone: "843-555-0100",
    city: "Charleston",
    state: "SC",
    platform_status: "approved",
    primary_commodity_types: ["produce", "protein", "dairy", "frozen"],
    typical_lanes: ["SC-GA", "SC-NC", "FL-GA"],
    typical_load_weight_lbs: 42000,
    requires_food_grade: true,
    subscription_tier: "professional",
  },
];

// ─── Carrier seed data ────────────────────────────────────────────────────────
const CARRIERS = [
  {
    id: "c1000000-0000-0000-0000-000000000001",
    company_name: "Blue Ridge Reefer LLC",
    contact_name: "Thomas Greer",
    email: "dispatch@blueridgereefer.com",
    phone: "864-555-0111",
    city: "Greenville", state: "SC", domicile_state: "SC",
    platform_status: "approved",
    operating_authority_active: true,
    mc_number: "MC-881234", dot_number: "DOT-3349021",
    insurance_current: true, insurance_expiry_date: "2027-06-15", insurance_coverage_usd: 1000000,
    certified_commodity_types: ["produce", "dairy", "frozen", "protein"],
    trailer_type: "carrier_owned", haul_preference: "any",
    capabilities: ["food_grade_washout", "gps_tracking", "temp_monitoring"],
    rating: 4.85, total_loads_completed: 312,
    on_time_pickup_rate: 0.965, on_time_delivery_rate: 0.958, acceptance_rate: 0.780,
  },
  {
    id: "c2000000-0000-0000-0000-000000000002",
    company_name: "Palmetto Transport",
    contact_name: "Linda Marsh",
    email: "dispatch@palmettotrans.com",
    phone: "843-555-0222",
    city: "Charleston", state: "SC", domicile_state: "SC",
    platform_status: "approved",
    operating_authority_active: true,
    mc_number: "MC-772890", dot_number: "DOT-2918374",
    insurance_current: true, insurance_expiry_date: "2027-03-01", insurance_coverage_usd: 1000000,
    certified_commodity_types: ["produce", "dairy", "protein"],
    trailer_type: "carrier_owned", haul_preference: "short",
    capabilities: ["food_grade_washout", "gps_tracking"],
    rating: 4.72, total_loads_completed: 189,
    on_time_pickup_rate: 0.940, on_time_delivery_rate: 0.935, acceptance_rate: 0.820,
  },
  {
    id: "c3000000-0000-0000-0000-000000000003",
    company_name: "Sunbelt Cold Haul Inc",
    contact_name: "Marcus Vega",
    email: "dispatch@sunbeltcoldhaul.com",
    phone: "305-555-0333",
    city: "Miami", state: "FL", domicile_state: "FL",
    platform_status: "approved",
    operating_authority_active: true,
    mc_number: "MC-661045", dot_number: "DOT-4102938",
    insurance_current: true, insurance_expiry_date: "2027-09-30", insurance_coverage_usd: 1500000,
    certified_commodity_types: ["produce", "frozen", "floral", "pharma"],
    trailer_type: "carrier_owned", haul_preference: "long",
    capabilities: ["food_grade_washout", "gps_tracking", "temp_monitoring", "hazmat_cert"],
    rating: 4.91, total_loads_completed: 478,
    on_time_pickup_rate: 0.978, on_time_delivery_rate: 0.972, acceptance_rate: 0.690,
  },
  {
    id: "c4000000-0000-0000-0000-000000000004",
    company_name: "Piedmont Express Refrigerated",
    contact_name: "Sarah Kim",
    email: "dispatch@piedmontexpress.com",
    phone: "336-555-0444",
    city: "Greensboro", state: "NC", domicile_state: "NC",
    platform_status: "approved",
    operating_authority_active: true,
    mc_number: "MC-553210", dot_number: "DOT-3875612",
    insurance_current: true, insurance_expiry_date: "2027-01-15", insurance_coverage_usd: 1000000,
    certified_commodity_types: ["produce", "dairy"],
    trailer_type: "carrier_owned", haul_preference: "any",
    capabilities: ["food_grade_washout", "gps_tracking", "temp_monitoring"],
    rating: 4.68, total_loads_completed: 145,
    on_time_pickup_rate: 0.952, on_time_delivery_rate: 0.948, acceptance_rate: 0.850,
  },
  {
    id: "c5000000-0000-0000-0000-000000000005",
    company_name: "Magnolia Fleet Services",
    contact_name: "David Chen",
    email: "dispatch@magnoliafleet.com",
    phone: "229-555-0555",
    city: "Albany", state: "GA", domicile_state: "GA",
    platform_status: "approved",
    operating_authority_active: true,
    mc_number: "MC-442876", dot_number: "DOT-3601847",
    insurance_current: true, insurance_expiry_date: "2027-04-20", insurance_coverage_usd: 1000000,
    certified_commodity_types: ["produce", "protein", "frozen"],
    trailer_type: "carrier_owned", haul_preference: "long",
    capabilities: ["food_grade_washout", "gps_tracking", "temp_monitoring"],
    rating: 4.78, total_loads_completed: 267,
    on_time_pickup_rate: 0.960, on_time_delivery_rate: 0.955, acceptance_rate: 0.740,
  },
];

// ─── Truck seed data ──────────────────────────────────────────────────────────
// Abbreviated — 10 trucks per carrier = 50 total
function makeTrucks(carrierId, prefix, count, eqType, cities) {
  return Array.from({ length: count }, (_, i) => ({
    id: crypto.randomUUID(),
    carrier_id: carrierId,
    unit_number: `${prefix}-${parseInt(carrierId.slice(1,2))}0${i+1}`,
    equipment_type: i % 4 === 3 ? "reefer_48" : eqType,
    max_payload_lbs: i % 4 === 3 ? 42000 : 44000,
    temp_capability_min: eqType.startsWith("reefer") ? (i % 3 === 0 ? -20 : -10) : null,
    temp_capability_max: eqType.startsWith("reefer") ? 70 : null,
    current_load_status: i % 5 === 1 ? "on_load" : "available",
    current_location_city: cities[i % cities.length],
    current_location_state: carrierId.includes("c1") ? "SC" : carrierId.includes("c2") ? "SC" : carrierId.includes("c3") ? "FL" : carrierId.includes("c4") ? "NC" : "GA",
    availability_window_start: "2026-04-24T06:00:00Z",
    availability_window_end: "2026-04-28T18:00:00Z",
  }));
}

const TRUCKS = [
  ...makeTrucks("c1000000-0000-0000-0000-000000000001", "BRR", 10, "reefer_53",
    ["Greenville", "Columbia", "Spartanburg", "Anderson", "Greenville", "Charlotte", "Augusta", "Atlanta", "Greenville", "Rock Hill"]),
  ...makeTrucks("c2000000-0000-0000-0000-000000000002", "PLM", 10, "reefer_53",
    ["Charleston", "Mount Pleasant", "Summerville", "North Charleston", "Charleston", "Beaufort", "Hilton Head", "Walterboro", "Charleston", "Georgetown"]),
  ...makeTrucks("c3000000-0000-0000-0000-000000000003", "SBH", 10, "reefer_53",
    ["Miami", "Fort Lauderdale", "Tampa", "Orlando", "Miami", "Jacksonville", "Gainesville", "Miami", "Boca Raton", "Tallahassee"]),
  ...makeTrucks("c4000000-0000-0000-0000-000000000004", "PER", 10, "reefer_53",
    ["Greensboro", "Charlotte", "Columbia", "Winston-Salem", "Durham", "Greensboro", "Raleigh", "Fayetteville", "Greensboro", "Asheville"]),
  ...makeTrucks("c5000000-0000-0000-0000-000000000005", "MFS", 10, "reefer_53",
    ["Albany", "Valdosta", "Macon", "Savannah", "Albany", "Columbus", "Albany", "Dothan", "Thomasville", "Atlanta"]),
];

// Fix state for multi-state carriers
TRUCKS.forEach(t => {
  if (t.carrier_id.includes("c3")) t.current_location_state = "FL";
  if (t.carrier_id.includes("c4")) {
    if (t.current_location_city === "Columbia") t.current_location_state = "SC";
    else t.current_location_state = "NC";
  }
  if (t.carrier_id.includes("c5")) {
    if (t.current_location_city === "Atlanta" || t.current_location_city === "Savannah") t.current_location_state = "GA";
    else if (t.current_location_city === "Dothan") t.current_location_state = "AL";
    else t.current_location_state = "GA";
  }
});

// ─── Repeat booking history ───────────────────────────────────────────────────
const REPEAT_BOOKINGS = [
  { carrier_id: "c1000000-0000-0000-0000-000000000001", broker_id: "b1000000-0000-0000-0000-000000000001", completed_loads: 24 },
  { carrier_id: "c2000000-0000-0000-0000-000000000002", broker_id: "b1000000-0000-0000-0000-000000000001", completed_loads: 15 },
  { carrier_id: "c3000000-0000-0000-0000-000000000003", broker_id: "b1000000-0000-0000-0000-000000000001", completed_loads: 38 },
  { carrier_id: "c4000000-0000-0000-0000-000000000004", broker_id: "b1000000-0000-0000-0000-000000000001", completed_loads: 8 },
  { carrier_id: "c5000000-0000-0000-0000-000000000005", broker_id: "b1000000-0000-0000-0000-000000000001", completed_loads: 20 },
];

// ─── Lane history ─────────────────────────────────────────────────────────────
const LANE_HISTORY = [
  { carrier_id: "c1000000-0000-0000-0000-000000000001", origin_region: "SC", destination_region: "GA", runs: 45 },
  { carrier_id: "c1000000-0000-0000-0000-000000000001", origin_region: "SC", destination_region: "NC", runs: 30 },
  { carrier_id: "c2000000-0000-0000-0000-000000000002", origin_region: "SC", destination_region: "GA", runs: 22 },
  { carrier_id: "c2000000-0000-0000-0000-000000000002", origin_region: "SC", destination_region: "FL", runs: 18 },
  { carrier_id: "c3000000-0000-0000-0000-000000000003", origin_region: "FL", destination_region: "GA", runs: 55 },
  { carrier_id: "c3000000-0000-0000-0000-000000000003", origin_region: "FL", destination_region: "SC", runs: 35 },
  { carrier_id: "c4000000-0000-0000-0000-000000000004", origin_region: "NC", destination_region: "SC", runs: 20 },
  { carrier_id: "c4000000-0000-0000-0000-000000000004", origin_region: "NC", destination_region: "GA", runs: 15 },
  { carrier_id: "c5000000-0000-0000-0000-000000000005", origin_region: "GA", destination_region: "FL", runs: 40 },
  { carrier_id: "c5000000-0000-0000-0000-000000000005", origin_region: "GA", destination_region: "SC", runs: 28 },
];

async function main() {
  console.log("Seeding Supabase with demo data...\n");

  await supabaseInsert("brokers", BROKERS);
  await supabaseInsert("carriers", CARRIERS);
  await supabaseInsert("trucks", TRUCKS);
  await supabaseInsert("repeat_booking_history", REPEAT_BOOKINGS);
  await supabaseInsert("lane_history", LANE_HISTORY);

  console.log("\nDone! Demo data seeded into Supabase.");
}

main().catch(console.error);
