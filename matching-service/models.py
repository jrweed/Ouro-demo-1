"""
Pydantic models for ColdHaul matching service.
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, Field


# ── Carrier ──────────────────────────────────────────────────────────────────

class Carrier(BaseModel):
    id: str
    company_name: str
    contact_name: str
    email: str
    phone: Optional[str] = None
    city: str
    state: str
    domicile_state: str

    platform_status: str = "pending"
    operating_authority_active: bool = False
    mc_number: Optional[str] = None
    dot_number: Optional[str] = None
    insurance_current: bool = False
    insurance_expiry_date: Optional[str] = None
    insurance_coverage_usd: Optional[int] = None

    certified_commodity_types: List[str] = Field(default_factory=list)
    trailer_type: str = "carrier_owned"
    haul_preference: str = "any"
    capabilities: List[str] = Field(default_factory=list)

    rating: Optional[float] = None
    total_loads_completed: int = 0
    on_time_pickup_rate: Optional[float] = None
    on_time_delivery_rate: Optional[float] = None
    acceptance_rate: Optional[float] = None

    quick_pay_required: bool = False
    created_at: Optional[str] = None

    # Denormalized for scoring — populated from repeat_booking_history / lane_history
    repeat_booking_history: List[dict] = Field(default_factory=list)
    lane_history: List[dict] = Field(default_factory=list)


# ── Truck ────────────────────────────────────────────────────────────────────

class Truck(BaseModel):
    id: str
    carrier_id: str
    unit_number: str
    equipment_type: str
    max_payload_lbs: int
    temp_capability_min: int
    temp_capability_max: int
    current_load_status: str = "available"
    current_location_city: Optional[str] = None
    current_location_state: Optional[str] = None
    availability_window_start: Optional[str] = None
    availability_window_end: Optional[str] = None


# ── Broker ───────────────────────────────────────────────────────────────────

class Broker(BaseModel):
    id: str
    company_name: str
    contact_name: str
    email: str
    phone: Optional[str] = None
    city: str
    state: str
    platform_status: str = "approved"
    primary_commodity_types: List[str] = Field(default_factory=list)
    typical_lanes: List[str] = Field(default_factory=list)
    typical_load_weight_lbs: Optional[int] = None
    requires_food_grade: bool = False
    subscription_tier: str = "professional"
    created_at: Optional[str] = None


# ── Load ─────────────────────────────────────────────────────────────────────

class Load(BaseModel):
    id: str
    broker_id: str
    status: str = "open"

    commodity_type: str
    required_temp_min: int
    required_temp_max: int
    required_equipment_types: List[str] = Field(default_factory=list)
    required_trailer_type: Optional[str] = None
    weight_lbs: int
    required_coverage_usd: Optional[int] = None

    pickup_city: str
    pickup_state: str
    delivery_city: str
    delivery_state: str
    pickup_time: str  # ISO 8601

    estimated_transit_hours: Optional[int] = None
    required_capabilities: List[str] = Field(default_factory=list)
    excluded_carrier_ids: List[str] = Field(default_factory=list)

    quick_pay_available: bool = False
    created_at: Optional[str] = None


# ── Match Result ─────────────────────────────────────────────────────────────

class MatchScores(BaseModel):
    distance: float
    freshness: float
    repeat_booking: float
    rating: float
    reliability: float
    composite: float


class MatchResult(BaseModel):
    carrier: Carrier
    truck: Truck
    scores: MatchScores
    rank: int
    deadhead_miles: float


# ── Filter Rejection ─────────────────────────────────────────────────────────

class FilterRejection(BaseModel):
    carrier_id: str
    carrier_name: str
    reason: str
