"""
Layer 3: Top-K Selection and Broadcast

After scoring, selects the top K carriers and writes match_notifications
and match_events in single batch INSERTs.
"""

from __future__ import annotations

import heapq
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple

from config import DEFAULT_TOP_K
from db.local import (
    batch_insert_events,
    batch_insert_notifications,
    get_broker_load_count,
    get_lane_run_count,
)
from matching.scoring import calculate_match_score


# ── Response window — dynamic based on hours until pickup ────────────────────

def get_response_window(hours_until_pickup: float) -> int:
    """Minutes to wait before backfilling to next tier."""
    if hours_until_pickup > 48:
        return 60
    elif hours_until_pickup > 24:
        return 30
    elif hours_until_pickup > 6:
        return 15
    else:
        return 5


# ── Top-K selection ──────────────────────────────────────────────────────────

def select_top_k(
    eligible_carriers: List[dict],
    load: dict,
    k: int = DEFAULT_TOP_K,
    now: Optional[datetime] = None,
) -> List[dict]:
    """
    Score all eligible carriers and return top-K ranked results.

    Each carrier may have multiple eligible trucks — we score each truck
    independently and take the best truck per carrier.

    Returns list of dicts with:
        carrier, truck, scores (individual + composite), rank, deadhead_miles
    """
    if now is None:
        now = datetime.now(timezone.utc)

    # Score each (carrier, truck) pair, keep the best truck per carrier
    best_per_carrier: dict[str, dict] = {}

    for carrier in eligible_carriers:
        trucks = carrier.get("_eligible_trucks", [])
        for truck in trucks:
            scores = calculate_match_score(carrier, truck, load, now)
            carrier_id = carrier["id"]

            if (
                carrier_id not in best_per_carrier
                or scores["composite"] > best_per_carrier[carrier_id]["scores"]["composite"]
            ):
                best_per_carrier[carrier_id] = {
                    "carrier": carrier,
                    "truck": truck,
                    "scores": scores,
                }

    # Use heapq to select top-K
    items = list(best_per_carrier.values())
    top_k = heapq.nlargest(k, items, key=lambda x: x["scores"]["composite"])

    # Attach rank
    results = []
    for rank, item in enumerate(top_k, start=1):
        item["rank"] = rank
        item["deadhead_miles"] = item["scores"]["deadhead_miles"]
        results.append(item)

    return results


# ── Broadcast — write notifications + events in batch ────────────────────────

def broadcast_matches(
    top_k: List[dict],
    load: dict,
    now: Optional[datetime] = None,
) -> None:
    """
    Write match_notifications and match_events in single batch INSERTs.
    TODO(supabase): Replace with supabase.table(...).insert(notifications).execute()
    """
    if now is None:
        now = datetime.now(timezone.utc)

    pickup_time = datetime.fromisoformat(load["pickup_time"].replace("Z", "+00:00"))
    hours_until = max(0.0, (pickup_time - now).total_seconds() / 3600)
    response_window = get_response_window(hours_until)

    # Batch INSERT match_notifications
    notifications = [
        {
            "load_id": load["id"],
            "carrier_id": item["carrier"]["id"],
            "match_score": item["scores"]["composite"],
            "rank_position": item["rank"],
            "status": "pending",
            "notified_at": now.isoformat(),
            "expires_at": (now + timedelta(minutes=response_window)).isoformat(),
        }
        for item in top_k
    ]
    batch_insert_notifications(notifications)

    # Batch INSERT match_events (outcome logging — critical for Phase 2 ML)
    events = [
        {
            "load_id": load["id"],
            "carrier_id": item["carrier"]["id"],
            "match_score": item["scores"]["composite"],
            "rank_position": item["rank"],
            "distance_score": item["scores"]["distance"],
            "freshness_score": item["scores"]["freshness"],
            "repeat_booking_score": item["scores"]["repeat_booking"],
            "rating_score": item["scores"]["rating"],
            "reliability_score": item["scores"]["reliability"],
            "lane_runs_at_match": get_lane_run_count(
                item["carrier"]["id"],
                load["pickup_state"],
                load["delivery_state"],
            ),
            "broker_loads_at_match": get_broker_load_count(
                item["carrier"]["id"],
                load["broker_id"],
            ),
            "surfaced_at": now.isoformat(),
        }
        for item in top_k
    ]
    batch_insert_events(events)


# ── Full pipeline: filter → score → rank → broadcast ────────────────────────

def run_matching_pipeline(
    load: dict,
    k: int = DEFAULT_TOP_K,
    now: Optional[datetime] = None,
    write_results: bool = True,
) -> Tuple[List[dict], List[dict]]:
    """
    Execute the complete 3-layer matching pipeline for a load.

    Returns:
        (top_k_results, rejections)
    """
    from matching.filters import apply_hard_filters

    eligible, rejections = apply_hard_filters(load)

    if not eligible:
        return [], rejections

    top_k = select_top_k(eligible, load, k=k, now=now)

    if write_results and top_k:
        broadcast_matches(top_k, load, now=now)

    return top_k, rejections
