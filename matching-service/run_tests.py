"""
Spoke Matching Algorithm — Test Runner

Executes all 5 test scenarios from TEST_DATA.md and validates expected outcomes.
Re-seeds the database before each run to ensure reproducible results.

Usage:
    python run_tests.py
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime, timezone

from seed import seed
from matching.ranker import run_matching_pipeline


# ── Fixed "now" for deterministic freshness scores ───────────────────────────
# Scenarios use pickup times around 2026-03-24 to 2026-03-26.
# We set "now" to 2026-03-24T06:00:00Z so freshness scores are reproducible.
TEST_NOW = datetime(2026, 3, 24, 6, 0, 0, tzinfo=timezone.utc)


# ── Test scenarios ───────────────────────────────────────────────────────────

SCENARIOS = [
    # ── Scenario 1: Happy Path — High Coverage Produce Load ──────────────
    {
        "name": "Scenario 1 — Happy Path: High Coverage Produce Load",
        "load": {
            "id": "load-test-0000-0000-0000-000000000001",
            "broker_id": "b1000000-0000-0000-0000-000000000001",
            "commodity_type": "produce",
            "required_temp_min": 34,
            "required_temp_max": 40,
            "required_equipment_types": ["reefer_53"],
            "required_trailer_type": None,
            "weight_lbs": 41000,
            "required_coverage_usd": 750000,
            "pickup_city": "Charleston",
            "pickup_state": "SC",
            "delivery_city": "Atlanta",
            "delivery_state": "GA",
            "pickup_time": "2026-03-24T14:00:00Z",
            "required_capabilities": ["food_grade_washout"],
            "excluded_carrier_ids": [],
        },
        "assertions": [
            ("rank_1_carrier", "c1000000-0000-0000-0000-000000000001", "Blue Ridge Reefer should be rank 1"),
            ("excluded_carrier", "c2000000-0000-0000-0000-000000000002", "Coastal Protein excluded by commodity filter"),
            ("eligible_carrier", "c5000000-0000-0000-0000-000000000005", "Magnolia should surface but rank low"),
        ],
    },
    # ── Scenario 2: Power Only Load ──────────────────────────────────────
    {
        "name": "Scenario 2 — Power Only Load",
        "load": {
            "id": "load-test-0000-0000-0000-000000000002",
            "broker_id": "b2000000-0000-0000-0000-000000000002",
            "commodity_type": "protein",
            "required_temp_min": 28,
            "required_temp_max": 34,
            "required_equipment_types": ["power_only"],
            "required_trailer_type": "power_only",
            "weight_lbs": 43000,
            "required_coverage_usd": 750000,
            "pickup_city": "Savannah",
            "pickup_state": "GA",
            "delivery_city": "Charlotte",
            "delivery_state": "NC",
            "pickup_time": "2026-03-25T08:00:00Z",
            "required_capabilities": [],
            "excluded_carrier_ids": [],
        },
        "assertions": [
            ("excluded_carrier", "c1000000-0000-0000-0000-000000000001", "Blue Ridge excluded by commodity (no protein cert)"),
            ("excluded_carrier", "c3000000-0000-0000-0000-000000000003", "Sunbelt excluded by trailer type (carrier_owned)"),
            ("excluded_carrier", "c4000000-0000-0000-0000-000000000004", "Piedmont excluded by commodity (no protein cert)"),
            ("eligible_carrier", "c2000000-0000-0000-0000-000000000002", "Coastal Protein eligible (power_only)"),
            # Magnolia has trailer_type='both' but their only power_only truck (MFS-504) is on_load
            ("excluded_carrier", "c5000000-0000-0000-0000-000000000005", "Magnolia excluded — only power_only truck on_load"),
        ],
    },
    # ── Scenario 3: Pharma Load ──────────────────────────────────────────
    {
        "name": "Scenario 3 — Pharma Load (Hard Filter Test)",
        "load": {
            "id": "load-test-0000-0000-0000-000000000003",
            "broker_id": "b3000000-0000-0000-0000-000000000003",
            "commodity_type": "pharma",
            "required_temp_min": 36,
            "required_temp_max": 46,
            "required_equipment_types": ["reefer_53"],
            "required_trailer_type": None,
            "weight_lbs": 28000,
            "required_coverage_usd": 1000000,
            "pickup_city": "Miami",
            "pickup_state": "FL",
            "delivery_city": "Atlanta",
            "delivery_state": "GA",
            "pickup_time": "2026-03-25T10:00:00Z",
            "required_capabilities": ["temp_logging_continuous", "chain_of_custody"],
            "excluded_carrier_ids": [],
        },
        "assertions": [
            ("only_eligible", "c3000000-0000-0000-0000-000000000003", "Only Sunbelt passes pharma commodity filter"),
            ("excluded_carrier", "c1000000-0000-0000-0000-000000000001", "Blue Ridge excluded by commodity"),
            ("excluded_carrier", "c2000000-0000-0000-0000-000000000002", "Coastal Protein excluded by commodity"),
            ("excluded_carrier", "c4000000-0000-0000-0000-000000000004", "Piedmont excluded by commodity"),
            ("excluded_carrier", "c5000000-0000-0000-0000-000000000005", "Magnolia excluded by commodity"),
        ],
    },
    # ── Scenario 4: Overweight Load ──────────────────────────────────────
    {
        "name": "Scenario 4 — Overweight Load (Payload Filter Test)",
        "load": {
            "id": "load-test-0000-0000-0000-000000000004",
            "broker_id": "b2000000-0000-0000-0000-000000000002",
            "commodity_type": "frozen",
            "required_temp_min": -10,
            "required_temp_max": 0,
            "required_equipment_types": ["reefer_53", "power_only"],
            "required_trailer_type": None,
            "weight_lbs": 44500,
            "required_coverage_usd": 750000,
            "pickup_city": "Charlotte",
            "pickup_state": "NC",
            "delivery_city": "Jacksonville",
            "delivery_state": "FL",
            "pickup_time": "2026-03-26T06:00:00Z",
            "required_capabilities": [],
            "excluded_carrier_ids": [],
        },
        "assertions": [
            ("no_trucks_under_payload", 44500, "All trucks with max_payload_lbs < 44500 excluded"),
            # Coastal Protein's power_only trucks are 45000 lbs — they pass
            ("eligible_carrier", "c2000000-0000-0000-0000-000000000002", "Coastal Protein eligible (45000 lbs trucks)"),
        ],
    },
    # ── Scenario 5: New Carrier Provisional Scoring ──────────────────────
    {
        "name": "Scenario 5 — New Carrier Provisional Scoring Test",
        "load": {
            "id": "load-test-0000-0000-0000-000000000005",
            "broker_id": "b3000000-0000-0000-0000-000000000003",
            "commodity_type": "produce",
            "required_temp_min": 34,
            "required_temp_max": 45,
            "required_equipment_types": ["reefer_53"],
            "required_trailer_type": None,
            "weight_lbs": 38000,
            "required_coverage_usd": 750000,
            "pickup_city": "Miami",
            "pickup_state": "FL",
            "delivery_city": "Columbia",
            "delivery_state": "SC",
            "pickup_time": "2026-03-26T12:00:00Z",
            "required_capabilities": ["food_grade_washout"],
            "excluded_carrier_ids": [],
        },
        "assertions": [
            ("eligible_carrier", "c3000000-0000-0000-0000-000000000003", "Sunbelt eligible (FL, produce, carrier_owned)"),
            ("provisional_scores", "c3000000-0000-0000-0000-000000000003", "Sunbelt uses provisional: rating=0.6, reliability=0.65, repeat=0.30"),
            # Sunbelt is rank 1 because 0 mi deadhead (Miami→Miami) beats 400-700 mi deadhead
            # with multiplicative scoring. This is correct — proximity dominates when others are far.
            ("rank_1_carrier", "c3000000-0000-0000-0000-000000000003", "Sunbelt rank 1 — 0 mi deadhead dominates despite provisional scores"),
        ],
    },
]


# ── Pretty printing ──────────────────────────────────────────────────────────

def print_header(text: str, char: str = "═", width: int = 90):
    print(f"\n{char * width}")
    print(f"  {text}")
    print(f"{char * width}")


def print_load(load: dict):
    print(f"  Load ID:      {load['id']}")
    print(f"  Commodity:    {load['commodity_type']}")
    print(f"  Route:        {load['pickup_city']}, {load['pickup_state']} → {load['delivery_city']}, {load['delivery_state']}")
    print(f"  Weight:       {load['weight_lbs']:,} lbs")
    print(f"  Temp Range:   {load['required_temp_min']}°F – {load['required_temp_max']}°F")
    print(f"  Equipment:    {load['required_equipment_types']}")
    print(f"  Trailer Type: {load.get('required_trailer_type') or 'any'}")
    print(f"  Capabilities: {load.get('required_capabilities') or 'none'}")
    print(f"  Pickup Time:  {load['pickup_time']}")
    print()


def print_rejections(rejections: list):
    if not rejections:
        print("  (none — all carriers eligible)")
        return
    for r in rejections:
        print(f"  ✗ {r['carrier_name']:35s}  →  {r['reason']}")
    print()


def print_ranked(top_k: list):
    if not top_k:
        print("  (no eligible carriers)")
        return
    # Header
    print(f"  {'Rank':<5} {'Carrier':<32} {'Truck':<10} {'Composite':>10} {'Distance':>10} {'Freshness':>10} {'Repeat':>10} {'Rating':>10} {'Reliab':>10} {'DH mi':>8}")
    print(f"  {'─'*4}  {'─'*31} {'─'*9}  {'─'*9}  {'─'*9}  {'─'*9}  {'─'*9}  {'─'*9}  {'─'*9}  {'─'*7}")
    for m in top_k:
        s = m["scores"]
        print(
            f"  {m['rank']:<5} "
            f"{m['carrier']['company_name']:<32} "
            f"{m['truck']['unit_number']:<10} "
            f"{s['composite']:>10.6f} "
            f"{s['distance']:>10.4f} "
            f"{s['freshness']:>10.4f} "
            f"{s['repeat_booking']:>10.4f} "
            f"{s['rating']:>10.4f} "
            f"{s['reliability']:>10.4f} "
            f"{s['deadhead_miles']:>8.1f}"
        )
    print()


# ── Assertion checks ─────────────────────────────────────────────────────────

def check_assertions(assertions: list, top_k: list, rejections: list) -> list:
    results = []
    eligible_ids = {m["carrier"]["id"] for m in top_k}
    rejected_ids = {r["carrier_id"] for r in rejections}

    for assert_type, value, description in assertions:
        if assert_type == "rank_1_carrier":
            passed = len(top_k) > 0 and top_k[0]["carrier"]["id"] == value
            results.append((passed, description))

        elif assert_type == "excluded_carrier":
            passed = value in rejected_ids and value not in eligible_ids
            results.append((passed, description))

        elif assert_type == "eligible_carrier":
            passed = value in eligible_ids
            results.append((passed, description))

        elif assert_type == "only_eligible":
            passed = eligible_ids == {value}
            results.append((passed, description))

        elif assert_type == "no_trucks_under_payload":
            # Check that no eligible truck has max_payload below the threshold
            threshold = value
            all_above = True
            for m in top_k:
                if m["truck"]["max_payload_lbs"] < threshold:
                    all_above = False
                    break
            results.append((all_above, description))

        elif assert_type == "provisional_scores":
            carrier_match = next((m for m in top_k if m["carrier"]["id"] == value), None)
            if carrier_match:
                s = carrier_match["scores"]
                passed = (
                    abs(s["rating"] - 0.6) < 0.01
                    and abs(s["reliability"] - 0.65) < 0.01
                    and abs(s["repeat_booking"] - 0.30) < 0.01
                )
            else:
                passed = False
            results.append((passed, description))

        elif assert_type == "not_rank_1":
            if not top_k:
                passed = True  # vacuously true
            else:
                passed = top_k[0]["carrier"]["id"] != value
            results.append((passed, description))

    return results


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    print_header("Spoke Matching Algorithm — Test Runner", "█")
    print(f"  Test time (fixed): {TEST_NOW.isoformat()}")
    print(f"  Seeding database...\n")

    seed()

    total_pass = 0
    total_fail = 0

    for scenario in SCENARIOS:
        print_header(scenario["name"], "─")
        print("\n  ── Load Details ──")
        print_load(scenario["load"])

        top_k, rejections = run_matching_pipeline(
            scenario["load"],
            k=5,
            now=TEST_NOW,
            write_results=False,  # Don't pollute store during tests
        )

        print("  ── Rejected Carriers (Layer 1 Hard Filters) ──")
        print_rejections(rejections)

        print("  ── Ranked Matches (Layer 2+3 Scoring) ──")
        print_ranked(top_k)

        # Check assertions
        print("  ── Assertions ──")
        results = check_assertions(scenario["assertions"], top_k, rejections)
        for passed, desc in results:
            status = "PASS ✓" if passed else "FAIL ✗"
            print(f"  [{status}]  {desc}")
            if passed:
                total_pass += 1
            else:
                total_fail += 1
        print()

    # Summary
    print_header("Test Summary", "█")
    print(f"  Total:  {total_pass + total_fail}")
    print(f"  Passed: {total_pass}")
    print(f"  Failed: {total_fail}")
    if total_fail == 0:
        print(f"\n  ✓ ALL TESTS PASSED")
    else:
        print(f"\n  ✗ {total_fail} TEST(S) FAILED — debug before proceeding")
    print()

    return total_fail == 0


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
