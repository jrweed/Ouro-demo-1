"""
Layer 1: Hard Constraint Filters

Binary pass/fail — ineligible carriers never reach scoring.
All filters run as a single query against the data store before any Python scoring.

TODO(supabase): Replace db.local.query_eligible_carriers with a Supabase
chained query (.select().eq().gte()...) as defined in MATCHING_ALGORITHM.md
"""

from __future__ import annotations

from typing import List, Tuple

from config import SOUTHEAST_STATES
from db.local import query_eligible_carriers


def apply_hard_filters(
    load: dict,
) -> Tuple[List[dict], List[dict]]:
    """
    Apply all Layer 1 hard filters for a given load.

    Returns:
        (eligible_carriers, rejections)
        eligible_carriers: list of carrier dicts, each with '_eligible_trucks' attached
        rejections: list of {carrier_id, carrier_name, reason}
    """
    eligible, rejections = query_eligible_carriers(
        commodity_type=load["commodity_type"],
        required_temp_min=load["required_temp_min"],
        required_temp_max=load["required_temp_max"],
        weight_lbs=load["weight_lbs"],
        required_coverage_usd=load.get("required_coverage_usd"),
        southeast_states=SOUTHEAST_STATES,
        required_trailer_type=load.get("required_trailer_type"),
        required_capabilities=load.get("required_capabilities", []),
        excluded_carrier_ids=load.get("excluded_carrier_ids", []),
        required_equipment_types=load.get("required_equipment_types", []),
    )

    return eligible, rejections
