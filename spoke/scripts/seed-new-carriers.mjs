/**
 * Seed 5 additional carriers with diverse equipment types (dry van, flatbed, mixed).
 *
 * Usage: node spoke/scripts/seed-new-carriers.mjs
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
  console.log(`  ${table}: ${rows.length} rows inserted`);
  return true;
}

// ─── 5 New Carriers ──────────────────────────────────────────────────────────

const NEW_CARRIERS = [
  // C6 — Dry van specialist, Tennessee
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
  },
  // C7 — Flatbed specialist, Alabama
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
  },
  // C8 — Mixed fleet (dry van + reefer), Virginia
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
  },
  // C9 — Flatbed + step deck, Mississippi
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
  },
  // C10 — Dry van + reefer, Louisiana
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
  },
];

// ─── Truck generator (equipment-aware) ──────────────────────────────────────

function makeTrucks(carrierId, prefix, count, equipments, cities, states) {
  return Array.from({ length: count }, (_, i) => {
    const eq = equipments[i % equipments.length];
    const isReefer = eq.startsWith("reefer");
    const isFlatbed = eq.startsWith("flatbed") || eq.startsWith("step_deck");
    return {
      id: crypto.randomUUID(),
      carrier_id: carrierId,
      unit_number: `${prefix}-${String(i + 1).padStart(3, "0")}`,
      equipment_type: eq,
      max_payload_lbs: isFlatbed ? 48000 : isReefer ? 44000 : 45000,
      temp_capability_min: isReefer ? (i % 3 === 0 ? -20 : -10) : null,
      temp_capability_max: isReefer ? 70 : null,
      current_load_status: i % 6 === 2 ? "on_load" : "available",
      current_location_city: cities[i % cities.length],
      current_location_state: states[i % states.length],
      availability_window_start: "2026-04-24T06:00:00Z",
      availability_window_end: "2026-04-30T18:00:00Z",
    };
  });
}

// C6 — Volunteer Freight: 15 trucks, all dry van
const C6_TRUCKS = makeTrucks(
  "c6000000-0000-0000-0000-000000000006", "VFL", 15,
  ["dry_van", "dry_van", "dry_van", "dry_van", "dry_van"],
  ["Nashville", "Memphis", "Knoxville", "Chattanooga", "Nashville", "Murfreesboro", "Clarksville", "Nashville", "Jackson", "Cookeville", "Nashville", "Franklin", "Memphis", "Kingsport", "Nashville"],
  ["TN", "TN", "TN", "TN", "TN", "TN", "TN", "TN", "TN", "TN", "TN", "TN", "TN", "TN", "TN"]
);

// C7 — Iron City Flatbed: 8 trucks, flatbed + step deck
const C7_TRUCKS = makeTrucks(
  "c7000000-0000-0000-0000-000000000007", "ICF", 8,
  ["flatbed", "flatbed", "step_deck", "flatbed", "flatbed", "step_deck", "flatbed", "flatbed"],
  ["Birmingham", "Huntsville", "Mobile", "Montgomery", "Birmingham", "Tuscaloosa", "Birmingham", "Decatur"],
  ["AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL"]
);

// C8 — Commonwealth Carriers: 20 trucks, mixed dry van + reefer
const C8_TRUCKS = makeTrucks(
  "c8000000-0000-0000-0000-000000000008", "CWC", 20,
  ["dry_van", "reefer_53", "dry_van", "reefer_53", "dry_van", "dry_van", "reefer_53", "dry_van", "reefer_48", "dry_van"],
  ["Richmond", "Norfolk", "Virginia Beach", "Roanoke", "Richmond", "Charlottesville", "Lynchburg", "Richmond", "Alexandria", "Newport News",
   "Richmond", "Chesapeake", "Hampton", "Fredericksburg", "Richmond", "Danville", "Suffolk", "Richmond", "Harrisonburg", "Richmond"],
  ["VA", "VA", "VA", "VA", "VA", "VA", "VA", "VA", "VA", "VA", "VA", "VA", "VA", "VA", "VA", "VA", "VA", "VA", "VA", "VA"]
);

// C9 — Delta Heavy Haul: 6 trucks, flatbed + step deck
const C9_TRUCKS = makeTrucks(
  "c9000000-0000-0000-0000-000000000009", "DHH", 6,
  ["flatbed", "step_deck", "flatbed", "flatbed", "step_deck", "flatbed"],
  ["Jackson", "Gulfport", "Hattiesburg", "Meridian", "Jackson", "Tupelo"],
  ["MS", "MS", "MS", "MS", "MS", "MS"]
);

// C10 — Bayou Express: 12 trucks, dry van + reefer mix
const C10_TRUCKS = makeTrucks(
  "ca000000-0000-0000-0000-00000000000a", "BET", 12,
  ["reefer_53", "dry_van", "reefer_53", "dry_van", "dry_van", "reefer_48", "dry_van", "reefer_53", "dry_van", "dry_van", "reefer_53", "dry_van"],
  ["New Orleans", "Baton Rouge", "Shreveport", "Lafayette", "New Orleans", "Lake Charles", "New Orleans", "Metairie", "Kenner", "New Orleans", "Houma", "New Orleans"],
  ["LA", "LA", "LA", "LA", "LA", "LA", "LA", "LA", "LA", "LA", "LA", "LA"]
);

const ALL_NEW_TRUCKS = [...C6_TRUCKS, ...C7_TRUCKS, ...C8_TRUCKS, ...C9_TRUCKS, ...C10_TRUCKS];

// ─── Repeat booking + lane history for new carriers ─────────────────────────

const NEW_REPEAT_BOOKINGS = [
  { carrier_id: "c6000000-0000-0000-0000-000000000006", broker_id: "b1000000-0000-0000-0000-000000000001", completed_loads: 18 },
  { carrier_id: "c7000000-0000-0000-0000-000000000007", broker_id: "b1000000-0000-0000-0000-000000000001", completed_loads: 12 },
  { carrier_id: "c8000000-0000-0000-0000-000000000008", broker_id: "b1000000-0000-0000-0000-000000000001", completed_loads: 31 },
  { carrier_id: "c9000000-0000-0000-0000-000000000009", broker_id: "b1000000-0000-0000-0000-000000000001", completed_loads: 6 },
  { carrier_id: "ca000000-0000-0000-0000-00000000000a", broker_id: "b1000000-0000-0000-0000-000000000001", completed_loads: 22 },
];

const NEW_LANE_HISTORY = [
  { carrier_id: "c6000000-0000-0000-0000-000000000006", origin_region: "TN", destination_region: "GA", runs: 38 },
  { carrier_id: "c6000000-0000-0000-0000-000000000006", origin_region: "TN", destination_region: "AL", runs: 25 },
  { carrier_id: "c6000000-0000-0000-0000-000000000006", origin_region: "TN", destination_region: "SC", runs: 15 },
  { carrier_id: "c7000000-0000-0000-0000-000000000007", origin_region: "AL", destination_region: "GA", runs: 42 },
  { carrier_id: "c7000000-0000-0000-0000-000000000007", origin_region: "AL", destination_region: "TN", runs: 30 },
  { carrier_id: "c7000000-0000-0000-0000-000000000007", origin_region: "AL", destination_region: "MS", runs: 18 },
  { carrier_id: "c8000000-0000-0000-0000-000000000008", origin_region: "VA", destination_region: "NC", runs: 48 },
  { carrier_id: "c8000000-0000-0000-0000-000000000008", origin_region: "VA", destination_region: "SC", runs: 22 },
  { carrier_id: "c8000000-0000-0000-0000-000000000008", origin_region: "VA", destination_region: "GA", runs: 16 },
  { carrier_id: "c9000000-0000-0000-0000-000000000009", origin_region: "MS", destination_region: "AL", runs: 25 },
  { carrier_id: "c9000000-0000-0000-0000-000000000009", origin_region: "MS", destination_region: "LA", runs: 20 },
  { carrier_id: "c9000000-0000-0000-0000-000000000009", origin_region: "MS", destination_region: "TN", runs: 12 },
  { carrier_id: "ca000000-0000-0000-0000-00000000000a", origin_region: "LA", destination_region: "MS", runs: 32 },
  { carrier_id: "ca000000-0000-0000-0000-00000000000a", origin_region: "LA", destination_region: "TX", runs: 28 },
  { carrier_id: "ca000000-0000-0000-0000-00000000000a", origin_region: "LA", destination_region: "AL", runs: 18 },
];

// ─── Run ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Seeding 5 new carriers with diverse equipment...\n");

  await supabaseInsert("carriers", NEW_CARRIERS);
  console.log(`  Total new trucks: ${ALL_NEW_TRUCKS.length}`);
  await supabaseInsert("trucks", ALL_NEW_TRUCKS);
  await supabaseInsert("repeat_booking_history", NEW_REPEAT_BOOKINGS);
  await supabaseInsert("lane_history", NEW_LANE_HISTORY);

  console.log("\nDone! New carriers seeded.");
  console.log("  C6: Volunteer Freight (15 dry vans) — Nashville, TN");
  console.log("  C7: Iron City Flatbed (8 flatbed/step deck) — Birmingham, AL");
  console.log("  C8: Commonwealth Carriers (20 mixed dry van/reefer) — Richmond, VA");
  console.log("  C9: Delta Heavy Haul (6 flatbed/step deck) — Jackson, MS");
  console.log("  C10: Bayou Express (12 mixed dry van/reefer) — New Orleans, LA");
}

main().catch(console.error);
