"""
Spoke Matching Algorithm — FastAPI Service

TODO(supabase): Replace local data store calls with Supabase client
TODO(railway): Deploy this service to Railway with env vars configured
"""

from __future__ import annotations

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime, timezone
from typing import Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from config import DEFAULT_TOP_K
from db.local import accept_load_atomic, get_all, get_by_id, insert_rows, update_row
from matching.ranker import run_matching_pipeline

app = FastAPI(
    title="Spoke Matching Service",
    version="0.1.0",
    description="Broadcast matching algorithm for cold chain freight",
)


# ── Request / Response Models ────────────────────────────────────────────────

class MatchRequest(BaseModel):
    load_id: str
    top_k: int = DEFAULT_TOP_K


class LoadInput(BaseModel):
    id: str
    broker_id: str
    commodity_type: str
    required_temp_min: int
    required_temp_max: int
    required_equipment_types: list[str] = Field(default_factory=list)
    required_trailer_type: Optional[str] = None
    weight_lbs: int
    required_coverage_usd: Optional[int] = None
    pickup_city: str
    pickup_state: str
    delivery_city: str
    delivery_state: str
    pickup_time: str
    required_capabilities: list[str] = Field(default_factory=list)
    excluded_carrier_ids: list[str] = Field(default_factory=list)


class AcceptRequest(BaseModel):
    carrier_id: str


# ── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/api/v1/health")
async def health():
    """Railway health check endpoint."""
    return {"status": "ok", "service": "spoke-matching"}


@app.post("/api/v1/match")
async def trigger_match(req: MatchRequest):
    """
    Trigger matching for a load.
    Called by Supabase webhook on load INSERT, or manually during testing.
    """
    load = get_by_id("loads", req.load_id)
    if not load:
        raise HTTPException(status_code=404, detail="Load not found")

    top_k, rejections = run_matching_pipeline(
        load, k=req.top_k, write_results=True
    )

    return {
        "load_id": req.load_id,
        "matches": [
            {
                "rank": m["rank"],
                "carrier_id": m["carrier"]["id"],
                "carrier_name": m["carrier"]["company_name"],
                "truck_id": m["truck"]["id"],
                "truck_unit": m["truck"]["unit_number"],
                "composite_score": m["scores"]["composite"],
                "distance_score": m["scores"]["distance"],
                "freshness_score": m["scores"]["freshness"],
                "repeat_booking_score": m["scores"]["repeat_booking"],
                "rating_score": m["scores"]["rating"],
                "reliability_score": m["scores"]["reliability"],
                "deadhead_miles": m["deadhead_miles"],
            }
            for m in top_k
        ],
        "rejections": rejections,
        "total_eligible": len(top_k),
        "total_rejected": len(rejections),
    }


@app.post("/api/v1/loads")
async def create_load(load_input: LoadInput):
    """Insert a load into the data store."""
    load_data = load_input.model_dump()
    load_data["status"] = "open"
    load_data["created_at"] = datetime.now(timezone.utc).isoformat()
    insert_rows("loads", [load_data])
    return {"load_id": load_data["id"], "status": "created"}


@app.post("/api/v1/loads/{load_id}/accept")
async def accept_load(load_id: str, req: AcceptRequest):
    """
    Carrier accepts a load.
    TODO(supabase): Replace with supabase.rpc('accept_load_atomic', {...})
    """
    result = accept_load_atomic(load_id, req.carrier_id)
    if not result.get("success"):
        raise HTTPException(
            status_code=409,
            detail=result.get("reason", "load_already_claimed"),
        )
    return result


@app.post("/api/v1/loads/{load_id}/reject")
async def reject_load(load_id: str, req: AcceptRequest):
    """Carrier rejects a load notification."""
    from db.local import load_store, save_store

    store = load_store()
    now_iso = datetime.now(timezone.utc).isoformat()
    found = False
    for notif in store.get("match_notifications", []):
        if (
            notif.get("load_id") == load_id
            and notif.get("carrier_id") == req.carrier_id
            and notif.get("status") == "pending"
        ):
            notif["status"] = "rejected"
            notif["responded_at"] = now_iso
            found = True
            break
    if not found:
        raise HTTPException(status_code=404, detail="Notification not found")
    save_store(store)
    return {"success": True}


@app.get("/api/v1/carriers/{carrier_id}/matches")
async def get_carrier_matches(carrier_id: str):
    """Carrier retrieves their pending match notifications."""
    notifications = [
        n
        for n in get_all("match_notifications")
        if n.get("carrier_id") == carrier_id and n.get("status") == "pending"
    ]
    return {"carrier_id": carrier_id, "notifications": notifications}


@app.get("/api/v1/loads/{load_id}/matches")
async def get_load_matches(load_id: str):
    """Broker retrieves match status for their load."""
    notifications = [
        n for n in get_all("match_notifications") if n.get("load_id") == load_id
    ]
    return {"load_id": load_id, "notifications": notifications}


# ── Run locally ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
