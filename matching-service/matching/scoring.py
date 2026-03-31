"""
Layer 2: Multiplicative Weighted Scoring

All five factors normalized to 0.0–1.0 before scoring.
Scoring is ALWAYS multiplicative, NEVER additive.

Weights:
    distance        0.30
    freshness       0.25
    repeat_booking  0.20
    rating          0.15
    reliability     0.10
"""

from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import Dict, Optional

from config import MAX_DEADHEAD_MILES, MAX_FRESHNESS_WINDOW_HOURS
from db.local import get_lane_run_count, get_broker_load_count


# ── Coordinate lookup for deadhead estimation ────────────────────────────────

CITY_COORDS: Dict[str, tuple[float, float]] = {
    # South Carolina
    "greenville_sc":    (34.8526, -82.3940),
    "charleston_sc":    (32.7765, -79.9311),
    "columbia_sc":      (34.0007, -81.0348),
    "spartanburg_sc":   (34.9496, -81.9320),
    "anderson_sc":      (34.5034, -82.6501),
    "rock hill_sc":     (34.9249, -81.0251),
    # Georgia
    "savannah_ga":      (32.0835, -81.0998),
    "atlanta_ga":       (33.7490, -84.3880),
    "augusta_ga":       (33.4735, -82.0105),
    "albany_ga":        (31.5785, -84.1557),
    "valdosta_ga":      (30.8327, -83.2785),
    "macon_ga":         (32.8407, -83.6324),
    "columbus_ga":      (32.4610, -84.9877),
    "brunswick_ga":     (31.1499, -81.4915),
    "statesboro_ga":    (32.4488, -81.7832),
    "hinesville_ga":    (31.8468, -81.5959),
    "thomasville_ga":   (30.8366, -83.9788),
    "dothan_ga":        (31.2232, -85.3905),  # Dothan is AL but TEST_DATA says GA
    # North Carolina
    "charlotte_nc":     (35.2271, -80.8431),
    "greensboro_nc":    (36.0726, -79.7920),
    "winston-salem_nc": (36.0999, -80.2442),
    "durham_nc":        (35.9940, -78.8986),
    "raleigh_nc":       (35.7796, -78.6382),
    "fayetteville_nc":  (35.0527, -78.8784),
    "asheville_nc":     (35.5951, -82.5515),
    # Florida
    "miami_fl":         (25.7617, -80.1918),
    "fort lauderdale_fl": (26.1224, -80.1373),
    "tampa_fl":         (27.9506, -82.4572),
    "orlando_fl":       (28.5383, -81.3792),
    "jacksonville_fl":  (30.3322, -81.6557),
    "gainesville_fl":   (29.6516, -82.3248),
    "tallahassee_fl":   (30.4383, -84.2807),
    "boca raton_fl":    (26.3683, -80.1289),
    "clearwater_fl":    (27.9659, -82.8001),
    "st. petersburg_fl":(27.7676, -82.6403),
    "st petersburg_fl": (27.7676, -82.6403),
    "pensacola_fl":     (30.4213, -87.2169),
    "naples_fl":        (26.1420, -81.7948),
    "sarasota_fl":      (27.3364, -82.5307),
    "lakeland_fl":      (28.0395, -81.9498),
    "ocala_fl":         (29.1872, -82.1401),
    # Tennessee
    "nashville_tn":     (36.1627, -86.7816),
    "knoxville_tn":     (35.9606, -83.9207),
    "memphis_tn":       (35.1495, -90.0490),
    "chattanooga_tn":   (35.0456, -85.3097),
    # Alabama
    "birmingham_al":    (33.5186, -86.8104),
    "montgomery_al":    (32.3792, -86.3077),
    "mobile_al":        (30.6954, -88.0399),
    "huntsville_al":    (34.7304, -86.5861),
    # Louisiana
    "new orleans_la":   (29.9511, -90.0715),
    "baton rouge_la":   (30.4515, -91.1871),
    # Virginia
    "richmond_va":      (37.5407, -77.4360),
    "norfolk_va":       (36.8508, -76.2859),
    "virginia beach_va":(36.8529, -75.9780),
}


def _city_key(city: str, state: str) -> str:
    return f"{city.lower().strip()}_{state.lower().strip()}"


def _haversine_miles(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 3958.8  # Earth radius in miles
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lon / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def estimate_deadhead(
    truck_city: str, truck_state: str, pickup_city: str, pickup_state: str
) -> float:
    """Estimate deadhead miles between truck location and load pickup."""
    key_truck = _city_key(truck_city, truck_state)
    key_pickup = _city_key(pickup_city, pickup_state)
    coords_truck = CITY_COORDS.get(key_truck)
    coords_pickup = CITY_COORDS.get(key_pickup)
    if not coords_truck or not coords_pickup:
        return MAX_DEADHEAD_MILES  # Unknown location → worst case
    return _haversine_miles(
        coords_truck[0], coords_truck[1], coords_pickup[0], coords_pickup[1]
    )


def estimate_route_miles(
    pickup_city: str, pickup_state: str, delivery_city: str, delivery_state: str
) -> float:
    """Estimate load route distance for haul preference evaluation."""
    key_pickup = _city_key(pickup_city, pickup_state)
    key_delivery = _city_key(delivery_city, delivery_state)
    coords_pickup = CITY_COORDS.get(key_pickup)
    coords_delivery = CITY_COORDS.get(key_delivery)
    if not coords_pickup or not coords_delivery:
        return 250.0  # Unknown → neutral for haul preference
    return _haversine_miles(
        coords_pickup[0], coords_pickup[1], coords_delivery[0], coords_delivery[1]
    )


# ── Factor 1: Distance Score (weight 0.30) ──────────────────────────────────

def calculate_distance_score(
    deadhead_miles: float,
    carrier_haul_preference: str,
    load_route_miles: float,
) -> float:
    """
    Distance score with haul preference modifier.
    0 mi → 1.0, 75 mi → 0.5, 150+ mi → 0.0
    Haul preference mismatch applies 0.85 multiplier — never eliminates.
    """
    score = max(0.0, 1.0 - (deadhead_miles / MAX_DEADHEAD_MILES))

    # Haul preference modifier
    if carrier_haul_preference == "short" and load_route_miles > 250:
        score *= 0.85
    elif carrier_haul_preference == "long" and load_route_miles < 250:
        score *= 0.85

    return score


# ── Factor 2: Freshness Score (weight 0.25) ──────────────────────────────────

def calculate_freshness_score(pickup_time_str: str, now: Optional[datetime] = None) -> float:
    """
    Time sensitivity — increases as pickup approaches.
    1 hr → ~0.99, 36 hrs → 0.50, 72+ hrs → 0.0
    """
    if now is None:
        now = datetime.now(timezone.utc)

    pickup_time = datetime.fromisoformat(pickup_time_str.replace("Z", "+00:00"))
    hours_until = max(0.0, (pickup_time - now).total_seconds() / 3600)
    return max(0.0, 1.0 - (hours_until / MAX_FRESHNESS_WINDOW_HOURS))


# ── Factor 3: Repeat Booking Score (weight 0.20) ────────────────────────────

def calculate_repeat_booking_score(
    carrier_id: str,
    broker_id: str,
    origin_region: str,
    destination_region: str,
    total_loads_completed: int,
) -> float:
    """
    Composite: lane history (60%) + broker relationship history (40%).
    Provisional score for new carriers: 0.30
    """
    if total_loads_completed == 0:
        return 0.30  # Provisional — trust must be earned

    lane_runs = get_lane_run_count(carrier_id, origin_region, destination_region)
    lane_score = min(1.0, lane_runs / 10)

    broker_loads = get_broker_load_count(carrier_id, broker_id)
    broker_score = min(1.0, broker_loads / 5)

    return (lane_score * 0.60) + (broker_score * 0.40)


# ── Factor 4: Rating Score (weight 0.15) ────────────────────────────────────

def calculate_rating_score(rating: Optional[float]) -> float:
    """
    Normalized 1.0–5.0 → 0.0–1.0.
    Provisional for new carriers: 0.6 (equivalent to 3.4 rating).
    """
    if rating is None:
        return 0.6  # Provisional
    return (rating - 1.0) / 4.0


# ── Factor 5: Reliability Score (weight 0.10) ───────────────────────────────

def calculate_reliability_score(
    on_time_pickup: Optional[float],
    on_time_delivery: Optional[float],
    acceptance_rate: Optional[float],
    total_loads_completed: int,
) -> float:
    """
    Composite: on-time pickup (40%) + on-time delivery (40%) + acceptance rate (20%).
    Provisional for new carriers: 0.65
    """
    if total_loads_completed == 0:
        return 0.65  # Provisional
    otp = on_time_pickup if on_time_pickup is not None else 0.65
    otd = on_time_delivery if on_time_delivery is not None else 0.65
    acc = acceptance_rate if acceptance_rate is not None else 0.65
    return (otp * 0.40) + (otd * 0.40) + (acc * 0.20)


# ── Composite Score ─────────────────────────────────────────────────────────

# Weights — must match spec exactly
WEIGHTS = {
    "distance": 0.30,
    "freshness": 0.25,
    "repeat_booking": 0.20,
    "rating": 0.15,
    "reliability": 0.10,
}


def calculate_match_score(
    carrier: dict,
    truck: dict,
    load: dict,
    now: Optional[datetime] = None,
) -> dict:
    """
    Calculate the full multiplicative weighted match score.

    Returns dict with individual factor scores and the composite score.
    """
    # Deadhead: truck location → load pickup
    deadhead = estimate_deadhead(
        truck.get("current_location_city", ""),
        truck.get("current_location_state", ""),
        load["pickup_city"],
        load["pickup_state"],
    )

    # Route distance for haul preference
    route_miles = estimate_route_miles(
        load["pickup_city"], load["pickup_state"],
        load["delivery_city"], load["delivery_state"],
    )

    distance = calculate_distance_score(
        deadhead, carrier.get("haul_preference", "any"), route_miles
    )
    freshness = calculate_freshness_score(load["pickup_time"], now)
    repeat_booking = calculate_repeat_booking_score(
        carrier["id"],
        load["broker_id"],
        load["pickup_state"],
        load["delivery_state"],
        carrier.get("total_loads_completed", 0),
    )
    rating = calculate_rating_score(carrier.get("rating"))
    reliability = calculate_reliability_score(
        carrier.get("on_time_pickup_rate"),
        carrier.get("on_time_delivery_rate"),
        carrier.get("acceptance_rate"),
        carrier.get("total_loads_completed", 0),
    )

    # Multiplicative weighted score — NEVER additive
    # Clamp each factor to a small floor to prevent zero from killing the score
    # when it's a legitimate structural mismatch (e.g. 200mi deadhead = 0.0 distance)
    composite = (
        (max(distance, 1e-9) ** WEIGHTS["distance"])
        * (max(freshness, 1e-9) ** WEIGHTS["freshness"])
        * (max(repeat_booking, 1e-9) ** WEIGHTS["repeat_booking"])
        * (max(rating, 1e-9) ** WEIGHTS["rating"])
        * (max(reliability, 1e-9) ** WEIGHTS["reliability"])
    )

    return {
        "distance": round(distance, 4),
        "freshness": round(freshness, 4),
        "repeat_booking": round(repeat_booking, 4),
        "rating": round(rating, 4),
        "reliability": round(reliability, 4),
        "composite": round(composite, 6),
        "deadhead_miles": round(deadhead, 1),
        "route_miles": round(route_miles, 1),
    }


# ── Contextual Weight Modifier (Phase 2 — scaffolded, not called) ───────────

def get_contextual_weights(load: dict, market_conditions: Optional[dict] = None) -> dict:
    """
    Phase 2: Contextual weight adjustments based on market conditions.
    Scaffolded now — do not call in main scoring path at launch.

    TODO(phase2): Activate this when transaction volume reaches ~500.
    """
    weights = dict(WEIGHTS)

    if market_conditions is None:
        return weights

    # Produce season modifier
    if market_conditions.get("is_produce_season"):
        weights["freshness"] += 0.10
        weights["distance"] -= 0.10

    # Tight delivery window
    delivery_window_hours = load.get("delivery_window_hours")
    if delivery_window_hours is not None and delivery_window_hours < 4:
        weights["reliability"] += 0.10
        weights["rating"] -= 0.05
        weights["distance"] -= 0.05

    # High demand / low supply
    if market_conditions.get("load_to_truck_ratio", 0) > 6:
        weights["distance"] += 0.10
        weights["freshness"] -= 0.10

    # New carrier boost
    if market_conditions.get("total_active_carriers", 999) < 500:
        weights["repeat_booking"] = max(0.10, weights["repeat_booking"] - 0.10)
        weights["rating"] += 0.05
        weights["reliability"] += 0.05

    return weights
