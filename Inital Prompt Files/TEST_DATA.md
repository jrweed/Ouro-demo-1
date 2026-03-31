# ColdHaul Test Data

This file defines all seed data for testing the matching algorithm during development. It includes 5 carrier companies (10 trucks each) and 3 broker companies. Accounts are designed to test a range of matching scenarios including hard filter exclusions, haul preference discounts, provisional scoring for new carriers, and repeat booking signals.

Use this data to seed the Supabase database via the Supabase dashboard SQL editor or via a seed script. All UUIDs are fixed so test scenarios are reproducible.

---

## Brokers (3 Accounts)

### Broker 1 — Palmetto Fresh Logistics
```json
{
  "id": "b1000000-0000-0000-0000-000000000001",
  "company_name": "Palmetto Fresh Logistics",
  "contact_name": "Marcus Webb",
  "email": "marcus.webb@palmettofresh.com",
  "phone": "843-555-0101",
  "city": "Charleston",
  "state": "SC",
  "platform_status": "approved",
  "primary_commodity_types": ["produce", "floral"],
  "typical_lanes": [
    "Charleston SC → Atlanta GA",
    "Charleston SC → Charlotte NC",
    "Charleston SC → Miami FL"
  ],
  "typical_load_weight_lbs": 42000,
  "requires_food_grade": true,
  "subscription_tier": "professional",
  "created_at": "2026-01-15T09:00:00Z"
}
```

### Broker 2 — Carolina Cold Chain
```json
{
  "id": "b2000000-0000-0000-0000-000000000002",
  "company_name": "Carolina Cold Chain",
  "contact_name": "Denise Hartley",
  "email": "denise@carolinacoldchain.com",
  "phone": "704-555-0202",
  "city": "Charlotte",
  "state": "NC",
  "platform_status": "approved",
  "primary_commodity_types": ["protein", "dairy", "frozen"],
  "typical_lanes": [
    "Charlotte NC → Jacksonville FL",
    "Charlotte NC → Savannah GA",
    "Charlotte NC → Raleigh NC"
  ],
  "typical_load_weight_lbs": 44000,
  "requires_food_grade": true,
  "subscription_tier": "professional",
  "created_at": "2026-01-20T09:00:00Z"
}
```

### Broker 3 — Sunstate Distribution Partners
```json
{
  "id": "b3000000-0000-0000-0000-000000000003",
  "company_name": "Sunstate Distribution Partners",
  "contact_name": "Ray Fontaine",
  "email": "ray.fontaine@sunstatedist.com",
  "phone": "407-555-0303",
  "city": "Orlando",
  "state": "FL",
  "platform_status": "approved",
  "primary_commodity_types": ["produce", "frozen", "pharma"],
  "typical_lanes": [
    "Miami FL → Atlanta GA",
    "Tampa FL → Charlotte NC",
    "Orlando FL → Columbia SC"
  ],
  "typical_load_weight_lbs": 38000,
  "requires_food_grade": false,
  "subscription_tier": "enterprise",
  "created_at": "2026-02-01T09:00:00Z"
}
```

---

## Carriers (5 Companies, 10 Trucks Each)

### Carrier Company 1 — Blue Ridge Reefer LLC
**Profile:** Established South Carolina carrier, strong produce and dairy background, long-haul preference, high ratings. Has repeat history with Broker 1. Use this carrier to test high match scores on Charleston-origin produce loads.

```json
{
  "id": "c1000000-0000-0000-0000-000000000001",
  "company_name": "Blue Ridge Reefer LLC",
  "contact_name": "Thomas Greer",
  "email": "dispatch@blueridgereefer.com",
  "phone": "864-555-0111",
  "city": "Greenville",
  "state": "SC",
  "domicile_state": "SC",
  "platform_status": "approved",
  "operating_authority_active": true,
  "mc_number": "MC-881234",
  "dot_number": "DOT-3341122",
  "insurance_current": true,
  "insurance_expiry_date": "2027-03-01",
  "insurance_coverage_usd": 1000000,
  "certified_commodity_types": ["produce", "dairy", "floral"],
  "trailer_type": "carrier_owned",
  "haul_preference": "long",
  "capabilities": ["food_grade_washout", "team_drivers_available"],
  "rating": 4.8,
  "total_loads_completed": 312,
  "on_time_pickup_rate": 0.96,
  "on_time_delivery_rate": 0.94,
  "acceptance_rate": 0.88,
  "quick_pay_required": false,
  "created_at": "2026-01-10T08:00:00Z",

  "repeat_booking_history": [
    { "broker_id": "b1000000-0000-0000-0000-000000000001", "completed_loads": 18 },
    { "broker_id": "b2000000-0000-0000-0000-000000000002", "completed_loads": 4 }
  ],

  "lane_history": [
    { "origin_region": "SC", "destination_region": "GA", "runs": 47 },
    { "origin_region": "SC", "destination_region": "NC", "runs": 38 },
    { "origin_region": "SC", "destination_region": "FL", "runs": 29 },
    { "origin_region": "GA", "destination_region": "NC", "runs": 12 }
  ]
}
```

**Trucks (10):**
```json
[
  {
    "id": "t1100000-0000-0000-0000-000000000001",
    "carrier_id": "c1000000-0000-0000-0000-000000000001",
    "unit_number": "BRR-101",
    "equipment_type": "reefer_53",
    "max_payload_lbs": 44000,
    "temp_capability_min": -20,
    "temp_capability_max": 70,
    "current_load_status": "available",
    "current_location_city": "Greenville",
    "current_location_state": "SC",
    "availability_window_start": "2026-03-24T06:00:00Z",
    "availability_window_end": "2026-03-26T18:00:00Z"
  },
  {
    "id": "t1100000-0000-0000-0000-000000000002",
    "carrier_id": "c1000000-0000-0000-0000-000000000001",
    "unit_number": "BRR-102",
    "equipment_type": "reefer_53",
    "max_payload_lbs": 44000,
    "temp_capability_min": -20,
    "temp_capability_max": 70,
    "current_load_status": "on_load",
    "current_location_city": "Columbia",
    "current_location_state": "SC",
    "availability_window_start": "2026-03-25T14:00:00Z",
    "availability_window_end": "2026-03-28T10:00:00Z"
  },
  {
    "id": "t1100000-0000-0000-0000-000000000003",
    "carrier_id": "c1000000-0000-0000-0000-000000000001",
    "unit_number": "BRR-103",
    "equipment_type": "reefer_53",
    "max_payload_lbs": 43500,
    "temp_capability_min": -10,
    "temp_capability_max": 70,
    "current_load_status": "available",
    "current_location_city": "Spartanburg",
    "current_location_state": "SC",
    "availability_window_start": "2026-03-24T08:00:00Z",
    "availability_window_end": "2026-03-27T20:00:00Z"
  },
  {
    "id": "t1100000-0000-0000-0000-000000000004",
    "carrier_id": "c1000000-0000-0000-0000-000000000001",
    "unit_number": "BRR-104",
    "equipment_type": "reefer_48",
    "max_payload_lbs": 42000,
    "temp_capability_min": -20,
    "temp_capability_max": 70,
    "current_load_status": "available",
    "current_location_city": "Anderson",
    "current_location_state": "SC",
    "availability_window_start": "2026-03-24T10:00:00Z",
    "availability_window_end": "2026-03-26T22:00:00Z"
  },
  {
    "id": "t1100000-0000-0000-0000-000000000005",
    "carrier_id": "c1000000-0000-0000-0000-000000000001",
    "unit_number": "BRR-105",
    "equipment_type": "reefer_53",
    "max_payload_lbs": 44000,
    "temp_capability_min": -20,
    "temp_capability_max": 70,
    "current_load_status": "available",
    "current_location_city": "Greenville",
    "current_location_state": "SC",
    "availability_window_start": "2026-03-25T00:00:00Z",
    "availability_window_end": "2026-03-28T00:00:00Z"
  },
  {
    "id": "t1100000-0000-0000-0000-000000000006",
    "carrier_id": "c1000000-0000-0000-0000-000000000001",
    "unit_number": "BRR-106",
    "equipment_type": "reefer_53",
    "max_payload_lbs": 44000,
    "temp_capability_min": -20,
    "temp_capability_max": 70,
    "current_load_status": "available",
    "current_location_city": "Charlotte",
    "current_location_state": "NC",
    "availability_window_start": "2026-03-24T12:00:00Z",
    "availability_window_end": "2026-03-27T12:00:00Z"
  },
  {
    "id": "t1100000-0000-0000-0000-000000000007",
    "carrier_id": "c1000000-0000-0000-0000-000000000001",
    "unit_number": "BRR-107",
    "equipment_type": "reefer_53",
    "max_payload_lbs": 43000,
    "temp_capability_min": -10,
    "temp_capability_max": 70,
    "current_load_status": "available",
    "current_location_city": "Augusta",
    "current_location_state": "GA",
    "availability_window_start": "2026-03-24T06:00:00Z",
    "availability_window_end": "2026-03-25T18:00:00Z"
  },
  {
    "id": "t1100000-0000-0000-0000-000000000008",
    "carrier_id": "c1000000-0000-0000-0000-000000000001",
    "unit_number": "BRR-108",
    "equipment_type": "reefer_53",
    "max_payload_lbs": 44000,
    "temp_capability_min": -20,
    "temp_capability_max": 70,
    "current_load_status": "on_load",
    "current_location_city": "Atlanta",
    "current_location_state": "GA",
    "availability_window_start": "2026-03-26T08:00:00Z",
    "availability_window_end": "2026-03-29T08:00:00Z"
  },
  {
    "id": "t1100000-0000-0000-0000-000000000009",
    "carrier_id": "c1000000-0000-0000-0000-000000000001",
    "unit_number": "BRR-109",
    "equipment_type": "reefer_48",
    "max_payload_lbs": 41000,
    "temp_capability_min": 0,
    "temp_capability_max": 70,
    "current_load_status": "available",
    "current_location_city": "Greenville",
    "current_location_state": "SC",
    "availability_window_start": "2026-03-24T07:00:00Z",
    "availability_window_end": "2026-03-27T07:00:00Z"
  },
  {
    "id": "t1100000-0000-0000-0000-000000000010",
    "carrier_id": "c1000000-0000-0000-0000-000000000001",
    "unit_number": "BRR-110",
    "equipment_type": "reefer_53",
    "max_payload_lbs": 44000,
    "temp_capability_min": -20,
    "temp_capability_max": 70,
    "current_load_status": "available",
    "current_location_city": "Rock Hill",
    "current_location_state": "SC",
    "availability_window_start": "2026-03-24T09:00:00Z",
    "availability_window_end": "2026-03-26T21:00:00Z"
  }
]
```

---

### Carrier Company 2 — Coastal Protein Transport
**Profile:** Georgia-based carrier specialized in protein and frozen freight, power-only operation, short-haul preference. No produce certification. Use this carrier to test commodity hard filter exclusions (produce loads should exclude them) and trailer type matching (power-only loads only).

```json
{
  "id": "c2000000-0000-0000-0000-000000000002",
  "company_name": "Coastal Protein Transport",
  "contact_name": "Leah Simmons",
  "email": "ops@coastalprotein.com",
  "phone": "912-555-0222",
  "city": "Savannah",
  "state": "GA",
  "domicile_state": "GA",
  "platform_status": "approved",
  "operating_authority_active": true,
  "mc_number": "MC-774421",
  "dot_number": "DOT-2298843",
  "insurance_current": true,
  "insurance_expiry_date": "2026-11-15",
  "insurance_coverage_usd": 1000000,
  "certified_commodity_types": ["protein", "frozen", "dairy"],
  "trailer_type": "power_only",
  "haul_preference": "short",
  "capabilities": ["food_grade_washout", "hazmat_certified"],
  "rating": 4.5,
  "total_loads_completed": 187,
  "on_time_pickup_rate": 0.91,
  "on_time_delivery_rate": 0.89,
  "acceptance_rate": 0.82,
  "quick_pay_required": true,
  "created_at": "2026-01-22T08:00:00Z",

  "repeat_booking_history": [
    { "broker_id": "b2000000-0000-0000-0000-000000000002", "completed_loads": 11 }
  ],

  "lane_history": [
    { "origin_region": "GA", "destination_region": "SC", "runs": 34 },
    { "origin_region": "GA", "destination_region": "FL", "runs": 28 },
    { "origin_region": "GA", "destination_region": "NC", "runs": 15 }
  ]
}
```

**Trucks (10):**
```json
[
  { "id": "t2100000-0000-0000-0000-000000000001", "carrier_id": "c2000000-0000-0000-0000-000000000002", "unit_number": "CPT-201", "equipment_type": "power_only", "max_payload_lbs": 45000, "temp_capability_min": -20, "temp_capability_max": 70, "current_load_status": "available", "current_location_city": "Savannah", "current_location_state": "GA", "availability_window_start": "2026-03-24T06:00:00Z", "availability_window_end": "2026-03-26T18:00:00Z" },
  { "id": "t2100000-0000-0000-0000-000000000002", "carrier_id": "c2000000-0000-0000-0000-000000000002", "unit_number": "CPT-202", "equipment_type": "power_only", "max_payload_lbs": 45000, "temp_capability_min": -20, "temp_capability_max": 70, "current_load_status": "available", "current_location_city": "Brunswick", "current_location_state": "GA", "availability_window_start": "2026-03-24T08:00:00Z", "availability_window_end": "2026-03-27T08:00:00Z" },
  { "id": "t2100000-0000-0000-0000-000000000003", "carrier_id": "c2000000-0000-0000-0000-000000000002", "unit_number": "CPT-203", "equipment_type": "power_only", "max_payload_lbs": 45000, "temp_capability_min": -20, "temp_capability_max": 70, "current_load_status": "on_load", "current_location_city": "Jacksonville", "current_location_state": "FL", "availability_window_start": "2026-03-25T10:00:00Z", "availability_window_end": "2026-03-28T10:00:00Z" },
  { "id": "t2100000-0000-0000-0000-000000000004", "carrier_id": "c2000000-0000-0000-0000-000000000002", "unit_number": "CPT-204", "equipment_type": "power_only", "max_payload_lbs": 44000, "temp_capability_min": -20, "temp_capability_max": 70, "current_load_status": "available", "current_location_city": "Savannah", "current_location_state": "GA", "availability_window_start": "2026-03-24T12:00:00Z", "availability_window_end": "2026-03-26T12:00:00Z" },
  { "id": "t2100000-0000-0000-0000-000000000005", "carrier_id": "c2000000-0000-0000-0000-000000000002", "unit_number": "CPT-205", "equipment_type": "power_only", "max_payload_lbs": 45000, "temp_capability_min": -20, "temp_capability_max": 70, "current_load_status": "available", "current_location_city": "Statesboro", "current_location_state": "GA", "availability_window_start": "2026-03-24T07:00:00Z", "availability_window_end": "2026-03-27T19:00:00Z" },
  { "id": "t2100000-0000-0000-0000-000000000006", "carrier_id": "c2000000-0000-0000-0000-000000000002", "unit_number": "CPT-206", "equipment_type": "power_only", "max_payload_lbs": 45000, "temp_capability_min": -20, "temp_capability_max": 70, "current_load_status": "available", "current_location_city": "Savannah", "current_location_state": "GA", "availability_window_start": "2026-03-25T06:00:00Z", "availability_window_end": "2026-03-28T06:00:00Z" },
  { "id": "t2100000-0000-0000-0000-000000000007", "carrier_id": "c2000000-0000-0000-0000-000000000002", "unit_number": "CPT-207", "equipment_type": "power_only", "max_payload_lbs": 43000, "temp_capability_min": -10, "temp_capability_max": 70, "current_load_status": "available", "current_location_city": "Augusta", "current_location_state": "GA", "availability_window_start": "2026-03-24T10:00:00Z", "availability_window_end": "2026-03-26T22:00:00Z" },
  { "id": "t2100000-0000-0000-0000-000000000008", "carrier_id": "c2000000-0000-0000-0000-000000000002", "unit_number": "CPT-208", "equipment_type": "power_only", "max_payload_lbs": 45000, "temp_capability_min": -20, "temp_capability_max": 70, "current_load_status": "on_load", "current_location_city": "Columbia", "current_location_state": "SC", "availability_window_start": "2026-03-26T08:00:00Z", "availability_window_end": "2026-03-29T08:00:00Z" },
  { "id": "t2100000-0000-0000-0000-000000000009", "carrier_id": "c2000000-0000-0000-0000-000000000002", "unit_number": "CPT-209", "equipment_type": "power_only", "max_payload_lbs": 45000, "temp_capability_min": -20, "temp_capability_max": 70, "current_load_status": "available", "current_location_city": "Hinesville", "current_location_state": "GA", "availability_window_start": "2026-03-24T06:00:00Z", "availability_window_end": "2026-03-27T06:00:00Z" },
  { "id": "t2100000-0000-0000-0000-000000000010", "carrier_id": "c2000000-0000-0000-0000-000000000002", "unit_number": "CPT-210", "equipment_type": "power_only", "max_payload_lbs": 45000, "temp_capability_min": -20, "temp_capability_max": 70, "current_load_status": "available", "current_location_city": "Savannah", "current_location_state": "GA", "availability_window_start": "2026-03-24T14:00:00Z", "availability_window_end": "2026-03-28T14:00:00Z" }
]
```

---

### Carrier Company 3 — Sunbelt Cold Haul Inc
**Profile:** Florida-based carrier, all commodity types including pharma, carrier-owned trailers, any haul length, mid-tier rating. No repeat history with any broker yet — new to platform. Use this carrier to test provisional scoring behavior and new carrier cold start weighting.

```json
{
  "id": "c3000000-0000-0000-0000-000000000003",
  "company_name": "Sunbelt Cold Haul Inc",
  "contact_name": "Andre Baptiste",
  "email": "dispatch@sunbeltcoldhaul.com",
  "phone": "305-555-0333",
  "city": "Miami",
  "state": "FL",
  "domicile_state": "FL",
  "platform_status": "approved",
  "operating_authority_active": true,
  "mc_number": "MC-662887",
  "dot_number": "DOT-4412209",
  "insurance_current": true,
  "insurance_expiry_date": "2027-01-31",
  "insurance_coverage_usd": 1000000,
  "certified_commodity_types": ["produce", "protein", "dairy", "frozen", "pharma", "floral"],
  "trailer_type": "carrier_owned",
  "haul_preference": "any",
  "capabilities": ["food_grade_washout", "temp_logging_continuous", "chain_of_custody"],
  "rating": null,
  "total_loads_completed": 0,
  "on_time_pickup_rate": null,
  "on_time_delivery_rate": null,
  "acceptance_rate": null,
  "quick_pay_required": false,
  "created_at": "2026-03-10T08:00:00Z",

  "repeat_booking_history": [],
  "lane_history": []
}
```

**Trucks (10):**
```json
[
  { "id": "t3100000-0000-0000-0000-000000000001", "carrier_id": "c3000000-0000-0000-0000-000000000003", "unit_number": "SBH-301", "equipment_type": "reefer_53", "max_payload_lbs": 44000, "temp_capability_min": -20, "temp_capability_max": 70, "current_load_status": "available", "current_location_city": "Miami", "current_location_state": "FL", "availability_window_start": "2026-03-24T06:00:00Z", "availability_window_end": "2026-03-28T18:00:00Z" },
  { "id": "t3100000-0000-0000-0000-000000000002", "carrier_id": "c3000000-0000-0000-0000-000000000003", "unit_number": "SBH-302", "equipment_type": "reefer_53", "max_payload_lbs": 44000, "temp_capability_min": -20, "temp_capability_max": 70, "current_load_status": "available", "current_location_city": "Fort Lauderdale", "current_location_state": "FL", "availability_window_start": "2026-03-24T08:00:00Z", "availability_window_end": "2026-03-28T08:00:00Z" },
  { "id": "t3100000-0000-0000-0000-000000000003", "carrier_id": "c3000000-0000-0000-0000-000000000003", "unit_number": "SBH-303", "equipment_type": "reefer_53", "max_payload_lbs": 44000, "temp_capability_min": -20, "temp_capability_max": 70, "current_load_status": "available", "current_location_city": "Tampa", "current_location_state": "FL", "availability_window_start": "2026-03-24T10:00:00Z", "availability_window_end": "2026-03-27T10:00:00Z" },
  { "id": "t3100000-0000-0000-0000-000000000004", "carrier_id": "c3000000-0000-0000-0000-000000000003", "unit_number": "SBH-304", "equipment_type": "reefer_53", "max_payload_lbs": 43000, "temp_capability_min": -20, "temp_capability_max": 70, "current_load_status": "available", "current_location_city": "Orlando", "current_location_state": "FL", "availability_window_start": "2026-03-24T06:00:00Z", "availability_window_end": "2026-03-27T06:00:00Z" },
  { "id": "t3100000-0000-0000-0000-000000000005", "carrier_id": "c3000000-0000-0000-0000-000000000003", "unit_number": "SBH-305", "equipment_type": "reefer_53", "max_payload_lbs": 44000, "temp_capability_min": -20, "temp_capability_max": 70, "current_load_status": "available", "current_location_city": "Miami", "current_location_state": "FL", "availability_window_start": "2026-03-25T00:00:00Z", "availability_window_end": "2026-03-28T00:00:00Z" },
  { "id": "t3100000-0000-0000-0000-000000000006", "carrier_id": "c3000000-0000-0000-0000-000000000003", "unit_number": "SBH-306", "equipment_type": "reefer_48", "max_payload_lbs": 42000, "temp_capability_min": -10, "temp_capability_max": 70, "current_load_status": "available", "current_location_city": "Jacksonville", "current_location_state": "FL", "availability_window_start": "2026-03-24T12:00:00Z", "availability_window_end": "2026-03-27T12:00:00Z" },
  { "id": "t3100000-0000-0000-0000-000000000007", "carrier_id": "c3000000-0000-0000-0000-000000000003", "unit_number": "SBH-307", "equipment_type": "reefer_53", "max_payload_lbs": 44000, "temp_capability_min": -20, "temp_capability_max": 70, "current_load_status": "available", "current_location_city": "Gainesville", "current_location_state": "FL", "availability_window_start": "2026-03-24T08:00:00Z", "availability_window_end": "2026-03-28T08:00:00Z" },
  { "id": "t3100000-0000-0000-0000-000000000008", "carrier_id": "c3000000-0000-0000-0000-000000000003", "unit_number": "SBH-308", "equipment_type": "reefer_53", "max_payload_lbs": 44000, "temp_capability_min": -20, "temp_capability_max": 70, "current_load_status": "available", "current_location_city": "Miami", "current_location_state": "FL", "availability_window_start": "2026-03-24T06:00:00Z", "availability_window_end": "2026-03-26T18:00:00Z" },
  { "id": "t3100000-0000-0000-0000-000000000009", "carrier_id": "c3000000-0000-0000-0000-000000000003", "unit_number": "SBH-309", "equipment_type": "reefer_53", "max_payload_lbs": 44000, "temp_capability_min": -20, "temp_capability_max": 70, "current_load_status": "available", "current_location_city": "Boca Raton", "current_location_state": "FL", "availability_window_start": "2026-03-24T07:00:00Z", "availability_window_end": "2026-03-28T07:00:00Z" },
  { "id": "t3100000-0000-0000-0000-000000000010", "carrier_id": "c3000000-0000-0000-0000-000000000003", "unit_number": "SBH-310", "equipment_type": "reefer_53", "max_payload_lbs": 44000, "temp_capability_min": -20, "temp_capability_max": 70, "current_load_status": "available", "current_location_city": "Tallahassee", "current_location_state": "FL", "availability_window_start": "2026-03-24T10:00:00Z", "availability_window_end": "2026-03-27T22:00:00Z" }
]
```

---

### Carrier Company 4 — Piedmont Express Refrigerated
**Profile:** North Carolina carrier, produce and dairy only, carrier-owned, strong short-haul preference, solid rating and reliability. Insurance expires soon — use one truck to test expired insurance hard filter by setting one truck's carrier profile to `insurance_current: false`. Has moderate repeat history with Broker 2.

```json
{
  "id": "c4000000-0000-0000-0000-000000000004",
  "company_name": "Piedmont Express Refrigerated",
  "contact_name": "Sandra Bowen",
  "email": "sandra@piedmontexpress.com",
  "phone": "336-555-0444",
  "city": "Greensboro",
  "state": "NC",
  "domicile_state": "NC",
  "platform_status": "approved",
  "operating_authority_active": true,
  "mc_number": "MC-553312",
  "dot_number": "DOT-1987654",
  "insurance_current": true,
  "insurance_expiry_date": "2026-05-01",
  "insurance_coverage_usd": 750000,
  "certified_commodity_types": ["produce", "dairy", "floral"],
  "trailer_type": "carrier_owned",
  "haul_preference": "short",
  "capabilities": ["food_grade_washout"],
  "rating": 4.3,
  "total_loads_completed": 94,
  "on_time_pickup_rate": 0.88,
  "on_time_delivery_rate": 0.86,
  "acceptance_rate": 0.79,
  "quick_pay_required": false,
  "created_at": "2026-02-05T08:00:00Z",

  "repeat_booking_history": [
    { "broker_id": "b2000000-0000-0000-0000-000000000002", "completed_loads": 7 }
  ],

  "lane_history": [
    { "origin_region": "NC", "destination_region": "SC", "runs": 28 },
    { "origin_region": "NC", "destination_region": "GA", "runs": 19 },
    { "origin_region": "NC", "destination_region": "VA", "runs": 11 }
  ]
}
```

**Trucks (10):**
```json
[
  { "id": "t4100000-0000-0000-0000-000000000001", "carrier_id": "c4000000-0000-0000-0000-000000000004", "unit_number": "PER-401", "equipment_type": "reefer_53", "max_payload_lbs": 44000, "temp_capability_min": -10, "temp_capability_max": 70, "current_load_status": "available", "current_location_city": "Greensboro", "current_location_state": "NC", "availability_window_start": "2026-03-24T07:00:00Z", "availability_window_end": "2026-03-27T19:00:00Z" },
  { "id": "t4100000-0000-0000-0000-000000000002", "carrier_id": "c4000000-0000-0000-0000-000000000004", "unit_number": "PER-402", "equipment_type": "reefer_53", "max_payload_lbs": 44000, "temp_capability_min": -10, "temp_capability_max": 70, "current_load_status": "available", "current_location_city": "Charlotte", "current_location_state": "NC", "availability_window_start": "2026-03-24T09:00:00Z", "availability_window_end": "2026-03-26T21:00:00Z" },
  { "id": "t4100000-0000-0000-0000-000000000003", "carrier_id": "c4000000-0000-0000-0000-000000000004", "unit_number": "PER-403", "equipment_type": "reefer_48", "max_payload_lbs": 42000, "temp_capability_min": 0, "temp_capability_max": 70, "current_load_status": "on_load", "current_location_city": "Columbia", "current_location_state": "SC", "availability_window_start": "2026-03-25T16:00:00Z", "availability_window_end": "2026-03-28T16:00:00Z" },
  { "id": "t4100000-0000-0000-0000-000000000004", "carrier_id": "c4000000-0000-0000-0000-000000000004", "unit_number": "PER-404", "equipment_type": "reefer_53", "max_payload_lbs": 43000, "temp_capability_min": -10, "temp_capability_max": 70, "current_load_status": "available", "current_location_city": "Winston-Salem", "current_location_state": "NC", "availability_window_start": "2026-03-24T08:00:00Z", "availability_window_end": "2026-03-27T08:00:00Z" },
  { "id": "t4100000-0000-0000-0000-000000000005", "carrier_id": "c4000000-0000-0000-0000-000000000004", "unit_number": "PER-405", "equipment_type": "reefer_53", "max_payload_lbs": 44000, "temp_capability_min": -10, "temp_capability_max": 70, "current_load_status": "available", "current_location_city": "Durham", "current_location_state": "NC", "availability_window_start": "2026-03-24T10:00:00Z", "availability_window_end": "2026-03-26T22:00:00Z" },
  { "id": "t4100000-0000-0000-0000-000000000006", "carrier_id": "c4000000-0000-0000-0000-000000000004", "unit_number": "PER-406", "equipment_type": "reefer_53", "max_payload_lbs": 44000, "temp_capability_min": -10, "temp_capability_max": 70, "current_load_status": "available", "current_location_city": "Greensboro", "current_location_state": "NC", "availability_window_start": "2026-03-25T06:00:00Z", "availability_window_end": "2026-03-28T06:00:00Z" },
  { "id": "t4100000-0000-0000-0000-000000000007", "carrier_id": "c4000000-0000-0000-0000-000000000004", "unit_number": "PER-407", "equipment_type": "reefer_53", "max_payload_lbs": 44000, "temp_capability_min": -10, "temp_capability_max": 70, "current_load_status": "available", "current_location_city": "Raleigh", "current_location_state": "NC", "availability_window_start": "2026-03-24T11:00:00Z", "availability_window_end": "2026-03-27T11:00:00Z" },
  { "id": "t4100000-0000-0000-0000-000000000008", "carrier_id": "c4000000-0000-0000-0000-000000000004", "unit_number": "PER-408", "equipment_type": "reefer_53", "max_payload_lbs": 44000, "temp_capability_min": -10, "temp_capability_max": 70, "current_load_status": "available", "current_location_city": "Fayetteville", "current_location_state": "NC", "availability_window_start": "2026-03-24T07:00:00Z", "availability_window_end": "2026-03-27T07:00:00Z" },
  {
    "id": "t4100000-0000-0000-0000-000000000009",
    "carrier_id": "c4000000-0000-0000-0000-000000000004",
    "unit_number": "PER-409",
    "equipment_type": "reefer_53",
    "max_payload_lbs": 44000,
    "temp_capability_min": -10,
    "temp_capability_max": 70,
    "current_load_status": "available",
    "current_location_city": "Greensboro",
    "current_location_state": "NC",
    "availability_window_start": "2026-03-24T06:00:00Z",
    "availability_window_end": "2026-03-27T18:00:00Z",
    "_test_note": "Use this truck to test expired insurance hard filter — override carrier insurance_current to false for this unit in your test scenario"
  },
  { "id": "t4100000-0000-0000-0000-000000000010", "carrier_id": "c4000000-0000-0000-0000-000000000004", "unit_number": "PER-410", "equipment_type": "reefer_48", "max_payload_lbs": 41000, "temp_capability_min": 0, "temp_capability_max": 70, "current_load_status": "available", "current_location_city": "Asheville", "current_location_state": "NC", "availability_window_start": "2026-03-24T09:00:00Z", "availability_window_end": "2026-03-27T21:00:00Z" }
]
```

---

### Carrier Company 5 — Magnolia Freight Solutions
**Profile:** Multi-state carrier (GA/FL), carrier-owned, all haul lengths, mid-low rating, low reliability scores, pending platform status on two trucks. Use this carrier to test: (1) low reliability suppressing score despite proximity, (2) `platform_status = 'suspended'` blocking a carrier entirely regardless of other factors.

```json
{
  "id": "c5000000-0000-0000-0000-000000000005",
  "company_name": "Magnolia Freight Solutions",
  "contact_name": "Calvin Pruett",
  "email": "calvin@magnoliafreight.com",
  "phone": "229-555-0555",
  "city": "Albany",
  "state": "GA",
  "domicile_state": "GA",
  "platform_status": "approved",
  "operating_authority_active": true,
  "mc_number": "MC-441098",
  "dot_number": "DOT-5523310",
  "insurance_current": true,
  "insurance_expiry_date": "2026-12-01",
  "insurance_coverage_usd": 1000000,
  "certified_commodity_types": ["produce", "protein", "frozen"],
  "trailer_type": "both",
  "haul_preference": "any",
  "capabilities": ["food_grade_washout"],
  "rating": 3.6,
  "total_loads_completed": 41,
  "on_time_pickup_rate": 0.74,
  "on_time_delivery_rate": 0.71,
  "acceptance_rate": 0.65,
  "quick_pay_required": true,
  "created_at": "2026-02-18T08:00:00Z",

  "repeat_booking_history": [
    { "broker_id": "b3000000-0000-0000-0000-000000000003", "completed_loads": 3 }
  ],

  "lane_history": [
    { "origin_region": "GA", "destination_region": "FL", "runs": 14 },
    { "origin_region": "GA", "destination_region": "SC", "runs": 9 },
    { "origin_region": "FL", "destination_region": "GA", "runs": 8 }
  ]
}
```

**Trucks (10):**
```json
[
  { "id": "t5100000-0000-0000-0000-000000000001", "carrier_id": "c5000000-0000-0000-0000-000000000005", "unit_number": "MFS-501", "equipment_type": "reefer_53", "max_payload_lbs": 44000, "temp_capability_min": -20, "temp_capability_max": 70, "current_load_status": "available", "current_location_city": "Albany", "current_location_state": "GA", "availability_window_start": "2026-03-24T06:00:00Z", "availability_window_end": "2026-03-27T18:00:00Z" },
  { "id": "t5100000-0000-0000-0000-000000000002", "carrier_id": "c5000000-0000-0000-0000-000000000005", "unit_number": "MFS-502", "equipment_type": "reefer_53", "max_payload_lbs": 44000, "temp_capability_min": -20, "temp_capability_max": 70, "current_load_status": "available", "current_location_city": "Valdosta", "current_location_state": "GA", "availability_window_start": "2026-03-24T08:00:00Z", "availability_window_end": "2026-03-27T08:00:00Z" },
  { "id": "t5100000-0000-0000-0000-000000000003", "carrier_id": "c5000000-0000-0000-0000-000000000005", "unit_number": "MFS-503", "equipment_type": "reefer_53", "max_payload_lbs": 44000, "temp_capability_min": -20, "temp_capability_max": 70, "current_load_status": "available", "current_location_city": "Macon", "current_location_state": "GA", "availability_window_start": "2026-03-24T10:00:00Z", "availability_window_end": "2026-03-26T22:00:00Z" },
  { "id": "t5100000-0000-0000-0000-000000000004", "carrier_id": "c5000000-0000-0000-0000-000000000005", "unit_number": "MFS-504", "equipment_type": "power_only", "max_payload_lbs": 45000, "temp_capability_min": -20, "temp_capability_max": 70, "current_load_status": "on_load", "current_location_city": "Tallahassee", "current_location_state": "FL", "availability_window_start": "2026-03-25T12:00:00Z", "availability_window_end": "2026-03-28T12:00:00Z" },
  { "id": "t5100000-0000-0000-0000-000000000005", "carrier_id": "c5000000-0000-0000-0000-000000000005", "unit_number": "MFS-505", "equipment_type": "reefer_53", "max_payload_lbs": 42000, "temp_capability_min": -10, "temp_capability_max": 70, "current_load_status": "available", "current_location_city": "Albany", "current_location_state": "GA", "availability_window_start": "2026-03-24T06:00:00Z", "availability_window_end": "2026-03-26T18:00:00Z" },
  { "id": "t5100000-0000-0000-0000-000000000006", "carrier_id": "c5000000-0000-0000-0000-000000000005", "unit_number": "MFS-506", "equipment_type": "reefer_53", "max_payload_lbs": 44000, "temp_capability_min": -20, "temp_capability_max": 70, "current_load_status": "available", "current_location_city": "Columbus", "current_location_state": "GA", "availability_window_start": "2026-03-24T12:00:00Z", "availability_window_end": "2026-03-27T12:00:00Z" },
  {
    "id": "t5100000-0000-0000-0000-000000000007",
    "carrier_id": "c5000000-0000-0000-0000-000000000005",
    "unit_number": "MFS-507",
    "equipment_type": "reefer_53",
    "max_payload_lbs": 44000,
    "temp_capability_min": -20,
    "temp_capability_max": 70,
    "current_load_status": "available",
    "current_location_city": "Albany",
    "current_location_state": "GA",
    "availability_window_start": "2026-03-24T08:00:00Z",
    "availability_window_end": "2026-03-27T20:00:00Z",
    "_test_note": "Use this truck to test suspended platform status — set carrier platform_status to 'suspended' in this scenario. Truck should be completely blocked regardless of all other qualifying factors."
  },
  { "id": "t5100000-0000-0000-0000-000000000008", "carrier_id": "c5000000-0000-0000-0000-000000000005", "unit_number": "MFS-508", "equipment_type": "reefer_48", "max_payload_lbs": 41000, "temp_capability_min": 0, "temp_capability_max": 70, "current_load_status": "available", "current_location_city": "Dothan", "current_location_state": "GA", "availability_window_start": "2026-03-24T09:00:00Z", "availability_window_end": "2026-03-27T09:00:00Z" },
  { "id": "t5100000-0000-0000-0000-000000000009", "carrier_id": "c5000000-0000-0000-0000-000000000005", "unit_number": "MFS-509", "equipment_type": "reefer_53", "max_payload_lbs": 44000, "temp_capability_min": -20, "temp_capability_max": 70, "current_load_status": "available", "current_location_city": "Thomasville", "current_location_state": "GA", "availability_window_start": "2026-03-24T07:00:00Z", "availability_window_end": "2026-03-28T07:00:00Z" },
  { "id": "t5100000-0000-0000-0000-000000000010", "carrier_id": "c5000000-0000-0000-0000-000000000005", "unit_number": "MFS-510", "equipment_type": "reefer_53", "max_payload_lbs": 44000, "temp_capability_min": -20, "temp_capability_max": 70, "current_load_status": "on_load", "current_location_city": "Atlanta", "current_location_state": "GA", "availability_window_start": "2026-03-26T10:00:00Z", "availability_window_end": "2026-03-29T10:00:00Z" }
]
```

---

## Test Scenarios

Use these pre-defined loads to validate specific algorithm behaviors. Each scenario is designed to produce a predictable outcome that confirms the algorithm is working correctly.

### Scenario 1 — Happy Path: High Coverage Produce Load
**Expected result:** Blue Ridge Reefer (C1) surfaces as rank 1. Coastal Protein (C2) excluded by commodity filter. Magnolia (C5) surfaces but ranks low due to poor reliability and rating scores.

```json
{
  "id": "load-test-0000-0000-0000-000000000001",
  "broker_id": "b1000000-0000-0000-0000-000000000001",
  "commodity_type": "produce",
  "required_temp_min": 34,
  "required_temp_max": 40,
  "required_equipment_types": ["reefer_53"],
  "required_trailer_type": null,
  "weight_lbs": 41000,
  "required_coverage_usd": 750000,
  "pickup_location": { "city": "Charleston", "state": "SC" },
  "delivery_location": { "city": "Atlanta", "state": "GA" },
  "pickup_time": "2026-03-24T14:00:00Z",
  "required_capabilities": ["food_grade_washout"],
  "excluded_carrier_ids": []
}
```

### Scenario 2 — Power Only Load
**Expected result:** Only Coastal Protein (C2, power_only) and Magnolia (C5, both) pass trailer type filter. Blue Ridge (C1), Sunbelt (C3), Piedmont (C4) all excluded by trailer type hard filter.

```json
{
  "id": "load-test-0000-0000-0000-000000000002",
  "broker_id": "b2000000-0000-0000-0000-000000000002",
  "commodity_type": "protein",
  "required_temp_min": 28,
  "required_temp_max": 34,
  "required_equipment_types": ["power_only"],
  "required_trailer_type": "power_only",
  "weight_lbs": 43000,
  "required_coverage_usd": 750000,
  "pickup_location": { "city": "Savannah", "state": "GA" },
  "delivery_location": { "city": "Charlotte", "state": "NC" },
  "pickup_time": "2026-03-25T08:00:00Z",
  "required_capabilities": [],
  "excluded_carrier_ids": []
}
```

### Scenario 3 — Pharma Load (Hard Filter Test)
**Expected result:** Only Sunbelt (C3) passes commodity filter — they are the only carrier with `pharma` certification. All other carriers excluded by commodity hard filter.

```json
{
  "id": "load-test-0000-0000-0000-000000000003",
  "broker_id": "b3000000-0000-0000-0000-000000000003",
  "commodity_type": "pharma",
  "required_temp_min": 36,
  "required_temp_max": 46,
  "required_equipment_types": ["reefer_53"],
  "required_trailer_type": null,
  "weight_lbs": 28000,
  "required_coverage_usd": 1000000,
  "pickup_location": { "city": "Miami", "state": "FL" },
  "delivery_location": { "city": "Atlanta", "state": "GA" },
  "pickup_time": "2026-03-25T10:00:00Z",
  "required_capabilities": ["temp_logging_continuous", "chain_of_custody"],
  "excluded_carrier_ids": []
}
```

### Scenario 4 — Overweight Load (Payload Filter Test)
**Expected result:** All trucks with `max_payload_lbs < 45000` excluded. Only trucks rated at exactly 45000 lbs pass — primarily Coastal Protein power-only trucks. Confirms payload hard filter is working.

```json
{
  "id": "load-test-0000-0000-0000-000000000004",
  "broker_id": "b2000000-0000-0000-0000-000000000002",
  "commodity_type": "frozen",
  "required_temp_min": -10,
  "required_temp_max": 0,
  "required_equipment_types": ["reefer_53", "power_only"],
  "required_trailer_type": null,
  "weight_lbs": 44500,
  "required_coverage_usd": 750000,
  "pickup_location": { "city": "Charlotte", "state": "NC" },
  "delivery_location": { "city": "Jacksonville", "state": "FL" },
  "pickup_time": "2026-03-26T06:00:00Z",
  "required_capabilities": [],
  "excluded_carrier_ids": []
}
```

### Scenario 5 — New Carrier Provisional Scoring Test
**Expected result:** Sunbelt (C3) is eligible (FL origin, correct commodity, carrier-owned) but provisional scores (rating 0.6, reliability 0.65, repeat_booking 0.30) should rank them below established carriers with real history. Confirms new carriers surface but don't dominate rankings.

```json
{
  "id": "load-test-0000-0000-0000-000000000005",
  "broker_id": "b3000000-0000-0000-0000-000000000003",
  "commodity_type": "produce",
  "required_temp_min": 34,
  "required_temp_max": 45,
  "required_equipment_types": ["reefer_53"],
  "required_trailer_type": null,
  "weight_lbs": 38000,
  "required_coverage_usd": 750000,
  "pickup_location": { "city": "Miami", "state": "FL" },
  "delivery_location": { "city": "Columbia", "state": "SC" },
  "pickup_time": "2026-03-26T12:00:00Z",
  "required_capabilities": ["food_grade_washout"],
  "excluded_carrier_ids": []
}
```
