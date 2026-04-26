/**
 * Spoke Matching Algorithm — TypeScript implementation
 *
 * Mirrors the Python FastAPI matching service exactly.
 * Three layers: hard filters → multiplicative scoring → top-K ranking.
 *
 * TODO(supabase): When Railway + Supabase are live, replace this with
 * a fetch() call to POST /api/v1/match on the FastAPI service.
 */

import {
  type CarrierProfile,
  type CarrierTruck,
  getCarrierProfiles,
  getCarrierTrucks,
  getRepeatBookingHistory,
  getLaneHistory,
} from "./carrier-data";

// ─── Config ─────────────────────────────────────────────────────────────────

const MAX_DEADHEAD_MILES = 150;
const MAX_FRESHNESS_WINDOW_HOURS = 72;
const SOUTHEAST_STATES = ["SC", "GA", "NC", "FL"];
const DEFAULT_TOP_K = 10;

// ─── Types ──────────────────────────────────────────────────────────────────

export interface LoadForMatching {
  id: string;
  broker_id: string;
  commodity_type: string;
  required_temp_min: number | null;
  required_temp_max: number | null;
  required_equipment_types: string[];
  required_trailer_type: string | null;
  weight_lbs: number;
  required_coverage_usd: number | null;
  pickup_city: string;
  pickup_state: string;
  delivery_city: string;
  delivery_state: string;
  pickup_time: string; // ISO 8601
  required_capabilities: string[];
  excluded_carrier_ids: string[];
}

export interface MatchResult {
  carrier: CarrierProfile;
  truck: CarrierTruck;
  scores: {
    distance: number;
    freshness: number;
    repeat_booking: number;
    rating: number;
    reliability: number;
    composite: number;
  };
  rank: number;
  deadhead_miles: number;
  route_miles: number;
}

export interface FilterRejection {
  carrier_id: string;
  carrier_name: string;
  reason: string;
}

// ─── Coordinate lookup ──────────────────────────────────────────────────────

const CITY_COORDS: Record<string, [number, number]> = {
  "greenville_sc":    [34.8526, -82.3940],
  "charleston_sc":    [32.7765, -79.9311],
  "columbia_sc":      [34.0007, -81.0348],
  "spartanburg_sc":   [34.9496, -81.9320],
  "anderson_sc":      [34.5034, -82.6501],
  "rock hill_sc":     [34.9249, -81.0251],
  "savannah_ga":      [32.0835, -81.0998],
  "atlanta_ga":       [33.7490, -84.3880],
  "augusta_ga":       [33.4735, -82.0105],
  "albany_ga":        [31.5785, -84.1557],
  "valdosta_ga":      [30.8327, -83.2785],
  "macon_ga":         [32.8407, -83.6324],
  "columbus_ga":      [32.4610, -84.9877],
  "brunswick_ga":     [31.1499, -81.4915],
  "statesboro_ga":    [32.4488, -81.7832],
  "hinesville_ga":    [31.8468, -81.5959],
  "thomasville_ga":   [30.8366, -83.9788],
  "dothan_ga":        [31.2232, -85.3905],
  "charlotte_nc":     [35.2271, -80.8431],
  "greensboro_nc":    [36.0726, -79.7920],
  "winston-salem_nc": [36.0999, -80.2442],
  "durham_nc":        [35.9940, -78.8986],
  "raleigh_nc":       [35.7796, -78.6382],
  "fayetteville_nc":  [35.0527, -78.8784],
  "asheville_nc":     [35.5951, -82.5515],
  "miami_fl":         [25.7617, -80.1918],
  "fort lauderdale_fl": [26.1224, -80.1373],
  "tampa_fl":         [27.9506, -82.4572],
  "orlando_fl":       [28.5383, -81.3792],
  "jacksonville_fl":  [30.3322, -81.6557],
  "gainesville_fl":   [29.6516, -82.3248],
  "tallahassee_fl":   [30.4383, -84.2807],
  "boca raton_fl":    [26.3683, -80.1289],
  "clearwater_fl":    [27.9659, -82.8001],
  "st. petersburg_fl":[27.7676, -82.6403],
  "st petersburg_fl": [27.7676, -82.6403],
  "pensacola_fl":     [30.4213, -87.2169],
  "naples_fl":        [26.1420, -81.7948],
  "sarasota_fl":      [27.3364, -82.5307],
  "lakeland_fl":      [28.0395, -81.9498],
  "ocala_fl":         [29.1872, -82.1401],
  "nashville_tn":     [36.1627, -86.7816],
  "knoxville_tn":     [35.9606, -83.9207],
  "memphis_tn":       [35.1495, -90.0490],
  "chattanooga_tn":   [35.0456, -85.3097],
  "birmingham_al":    [33.5186, -86.8104],
  "montgomery_al":    [32.3792, -86.3077],
  "mobile_al":        [30.6954, -88.0399],
  "huntsville_al":    [34.7304, -86.5861],
  "new orleans_la":   [29.9511, -90.0715],
  "baton rouge_la":   [30.4515, -91.1871],
  "richmond_va":      [37.5407, -77.4360],
  "norfolk_va":       [36.8508, -76.2859],
  "virginia beach_va":[36.8529, -75.9780],
};

function cityKey(city: string, state: string): string {
  return `${city.toLowerCase().trim()}_${state.toLowerCase().trim()}`;
}

function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function estimateDeadhead(truckCity: string, truckState: string, pickupCity: string, pickupState: string): number {
  const c1 = CITY_COORDS[cityKey(truckCity, truckState)];
  const c2 = CITY_COORDS[cityKey(pickupCity, pickupState)];
  if (!c1 || !c2) return MAX_DEADHEAD_MILES;
  return haversineMiles(c1[0], c1[1], c2[0], c2[1]);
}

function estimateRouteMiles(pickupCity: string, pickupState: string, deliveryCity: string, deliveryState: string): number {
  const c1 = CITY_COORDS[cityKey(pickupCity, pickupState)];
  const c2 = CITY_COORDS[cityKey(deliveryCity, deliveryState)];
  if (!c1 || !c2) return 250;
  return haversineMiles(c1[0], c1[1], c2[0], c2[1]);
}

// ─── Layer 1: Hard Filters ──────────────────────────────────────────────────

function applyHardFilters(
  load: LoadForMatching,
  carriers: CarrierProfile[],
  trucks: CarrierTruck[],
): { eligible: (CarrierProfile & { _eligible_trucks: CarrierTruck[] })[]; rejections: FilterRejection[] } {
  const eligible: (CarrierProfile & { _eligible_trucks: CarrierTruck[] })[] = [];
  const rejections: FilterRejection[] = [];

  for (const c of carriers) {
    // 1. Platform status — ALWAYS first
    if (c.platform_status !== "approved") {
      rejections.push({ carrier_id: c.id, carrier_name: c.company_name, reason: `platform_status=${c.platform_status}` });
      continue;
    }
    // 2. Operating authority
    if (!c.operating_authority_active) {
      rejections.push({ carrier_id: c.id, carrier_name: c.company_name, reason: "operating_authority not active" });
      continue;
    }
    // 3. Insurance current
    if (!c.insurance_current) {
      rejections.push({ carrier_id: c.id, carrier_name: c.company_name, reason: "insurance expired" });
      continue;
    }
    // 4. Insurance coverage
    if (load.required_coverage_usd && (c.insurance_coverage_usd || 0) < load.required_coverage_usd) {
      rejections.push({ carrier_id: c.id, carrier_name: c.company_name, reason: `coverage $${c.insurance_coverage_usd?.toLocaleString()} < required $${load.required_coverage_usd.toLocaleString()}` });
      continue;
    }
    // 5. Commodity certification
    if (!c.certified_commodity_types.includes(load.commodity_type)) {
      rejections.push({ carrier_id: c.id, carrier_name: c.company_name, reason: `not certified for ${load.commodity_type}` });
      continue;
    }
    // 6. Domicile state
    if (!SOUTHEAST_STATES.includes(c.domicile_state)) {
      rejections.push({ carrier_id: c.id, carrier_name: c.company_name, reason: `domicile ${c.domicile_state} outside SE region` });
      continue;
    }
    // 7. Capabilities
    if (load.required_capabilities.length > 0) {
      const missing = load.required_capabilities.filter(cap => !c.capabilities.includes(cap));
      if (missing.length > 0) {
        rejections.push({ carrier_id: c.id, carrier_name: c.company_name, reason: `missing capabilities: ${missing.join(", ")}` });
        continue;
      }
    }
    // 8. Exclusion list
    if (load.excluded_carrier_ids.includes(c.id)) {
      rejections.push({ carrier_id: c.id, carrier_name: c.company_name, reason: "excluded by broker" });
      continue;
    }
    // 9. Trailer type
    if (load.required_trailer_type) {
      if (c.trailer_type !== load.required_trailer_type && c.trailer_type !== "both") {
        rejections.push({ carrier_id: c.id, carrier_name: c.company_name, reason: `trailer type ${c.trailer_type} ≠ required ${load.required_trailer_type}` });
        continue;
      }
    }

    // Truck-level filters
    const carrierTrucks = trucks.filter(t => t.carrier_id === c.id);
    const eligibleTrucks: CarrierTruck[] = [];

    for (const t of carrierTrucks) {
      if (t.current_load_status === "on_load") { console.debug(`[match] ${c.company_name} truck ${t.unit_number}: skip — on_load`); continue; }
      if (load.required_equipment_types.length > 0 && !load.required_equipment_types.includes(t.equipment_type)) { console.debug(`[match] ${c.company_name} truck ${t.unit_number}: skip — equipment ${t.equipment_type} not in [${load.required_equipment_types}]`); continue; }
      if (load.required_temp_min != null && t.temp_capability_min > load.required_temp_min) { console.debug(`[match] ${c.company_name} truck ${t.unit_number}: skip — temp_min ${t.temp_capability_min} > required ${load.required_temp_min}`); continue; }
      if (load.required_temp_max != null && t.temp_capability_max < load.required_temp_max) { console.debug(`[match] ${c.company_name} truck ${t.unit_number}: skip — temp_max ${t.temp_capability_max} < required ${load.required_temp_max}`); continue; }
      if (t.max_payload_lbs < load.weight_lbs) { console.debug(`[match] ${c.company_name} truck ${t.unit_number}: skip — payload ${t.max_payload_lbs} < required ${load.weight_lbs}`); continue; }
      eligibleTrucks.push(t);
    }

    if (eligibleTrucks.length === 0) {
      rejections.push({ carrier_id: c.id, carrier_name: c.company_name, reason: "no eligible trucks (equipment/temp/payload/status)" });
      continue;
    }

    eligible.push({ ...c, _eligible_trucks: eligibleTrucks });
  }

  return { eligible, rejections };
}

// ─── Layer 2: Multiplicative Scoring ────────────────────────────────────────

// Weights — must match spec exactly
const W = { distance: 0.30, freshness: 0.25, repeat_booking: 0.20, rating: 0.15, reliability: 0.10 };

function calcDistanceScore(deadheadMi: number, haulPref: string, routeMi: number): number {
  let score = Math.max(0, 1 - deadheadMi / MAX_DEADHEAD_MILES);
  if (haulPref === "short" && routeMi > 250) score *= 0.85;
  else if (haulPref === "long" && routeMi < 250) score *= 0.85;
  return score;
}

function calcFreshnessScore(pickupTime: string): number {
  const pickup = new Date(pickupTime).getTime();
  const now = Date.now();
  const hoursUntil = Math.max(0, (pickup - now) / 3_600_000);
  return Math.max(0, 1 - hoursUntil / MAX_FRESHNESS_WINDOW_HOURS);
}

function calcRepeatBookingScore(carrierId: string, brokerId: string, originState: string, destState: string, totalLoads: number): number {
  if (totalLoads === 0) return 0.30; // Provisional
  const rbh = getRepeatBookingHistory();
  const lh = getLaneHistory();
  const laneRuns = lh.find(e => e.carrier_id === carrierId && e.origin_region === originState && e.destination_region === destState)?.runs ?? 0;
  const brokerLoads = rbh.find(e => e.carrier_id === carrierId && e.broker_id === brokerId)?.completed_loads ?? 0;
  const laneScore = Math.min(1, laneRuns / 10);
  const brokerScore = Math.min(1, brokerLoads / 5);
  return laneScore * 0.60 + brokerScore * 0.40;
}

function calcRatingScore(rating: number | null): number {
  if (rating === null) return 0.6; // Provisional
  return (rating - 1) / 4;
}

function calcReliabilityScore(otp: number | null, otd: number | null, acc: number | null, totalLoads: number): number {
  if (totalLoads === 0) return 0.65; // Provisional
  return ((otp ?? 0.65) * 0.40) + ((otd ?? 0.65) * 0.40) + ((acc ?? 0.65) * 0.20);
}

function scoreCarrierTruck(carrier: CarrierProfile, truck: CarrierTruck, load: LoadForMatching) {
  const deadhead = estimateDeadhead(truck.current_location_city, truck.current_location_state, load.pickup_city, load.pickup_state);
  const routeMi = estimateRouteMiles(load.pickup_city, load.pickup_state, load.delivery_city, load.delivery_state);

  const distance = calcDistanceScore(deadhead, carrier.haul_preference, routeMi);
  const freshness = calcFreshnessScore(load.pickup_time);
  const repeat_booking = calcRepeatBookingScore(carrier.id, load.broker_id, load.pickup_state, load.delivery_state, carrier.total_loads_completed);
  const rating = calcRatingScore(carrier.rating);
  const reliability = calcReliabilityScore(carrier.on_time_pickup_rate, carrier.on_time_delivery_rate, carrier.acceptance_rate, carrier.total_loads_completed);

  // Multiplicative weighted score — NEVER additive
  const composite =
    Math.pow(Math.max(distance, 1e-9), W.distance) *
    Math.pow(Math.max(freshness, 1e-9), W.freshness) *
    Math.pow(Math.max(repeat_booking, 1e-9), W.repeat_booking) *
    Math.pow(Math.max(rating, 1e-9), W.rating) *
    Math.pow(Math.max(reliability, 1e-9), W.reliability);

  return {
    scores: {
      distance: Math.round(distance * 10000) / 10000,
      freshness: Math.round(freshness * 10000) / 10000,
      repeat_booking: Math.round(repeat_booking * 10000) / 10000,
      rating: Math.round(rating * 10000) / 10000,
      reliability: Math.round(reliability * 10000) / 10000,
      composite: Math.round(composite * 1000000) / 1000000,
    },
    deadhead_miles: Math.round(deadhead * 10) / 10,
    route_miles: Math.round(routeMi * 10) / 10,
  };
}

// ─── Layer 3: Top-K Ranking ─────────────────────────────────────────────────

export function runMatching(load: LoadForMatching, topK: number = DEFAULT_TOP_K): {
  results: MatchResult[];
  rejections: FilterRejection[];
} {
  const carriers = getCarrierProfiles();
  const trucks = getCarrierTrucks();

  console.debug("[match] Load:", { commodity: load.commodity_type, equipment: load.required_equipment_types, temp: [load.required_temp_min, load.required_temp_max], weight: load.weight_lbs, pickup: `${load.pickup_city}, ${load.pickup_state}`, capabilities: load.required_capabilities });
  console.debug(`[match] Loaded ${carriers.length} carriers, ${trucks.length} trucks from sessionStorage`);

  const { eligible, rejections } = applyHardFilters(load, carriers, trucks);

  // Score each (carrier, truck), keep best truck per carrier
  const best = new Map<string, { carrier: CarrierProfile; truck: CarrierTruck; scores: MatchResult["scores"]; deadhead_miles: number; route_miles: number }>();

  for (const c of eligible) {
    for (const t of c._eligible_trucks) {
      const { scores, deadhead_miles, route_miles } = scoreCarrierTruck(c, t, load);
      const prev = best.get(c.id);
      if (!prev || scores.composite > prev.scores.composite) {
        best.set(c.id, { carrier: c, truck: t, scores, deadhead_miles, route_miles });
      }
    }
  }

  // Top-K by composite score
  const ranked = [...best.values()]
    .sort((a, b) => b.scores.composite - a.scores.composite)
    .slice(0, topK)
    .map((item, idx) => ({
      ...item,
      rank: idx + 1,
    }));

  return { results: ranked, rejections };
}

// ─── Helper: Convert load from sessionStorage format to matching format ─────

export function loadToMatchingFormat(storedLoad: {
  id: string;
  origin?: string;
  destination?: string;
  pickupDate?: string;
  commodity?: string;
  temperature?: string;
  equipmentType?: string;
  weightLbs?: string | number;
  distanceMiles?: number;
}): LoadForMatching {
  // Parse city, state from "City, ST" format
  function parseCityState(loc: string): { city: string; state: string } {
    const match = loc.match(/^([^,]+),\s*([A-Z]{2})/);
    if (match) return { city: match[1].trim(), state: match[2].trim() };
    // Fallback — try to split on last comma
    const parts = loc.split(",").map(s => s.trim());
    if (parts.length >= 2) return { city: parts[0], state: parts[parts.length - 1] };
    return { city: loc, state: "" };
  }

  const origin = parseCityState(storedLoad.origin || "Charleston, SC");
  const dest = parseCityState(storedLoad.destination || "Atlanta, GA");

  // Map frontend equipment type to matching equipment types
  const eqMap: Record<string, string[]> = {
    reefer_single: ["reefer_53"],
    reefer_multi: ["reefer_53", "reefer_48"],
    reefer_53: ["reefer_53"],
    reefer_48: ["reefer_48"],
    power_only: ["power_only"],
    dry_van: ["dry_van"],
    flatbed: ["flatbed"],
    step_deck: ["step_deck"],
    tanker: ["tanker"],
    lowboy: ["lowboy"],
    hotshot: ["hotshot"],
    box_truck: ["box_truck"],
  };

  const REEFER_TYPES = ["reefer_single", "reefer_multi"];
  const isReefer = REEFER_TYPES.includes(storedLoad.equipmentType || "");

  // Map frontend commodity names to matching commodity types
  const commodityMap: Record<string, string> = {
    "Strawberries": "produce",
    "Produce": "produce",
    "produce": "produce",
    "Protein": "protein",
    "protein": "protein",
    "Dairy": "dairy",
    "dairy": "dairy",
    "Frozen": "frozen",
    "frozen": "frozen",
    "Pharma": "pharma",
    "pharma": "pharma",
    "Floral": "floral",
    "floral": "floral",
    "Tomatoes": "produce",
    "Lettuce": "produce",
    "Blueberries": "produce",
    "Oranges": "produce",
    "Chicken": "protein",
    "Beef": "protein",
    "Seafood": "protein",
    "Milk": "dairy",
    "Cheese": "dairy",
    "Ice Cream": "frozen",
    "Vaccines": "pharma",
    "Flowers": "floral",
    "Roses": "floral",
  };

  const tempNum = parseInt(storedLoad.temperature || "34", 10);
  // Weight from the form is cargo weight. If left blank, default to 0 (skip payload filter).
  const rawWeight = typeof storedLoad.weightLbs === "number"
    ? storedLoad.weightLbs
    : parseInt(storedLoad.weightLbs || "0", 10) || 0;

  const commodityType = commodityMap[storedLoad.commodity || ""] || (isReefer ? "produce" : "general");
  const needsFoodGrade = isReefer && ["produce", "protein", "dairy", "frozen", "pharma", "floral"].includes(commodityType);

  return {
    id: storedLoad.id,
    broker_id: "b1000000-0000-0000-0000-000000000001", // Default to Broker 1 for demo
    commodity_type: commodityType,
    required_temp_min: isReefer ? tempNum - 3 : null,
    required_temp_max: isReefer ? tempNum + 6 : null,
    required_equipment_types: eqMap[storedLoad.equipmentType || "dry_van"] || ["dry_van"],
    required_trailer_type: storedLoad.equipmentType === "power_only" ? "power_only" : null,
    weight_lbs: rawWeight,
    required_coverage_usd: 750000,
    pickup_city: origin.city,
    pickup_state: origin.state,
    delivery_city: dest.city,
    delivery_state: dest.state,
    pickup_time: storedLoad.pickupDate
      ? new Date(storedLoad.pickupDate + "T14:00:00Z").toISOString()
      : new Date(Date.now() + 24 * 3600000).toISOString(),
    required_capabilities: needsFoodGrade ? ["food_grade_washout"] : [],
    excluded_carrier_ids: [],
  };
}
