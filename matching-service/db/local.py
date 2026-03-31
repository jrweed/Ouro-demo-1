"""
Local JSON-backed data store for development without Supabase.

Mimics the Supabase client interface so the matching algorithm code
stays identical when swapping to a live database.

TODO(supabase): Replace this module with a real Supabase client in db/client.py
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

from config import DATA_STORE_PATH
from models import Broker, Carrier, Load, Truck


# ── Store file I/O ───────────────────────────────────────────────────────────

def _empty_store() -> Dict[str, List[dict]]:
    return {
        "brokers": [],
        "carriers": [],
        "trucks": [],
        "loads": [],
        "carrier_availability": [],
        "match_notifications": [],
        "match_events": [],
        "load_outcomes": [],
        "repeat_booking_history": [],
        "lane_history": [],
    }


def load_store() -> Dict[str, List[dict]]:
    if not os.path.exists(DATA_STORE_PATH):
        return _empty_store()
    with open(DATA_STORE_PATH, "r") as f:
        return json.load(f)


def save_store(store: Dict[str, List[dict]]) -> None:
    os.makedirs(os.path.dirname(DATA_STORE_PATH), exist_ok=True)
    with open(DATA_STORE_PATH, "w") as f:
        json.dump(store, f, indent=2, default=str)


def wipe_store() -> None:
    save_store(_empty_store())


# ── Generic CRUD ─────────────────────────────────────────────────────────────

def insert_rows(table: str, rows: List[dict]) -> List[dict]:
    store = load_store()
    for row in rows:
        if "id" not in row:
            row["id"] = str(uuid4())
    store[table].extend(rows)
    save_store(store)
    return rows


def get_all(table: str) -> List[dict]:
    return load_store().get(table, [])


def get_by_id(table: str, row_id: str) -> Optional[dict]:
    for row in get_all(table):
        if row.get("id") == row_id:
            return row
    return None


def update_row(table: str, row_id: str, updates: dict) -> Optional[dict]:
    store = load_store()
    for row in store.get(table, []):
        if row.get("id") == row_id:
            row.update(updates)
            save_store(store)
            return row
    return None


# ── Carrier queries (mimic Supabase chained filters) ────────────────────────

def query_eligible_carriers(
    *,
    commodity_type: str,
    required_temp_min: int,
    required_temp_max: int,
    weight_lbs: int,
    required_coverage_usd: Optional[int],
    southeast_states: List[str],
    required_trailer_type: Optional[str],
    required_capabilities: List[str],
    excluded_carrier_ids: List[str],
    required_equipment_types: List[str],
) -> tuple[List[dict], List[dict]]:
    """
    Applies Layer 1 hard filters in the same order as the Supabase query.
    Returns (eligible_carriers, rejections) where rejections are dicts
    with carrier_id, carrier_name, reason.
    """
    store = load_store()
    carriers = store.get("carriers", [])
    trucks = store.get("trucks", [])

    eligible: List[dict] = []
    rejections: List[dict] = []

    for c in carriers:
        # 1. Platform status — ALWAYS first check
        if c.get("platform_status") != "approved":
            rejections.append({
                "carrier_id": c["id"],
                "carrier_name": c.get("company_name", ""),
                "reason": f"platform_status={c.get('platform_status')} (must be 'approved')",
            })
            continue

        # 2. Operating authority
        if not c.get("operating_authority_active"):
            rejections.append({
                "carrier_id": c["id"],
                "carrier_name": c.get("company_name", ""),
                "reason": "operating_authority_active=false",
            })
            continue

        # 3. Insurance current
        if not c.get("insurance_current"):
            rejections.append({
                "carrier_id": c["id"],
                "carrier_name": c.get("company_name", ""),
                "reason": "insurance_current=false (expired insurance)",
            })
            continue

        # 4. Insurance coverage
        if required_coverage_usd and (c.get("insurance_coverage_usd") or 0) < required_coverage_usd:
            rejections.append({
                "carrier_id": c["id"],
                "carrier_name": c.get("company_name", ""),
                "reason": f"insurance_coverage_usd={c.get('insurance_coverage_usd')} < required {required_coverage_usd}",
            })
            continue

        # 5. Commodity certification
        if commodity_type not in c.get("certified_commodity_types", []):
            rejections.append({
                "carrier_id": c["id"],
                "carrier_name": c.get("company_name", ""),
                "reason": f"commodity '{commodity_type}' not in certified_commodity_types {c.get('certified_commodity_types')}",
            })
            continue

        # 6. Domicile state in southeast
        if c.get("domicile_state") not in southeast_states:
            rejections.append({
                "carrier_id": c["id"],
                "carrier_name": c.get("company_name", ""),
                "reason": f"domicile_state={c.get('domicile_state')} not in {southeast_states}",
            })
            continue

        # 7. Capability tags — carrier must have all required capabilities
        if required_capabilities:
            carrier_caps = set(c.get("capabilities", []))
            required_set = set(required_capabilities)
            if not required_set.issubset(carrier_caps):
                missing = required_set - carrier_caps
                rejections.append({
                    "carrier_id": c["id"],
                    "carrier_name": c.get("company_name", ""),
                    "reason": f"missing capabilities: {missing}",
                })
                continue

        # 8. Exclusion list
        if c["id"] in excluded_carrier_ids:
            rejections.append({
                "carrier_id": c["id"],
                "carrier_name": c.get("company_name", ""),
                "reason": "carrier in excluded_carrier_ids",
            })
            continue

        # 9. Trailer type — only filter if load specifies requirement
        if required_trailer_type:
            if c.get("trailer_type") != required_trailer_type and c.get("trailer_type") != "both":
                rejections.append({
                    "carrier_id": c["id"],
                    "carrier_name": c.get("company_name", ""),
                    "reason": f"trailer_type={c.get('trailer_type')} does not match required '{required_trailer_type}'",
                })
                continue

        # ── Truck-level filters ──────────────────────────────────────────────
        # A carrier is eligible if they have at least one truck passing all
        # truck-level hard filters.
        carrier_trucks = [t for t in trucks if t.get("carrier_id") == c["id"]]
        eligible_trucks = []

        for t in carrier_trucks:
            # Current load status — truck must not be on_load
            if t.get("current_load_status") == "on_load":
                continue

            # Equipment type — truck must match one of the required types
            if required_equipment_types:
                if t.get("equipment_type") not in required_equipment_types:
                    continue

            # Temperature capability
            if t.get("temp_capability_min", 999) > required_temp_min:
                continue
            if t.get("temp_capability_max", -999) < required_temp_max:
                continue

            # Payload — DOT compliance, hard block, no tolerance
            if t.get("max_payload_lbs", 0) < weight_lbs:
                continue

            eligible_trucks.append(t)

        if not eligible_trucks:
            rejections.append({
                "carrier_id": c["id"],
                "carrier_name": c.get("company_name", ""),
                "reason": "no eligible trucks (all failed equipment/temp/payload/status filters)",
            })
            continue

        # Carrier passes all hard filters — attach their eligible trucks
        carrier_with_trucks = dict(c)
        carrier_with_trucks["_eligible_trucks"] = eligible_trucks
        eligible.append(carrier_with_trucks)

    return eligible, rejections


# ── Repeat booking / lane history lookups ────────────────────────────────────

def get_lane_run_count(carrier_id: str, origin_region: str, destination_region: str) -> int:
    for entry in get_all("lane_history"):
        if (
            entry.get("carrier_id") == carrier_id
            and entry.get("origin_region") == origin_region
            and entry.get("destination_region") == destination_region
        ):
            return entry.get("runs", 0)
    return 0


def get_broker_load_count(carrier_id: str, broker_id: str) -> int:
    for entry in get_all("repeat_booking_history"):
        if entry.get("carrier_id") == carrier_id and entry.get("broker_id") == broker_id:
            return entry.get("completed_loads", 0)
    return 0


# ── Match notification / event writes ────────────────────────────────────────

def batch_insert_notifications(notifications: List[dict]) -> None:
    """Single batch INSERT — never one row at a time."""
    insert_rows("match_notifications", notifications)


def batch_insert_events(events: List[dict]) -> None:
    """Single batch INSERT for outcome logging."""
    insert_rows("match_events", events)


# ── Accept load (local equivalent of accept_load_atomic RPC) ─────────────────

def accept_load_atomic(load_id: str, carrier_id: str) -> dict:
    """
    Local equivalent of the Postgres accept_load_atomic function.
    TODO(supabase): Replace with supabase.rpc('accept_load_atomic', {...})
    """
    store = load_store()

    # Find and lock the load
    load_row = None
    for row in store.get("loads", []):
        if row["id"] == load_id and row.get("status") == "open":
            load_row = row
            break

    if not load_row:
        return {"success": False, "reason": "load_already_claimed"}

    # Claim
    load_row["status"] = "covered"
    load_row["updated_at"] = datetime.now(timezone.utc).isoformat()

    # Update carrier availability
    for avail in store.get("carrier_availability", []):
        if avail.get("carrier_id") == carrier_id:
            avail["status"] = "on_load"
            avail["current_load_id"] = load_id
            avail["updated_at"] = datetime.now(timezone.utc).isoformat()

    # Expire other notifications
    now_iso = datetime.now(timezone.utc).isoformat()
    for notif in store.get("match_notifications", []):
        if notif.get("load_id") == load_id and notif.get("status") == "pending":
            if notif.get("carrier_id") == carrier_id:
                notif["status"] = "accepted"
                notif["responded_at"] = now_iso
            else:
                notif["status"] = "backfilled"
                notif["responded_at"] = now_iso

    save_store(store)
    return {"success": True}
