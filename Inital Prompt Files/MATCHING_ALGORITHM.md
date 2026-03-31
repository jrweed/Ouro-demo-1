# ColdHaul Matching Algorithm Specification

## Overview

ColdHaul uses a **broadcast matching model with multiplicative weighted scoring**. The algorithm's job is to determine which carriers get notified about a posted load and in what priority order. Exclusive assignment never happens algorithmically — a carrier becomes unavailable only when they explicitly accept a load. Until that point, any number of carriers can be simultaneously surfaced for the same load.

This is a **top-K retrieval problem**, not a graph assignment problem. Do not use network flow algorithms (Hungarian, Hopcroft-Karp, Blossom) — these produce globally optimal one-to-one assignments which is the wrong behavior for this system.

---

## Optimization Objectives

The algorithm is simultaneously optimizing for two goals that exist in tension with each other. Both must be satisfied for the platform to be healthy.

**Objective 1 — Broker side:** Maximize the percentage of posted loads that receive a quality match, at the lowest rate the market will bear. A broker's primary success metric is coverage rate. If they cannot reliably cover their reefer loads through ColdHaul, they will not renew.

**Objective 2 — Carrier side:** Minimize deadhead miles and wasted time while maximizing rate per loaded mile. A carrier's primary success metric is load quality — the best value job available to them at the moment they are ready to move. If ColdHaul consistently surfaces poor-fit loads, carriers will stop engaging.

These objectives are in tension because the cheapest rate for the broker is not always the best value load for the carrier. The scoring algorithm does not try to resolve this tension — it surfaces the best structural fit (distance, urgency, history, preference) and lets rate negotiation happen between the parties. Do not embed rate optimization directly into the match score at launch.

---

## Uber Freight Reference

Uber Freight's matching algorithm surfaces three primary signals, which informed ColdHaul's factor design:

1. **Lead time to pickup** — how soon the load needs to be covered. The sooner, the higher the urgency signal. Maps to ColdHaul's freshness score.
2. **Repeat booking** — if a route is similar to a lane the carrier has previously run and agreed to, it is a strong fit signal. For ColdHaul this extends to same-broker repeat history as well.
3. **Distance preference** — carriers have implicit preferences for long hauls vs short regional runs. Raw deadhead distance alone does not capture this. Maps to ColdHaul's haul preference modifier.

Uber Freight evaluates 22+ additional parameters beyond these three. ColdHaul's roadmap follows a similar trajectory — launch with the highest-signal factors, add parameters as transaction data validates their predictive value.

---

## Architecture: Three Layers

Every match request passes through three sequential layers. A carrier must clear all three to be surfaced.

```
Load Posted
     │
     ▼
┌─────────────────────────┐
│  Layer 1: Hard Filters  │  Binary pass/fail — ineligible carriers never reach scoring
└─────────────────────────┘
     │
     ▼
┌─────────────────────────┐
│  Layer 2: Scoring       │  Multiplicative weighted score for all eligible carriers
└─────────────────────────┘
     │
     ▼
┌─────────────────────────┐
│  Layer 3: Ranked Output │  Top-K carriers surfaced simultaneously via Supabase Realtime
└─────────────────────────┘
```

---

## Layer 1: Hard Constraint Filters

Applied before any scoring. These are binary — a failed constraint eliminates the carrier entirely regardless of how well they would score.

```python
eligible_carriers = carriers.filter(
    # Platform vetting status — must be first check, blocks all unvetted carriers
    platform_status == 'approved',

    # Equipment and capability
    temp_capability >= load.required_temp_min,
    temp_capability <= load.required_temp_max,
    equipment_type in load.required_equipment_types,
    trailer_type == load.required_trailer_type,         # 'carrier_owned' or 'power_only'
    max_payload_lbs >= load.weight_lbs,                 # DOT compliance — never waive

    # Commodity certification
    load.commodity_type in carrier.certified_commodity_types,

    # Compliance — non-negotiable, never waived
    operating_authority_active == True,
    insurance_current == True,           # cargo and liability insurance must be current
    insurance_coverage >= load.required_coverage_usd,

    # Availability
    availability_window_start <= load.pickup_time,
    availability_window_end >= load.pickup_time + estimated_transit_hours,
    current_load_status != 'on_load',

    # Geography
    domicile_state in SOUTHEAST_STATES,  # SC, GA, NC, FL

    # Must-haves — custom requirements set by broker on the load or carrier on their profile
    # These are stored as tags/flags and must all match before a carrier is eligible
    carrier.capabilities.issuperset(load.required_capabilities),
    NOT any(load.excluded_carrier_ids contains carrier.id),
)
```

**Important:** Hard filters must run first, before scoring. Never score ineligible carriers. This keeps the scored pool clean and prevents structurally bad matches from surfacing regardless of their score on other factors.

**Platform vetting status:** ColdHaul is invite-only. `platform_status` must equal `'approved'` before a carrier can be surfaced for any load. Valid values are `'pending'` (application received, not yet reviewed), `'approved'` (fully vetted and active), `'suspended'` (temporarily blocked, e.g. open dispute), and `'removed'` (permanently off platform). This filter must always run first — it is the enforcement layer for the invite-only model and cannot be bypassed by any other condition.

**Commodity type compatibility:** Reefer freight is not uniform. Produce, protein/meat, dairy, and pharmaceuticals each carry different sanitation standards, handling certifications, and in some cases regulatory requirements (e.g. FSMA compliance for food carriers, serialization requirements for pharma). Store `certified_commodity_types` as an array on the carrier profile. A carrier is only eligible for a load if its commodity type appears in that array. Examples of commodity types: `produce`, `protein`, `dairy`, `frozen`, `pharma`, `floral`. A carrier is not assumed to be certified for all types — they must explicitly declare what they are equipped and certified to haul during onboarding.

**Trailer type:** Two distinct operating modes exist in reefer freight that the algorithm must treat as a binary filter, not a preference. `carrier_owned` means the carrier brings their own reefer trailer. `power_only` means the carrier brings only the truck cab and drops into the shipper's trailer. Some loads explicitly require power-only (shipper owns the trailer). Some carriers only operate power-only. A mismatch is not a bad match — it is a non-match. Store `trailer_type` on the carrier profile and `required_trailer_type` on the load. If the load has no trailer type requirement, all carriers are eligible on this dimension.

**Payload capacity:** Store `max_payload_lbs` on the carrier profile. Filter against `load.weight_lbs` before scoring. A carrier whose rated payload is below the load weight is a DOT compliance issue — this is never a scored preference, always a hard block. Do not apply any tolerance or rounding. If the load weight exceeds the carrier's max payload, the carrier is ineligible regardless of any other factor.

**Insurance requirement:** Insurance currency is checked against the carrier's certificate of insurance expiry date stored on their profile. A carrier with expired insurance must be blocked regardless of any other factor. This is a legal and liability requirement, not a preference.

**Broker/carrier must-haves:** Both brokers and carriers can set custom requirements that function as hard filters. Examples: broker requires carrier to have food-grade wash-out certificate, carrier refuses loads requiring drop-and-hook. These are stored as capability tags on both sides. A load only reaches a carrier if all broker-required tags are present on the carrier profile and no carrier exclusions are triggered.

---

## Layer 2: Multiplicative Weighted Scoring

### Why Multiplicative, Not Additive

The scoring model is **multiplicative**, not additive. This is intentional and important.

Additive scoring (sum of weighted factors) allows a carrier to score highly by excelling on one factor while being poor on others. A carrier who is very close but has a 2.1 reliability rating would still surface with an additive model.

Multiplicative scoring means a near-zero on any factor tanks the entire score. Every factor must be reasonably strong for a carrier to rank highly. This enforces holistic match quality.

```python
# WRONG — do not use additive
score = (distance_score * 0.30) + (freshness_score * 0.25) + (repeat_booking_score * 0.20) + (rating_score * 0.15) + (reliability_score * 0.10)

# CORRECT — use multiplicative
score = (distance_score ** 0.30) * (freshness_score ** 0.25) * (repeat_booking_score ** 0.20) * (rating_score ** 0.15) * (reliability_score ** 0.10)
```

### Factor Definitions and Normalization

All input factors must be normalized to a 0.0–1.0 scale before scoring. A score of 0.0 means worst possible, 1.0 means best possible.

**Factor 1: Distance Score (weight 0.30)**
Measures deadhead miles from carrier's current/home location to load pickup. Weight reduced from 0.40 to 0.30 to accommodate repeat booking factor — a carrier who knows a lane well is worth surfacing even if slightly further away.

```python
MAX_ACCEPTABLE_MILES = 150

distance_score = max(0.0, 1.0 - (deadhead_miles / MAX_ACCEPTABLE_MILES))
```

- 0 miles → 1.0
- 75 miles → 0.5
- 150+ miles → 0.0

**Haul preference modifier:** Carriers have an implicit preference for long hauls vs short regional runs. Raw deadhead distance does not capture this. Store a `haul_preference` field on the carrier profile (values: `short` = <250 miles, `long` = 250+ miles, `any`). Apply a 0.85 multiplier to distance_score if the load length mismatches the carrier's stated preference. Do not eliminate the carrier — just discount them relative to better-fit carriers.

```python
load_distance = calculate_route_miles(load.pickup_location, load.delivery_location)

if carrier.haul_preference == 'short' and load_distance > 250:
    distance_score *= 0.85
elif carrier.haul_preference == 'long' and load_distance < 250:
    distance_score *= 0.85
```

**Factor 2: Freshness Score (weight 0.25)**
Measures time sensitivity of the load — how urgently it needs to be covered relative to pickup time. Maps directly to Uber Freight's lead time signal.

```python
hours_until_pickup = (load.pickup_time - now()) / 3600
MAX_WINDOW = 72  # loads more than 72 hours out are not urgent

freshness_score = max(0.0, 1.0 - (hours_until_pickup / MAX_WINDOW))
```

- Pickup in 1 hour → ~0.99 (extremely urgent)
- Pickup in 36 hours → 0.50
- Pickup in 72+ hours → 0.0 (not urgent)

Note: Freshness score increases as pickup approaches. This causes the same load to surface more aggressively over time if not yet covered. This is intentional behavior.

**Factor 3: Repeat Booking Score (weight 0.20)**
The highest-signal predictor of a successful match after distance. Captures two related signals from Uber Freight's research: similar lane history and broker-carrier relationship history. A carrier who has run this lane before, or worked with this broker before, is a structurally better match regardless of other factors.

```python
def calculate_repeat_booking_score(carrier, load):
    # Similar lane history — has this carrier run this origin/destination corridor before?
    lane_runs = count_completed_loads_on_lane(carrier.id, load.origin_region, load.destination_region)
    lane_score = min(1.0, lane_runs / 10)  # caps at 1.0 after 10 runs on this lane

    # Broker relationship history — has this carrier worked with this broker before?
    broker_loads = count_completed_loads_with_broker(carrier.id, load.broker_id)
    broker_score = min(1.0, broker_loads / 5)  # caps at 1.0 after 5 successful loads with this broker

    # Weighted composite — lane history is slightly more predictive than broker relationship
    repeat_booking_score = (lane_score * 0.60) + (broker_score * 0.40)
    return repeat_booking_score
```

New carriers with no history receive a **provisional score of 0.30**. This is intentionally lower than other provisional scores — repeat booking is a trust signal that must be earned, not assumed.

**Factor 4: Rating Score (weight 0.15)**
Carrier's platform rating from broker reviews, normalized from 1.0–5.0 scale.

```python
rating_score = (carrier.rating - 1.0) / 4.0
```

- 5.0 rating → 1.0
- 3.0 rating → 0.5
- 1.0 rating → 0.0

New carriers with no rating receive a **provisional score of 0.6** (equivalent to a 3.4 rating). This prevents new carriers from being permanently suppressed before they accumulate reviews, while still ranking them below established carriers.

**Factor 5: Reliability Score (weight 0.10)**
Composite of on-time pickup rate, on-time delivery rate, and load acceptance rate after surfacing.

```python
reliability_score = (
    carrier.on_time_pickup_rate * 0.40 +
    carrier.on_time_delivery_rate * 0.40 +
    carrier.acceptance_rate * 0.20
)
```

New carriers with no transaction history receive a **provisional score of 0.65**. Same rationale as rating provisional score.

### Final Score Calculation

```python
def calculate_match_score(carrier, load):
    # Factor scores
    distance_score = calculate_distance_score(carrier, load)  # includes haul preference modifier
    freshness_score = max(0.0, 1.0 - (hours_until_pickup(load) / 72))
    repeat_booking_score = calculate_repeat_booking_score(carrier, load)
    rating_score = (carrier.rating - 1.0) / 4.0 if carrier.rating else 0.6
    reliability_score = calculate_reliability(carrier) if carrier.total_loads > 0 else 0.65

    # Multiplicative weighted score
    score = (
        (distance_score ** 0.30) *
        (freshness_score ** 0.25) *
        (repeat_booking_score ** 0.20) *
        (rating_score ** 0.15) *
        (reliability_score ** 0.10)
    )

    return score
```

---

## Layer 3: Ranked Output and Broadcast

### Top-K Selection

After scoring, insert all eligible carriers into a max-heap priority queue and pop the top K carriers. Default K = 5 at launch. This is configurable per load type.

```python
import heapq

def get_top_k_carriers(eligible_carriers, load, k=5):
    scored = [(calculate_match_score(c, load), c) for c in eligible_carriers]
    top_k = heapq.nlargest(k, scored, key=lambda x: x[0])
    return [carrier for score, carrier in top_k]
```

### Broadcast Behavior

- All top-K carriers are notified **simultaneously** via Supabase Realtime
- All top-K carriers can see and accept the load at the same time
- First carrier to accept claims the load
- On acceptance: load status → `covered`, carrier status → `on_load`
- Supabase Realtime immediately broadcasts status change to all other notified carriers
- System backfills from the next highest scored carrier if needed (see Backfill below)

### Backfill Logic

If no carrier accepts within the response window (configurable, default 30 minutes), the system automatically surfaces the next tier of carriers. Response window shortens as pickup time approaches.

```python
def get_response_window(hours_until_pickup):
    if hours_until_pickup > 48:
        return 60  # 60 minutes
    elif hours_until_pickup > 24:
        return 30  # 30 minutes
    elif hours_until_pickup > 6:
        return 15  # 15 minutes
    else:
        return 5   # 5 minutes — urgent load
```

---

## Outcome Logging (Critical)

Every matching event must be logged. This dataset is what enables the algorithm to evolve from weighted scoring to gradient boosted LTR in Phase 2. Do not skip this.

```sql
-- Every time a carrier is surfaced for a load
CREATE TABLE match_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    load_id UUID REFERENCES loads(id),
    carrier_id UUID REFERENCES carriers(id),
    match_score DECIMAL(6,4),
    rank_position INTEGER,        -- 1 = top match, 2 = second, etc.
    distance_score DECIMAL(4,3),
    freshness_score DECIMAL(4,3),
    repeat_booking_score DECIMAL(4,3),
    rating_score DECIMAL(4,3),
    reliability_score DECIMAL(4,3),
    lane_runs_at_match INTEGER,   -- how many times carrier had run this lane at time of match
    broker_loads_at_match INTEGER, -- how many loads carrier had done with this broker at time of match
    surfaced_at TIMESTAMPTZ DEFAULT now(),
    accepted_at TIMESTAMPTZ,      -- null if not accepted
    rejected_at TIMESTAMPTZ,      -- null if not rejected
    expired_at TIMESTAMPTZ        -- null if did not expire
);

-- Every completed load — this is the training label for Phase 2
CREATE TABLE load_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    load_id UUID REFERENCES loads(id),
    carrier_id UUID REFERENCES carriers(id),
    on_time_pickup BOOLEAN,
    on_time_delivery BOOLEAN,
    temp_excursion BOOLEAN,
    disputed BOOLEAN,
    broker_rating INTEGER,  -- 1-5
    completed_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Contextual Weight Modifiers (Phase 2)

After approximately 500 transactions, begin applying contextual weight adjustments. The base weights remain the defaults, but context shifts the distribution dynamically.

Do not implement these at launch. Build the weight calculation as a function now so modifiers can be injected later without restructuring the algorithm.

```python
def get_contextual_weights(load, market_conditions):
    # Base weights
    weights = {
        'distance': 0.30,
        'freshness': 0.25,
        'repeat_booking': 0.20,
        'rating': 0.15,
        'reliability': 0.10
    }

    # Produce season modifier (Florida: Jan-Apr, Georgia: May-Jun, Carolinas: Jun-Sep)
    if market_conditions.is_produce_season:
        weights['freshness'] += 0.10
        weights['distance'] -= 0.10

    # Tight delivery window modifier
    if load.delivery_window_hours < 4:
        weights['reliability'] += 0.10
        weights['rating'] -= 0.05
        weights['distance'] -= 0.05

    # High demand / low supply modifier
    if market_conditions.load_to_truck_ratio > 6:
        weights['distance'] += 0.10
        weights['freshness'] -= 0.10

    # New carrier boost — temporarily increase repeat_booking weight floor
    # so new carriers are not excessively penalized during cold start
    # Remove this modifier after platform reaches 500 carriers
    if market_conditions.total_active_carriers < 500:
        weights['repeat_booking'] = max(0.10, weights['repeat_booking'] - 0.10)
        weights['rating'] += 0.05
        weights['reliability'] += 0.05

    return weights
```

---

## Phase 2: Gradient Boosted LTR (Target: 2,000–5,000 Transactions)

At sufficient transaction volume, replace the hand-tuned multiplicative scorer with a **Learning to Rank (LTR)** model using gradient boosted trees (XGBoost or LightGBM).

**Training label:** Composite outcome score derived from load_outcomes table:
```python
outcome_score = (
    on_time_pickup * 0.25 +
    on_time_delivery * 0.35 +
    (1 - temp_excursion) * 0.25 +
    (1 - disputed) * 0.10 +
    (broker_rating / 5.0) * 0.05
)
```

**LTR approach:** Pairwise (RankNet or LambdaMART) — learn which of two carriers should rank higher for a given load, rather than scoring each independently.

**Key advantage over current model:** The model will discover non-obvious relationships — e.g., that lane familiarity predicts on-time delivery better than raw distance, or that reliability weight should be higher for temperature-sensitive produce than for standard reefer. These relationships are not expressible as manual rules.

**Transition plan:**
- Run LTR model in shadow mode alongside multiplicative scorer for 500 loads
- Compare outcome scores for LTR-ranked vs scorer-ranked matches
- Promote LTR to primary only after it demonstrably outperforms scorer on outcome metrics

---

## Phase 3: Neural Network Considerations (Target: 5,000+ Transactions)

Neural network approaches become viable at high transaction volume when:
- Carrier behavior sequences over time carry predictive signal (e.g., carrier X always performs better on Tuesday AM departures)
- Feature interactions become too complex for gradient boosted trees to capture
- You have sufficient labeled data to train deep models without overfitting

**Do not build toward this prematurely.** The gradient boosted LTR model will likely outperform a neural net until well past 5,000 transactions given the tabular nature of freight matching data.

---

## Database Interaction Pattern

The matching algorithm runs in the **Python FastAPI service on Railway**, not inside Supabase. Supabase is the data layer and realtime broadcast layer only. The algorithm reads from Supabase, computes scores, and writes results back to Supabase. Supabase Realtime then handles notifying connected clients.

### Service Boundaries

```
Supabase (Postgres + Realtime)          Railway (FastAPI)
─────────────────────────────           ──────────────────────────
carriers table          ──read──►       Layer 1: Hard filter query
loads table             ──read──►       Layer 2: Score computation
carrier_availability    ──read──►       Layer 3: Top-K selection
                                                │
match_notifications     ◄──write──              │  writes top-K rows
match_events            ◄──write──              │  writes outcome log row
                                                │
Realtime engine         ◄──triggers──   Postgres NOTIFY fires automatically
carrier clients         ◄──broadcast─   on INSERT into match_notifications
```

### How a Match Request Flows

1. Broker posts a load → INSERT into `loads` table in Supabase
2. Supabase webhook or Postgres trigger fires → calls FastAPI `/match` endpoint on Railway
3. FastAPI runs Layer 1 hard filter query against Supabase
4. FastAPI runs Layer 2 scoring on the filtered carrier pool (in memory, no additional DB calls)
5. FastAPI selects top-K carriers and INSERTs rows into `match_notifications`
6. FastAPI INSERTs a row per surfaced carrier into `match_events` (outcome logging)
7. Supabase Realtime detects the `match_notifications` INSERTs and broadcasts to subscribed carrier clients
8. Carrier accepts → UPDATE `match_notifications` status, UPDATE `loads` status, UPDATE `carrier_availability` — all in a single Postgres transaction with `FOR UPDATE SKIP LOCKED`

### Layer 1: Hard Filter Query

Layer 1 runs as a single Supabase query — do not fetch all carriers and filter in Python. Filter in the database.

```python
async def get_eligible_carriers(load: Load, supabase: AsyncClient) -> list[Carrier]:
    response = await supabase.table('carriers').select('*').eq(
        'platform_status', 'approved'
    ).eq(
        'operating_authority_active', True
    ).eq(
        'insurance_current', True
    ).gte(
        'insurance_coverage_usd', load.required_coverage_usd
    ).gte(
        'max_payload_lbs', load.weight_lbs
    ).lte(
        'temp_capability_min', load.required_temp_min
    ).gte(
        'temp_capability_max', load.required_temp_max
    ).contains(
        'certified_commodity_types', [load.commodity_type]
    ).in_(
        'domicile_state', SOUTHEAST_STATES
    ).neq(
        'current_load_status', 'on_load'
    ).execute()

    carriers = response.data

    # Trailer type — only filter if load specifies a requirement
    if load.required_trailer_type:
        carriers = [
            c for c in carriers
            if c['trailer_type'] == load.required_trailer_type or c['trailer_type'] == 'both'
        ]

    # Capability tags — filter in Python since array intersection is cleaner here
    if load.required_capabilities:
        carriers = [
            c for c in carriers
            if set(load.required_capabilities).issubset(set(c['capabilities']))
        ]

    # Exclusion list
    if load.excluded_carrier_ids:
        carriers = [
            c for c in carriers
            if c['id'] not in load.excluded_carrier_ids
        ]

    return carriers
```

### Layer 2: Scoring (In Memory)

Scoring runs entirely in Python after the filtered carrier list is returned from Supabase. No additional database queries during scoring.

```python
def score_carriers(carriers: list[Carrier], load: Load) -> list[tuple[float, Carrier]]:
    scored = []
    for carrier in carriers:
        score = calculate_match_score(carrier, load)
        scored.append((score, carrier))
    scored.sort(key=lambda x: x[0], reverse=True)
    return scored
```

### Layer 3: Write Results to Supabase

After scoring, write the top-K results in a single batch INSERT. Do not INSERT one row at a time.

```python
async def broadcast_matches(
    top_k: list[tuple[float, Carrier]],
    load: Load,
    supabase: AsyncClient
) -> None:
    now = datetime.utcnow()
    response_window_minutes = get_response_window(hours_until_pickup(load))

    # Batch INSERT into match_notifications
    notifications = [
        {
            'load_id': str(load.id),
            'carrier_id': str(carrier['id']),
            'match_score': round(score, 4),
            'rank_position': rank + 1,
            'status': 'pending',
            'notified_at': now.isoformat(),
            'expires_at': (now + timedelta(minutes=response_window_minutes)).isoformat(),
        }
        for rank, (score, carrier) in enumerate(top_k)
    ]
    await supabase.table('match_notifications').insert(notifications).execute()

    # Batch INSERT into match_events (outcome logging)
    events = [
        {
            'load_id': str(load.id),
            'carrier_id': str(carrier['id']),
            'match_score': round(score, 4),
            'rank_position': rank + 1,
            'distance_score': round(calculate_distance_score(carrier, load), 3),
            'freshness_score': round(calculate_freshness_score(load), 3),
            'repeat_booking_score': round(calculate_repeat_booking_score(carrier, load), 3),
            'rating_score': round((carrier['rating'] - 1.0) / 4.0 if carrier.get('rating') else 0.6, 3),
            'reliability_score': round(calculate_reliability(carrier), 3),
            'lane_runs_at_match': get_lane_run_count(carrier['id'], load),
            'broker_loads_at_match': get_broker_load_count(carrier['id'], load.broker_id),
            'surfaced_at': now.isoformat(),
        }
        for rank, (score, carrier) in enumerate(top_k)
    ]
    await supabase.table('match_events').insert(events).execute()
```

### Acceptance Transaction

When a carrier accepts a load, this must run as a single atomic Postgres transaction with a row lock to prevent race conditions when multiple carriers accept simultaneously.

```python
async def accept_load(load_id: str, carrier_id: str, supabase: AsyncClient) -> bool:
    # Run as RPC (Postgres function) to guarantee atomicity
    # Define this function in Supabase SQL editor, call it from FastAPI
    result = await supabase.rpc('accept_load_atomic', {
        'p_load_id': load_id,
        'p_carrier_id': carrier_id
    }).execute()

    return result.data.get('success', False)
```

```sql
-- Define this function in Supabase SQL editor
CREATE OR REPLACE FUNCTION accept_load_atomic(p_load_id UUID, p_carrier_id UUID)
RETURNS JSON AS $$
DECLARE
    v_load loads%ROWTYPE;
BEGIN
    -- Lock the load row — SKIP LOCKED means concurrent attempts return immediately
    SELECT * INTO v_load FROM loads
    WHERE id = p_load_id AND status = 'open'
    FOR UPDATE SKIP LOCKED;

    -- If no row returned, load was already claimed
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'reason', 'load_already_claimed');
    END IF;

    -- Claim the load
    UPDATE loads SET status = 'covered', updated_at = now() WHERE id = p_load_id;

    -- Mark carrier as on load
    UPDATE carrier_availability
    SET status = 'on_load', current_load_id = p_load_id, updated_at = now()
    WHERE carrier_id = p_carrier_id;

    -- Expire all other pending notifications for this load
    UPDATE match_notifications
    SET status = 'backfilled', responded_at = now()
    WHERE load_id = p_load_id AND carrier_id != p_carrier_id AND status = 'pending';

    -- Mark the accepting carrier's notification as accepted
    UPDATE match_notifications
    SET status = 'accepted', responded_at = now()
    WHERE load_id = p_load_id AND carrier_id = p_carrier_id;

    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql;
```

### FastAPI Endpoint Structure

```
/api/v1/
    POST   /match                  Trigger matching for a load (called by Supabase webhook)
    POST   /loads/{id}/accept      Carrier accepts a load
    POST   /loads/{id}/reject      Carrier rejects a load (updates match_notifications)
    GET    /carriers/{id}/matches  Carrier retrieves their pending match notifications
    GET    /loads/{id}/matches     Broker retrieves match status for their load
    GET    /health                 Railway health check endpoint
```

### Environment Variables Required

```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=     # Use service role for server-side writes, never anon key
DATABASE_URL=                   # Direct Postgres URL for RPC functions
SOUTHEAST_STATES=SC,GA,NC,FL
DEFAULT_TOP_K=5
MAX_DEADHEAD_MILES=150
MAX_FRESHNESS_WINDOW_HOURS=72
```

---



- Always use `broker` not `3pl` in code and schema identifiers
- `platform_status == 'approved'` is always the first filter check — it runs before every other filter without exception
- Hard constraint filters always run before scoring — never score ineligible carriers
- Scoring is always multiplicative — never revert to additive
- Outcome logging is non-negotiable — every match event and load outcome must be persisted
- Carrier availability state is managed by Supabase Realtime — the algorithm reads availability, never writes it
- Provisional scores for new carriers: rating 0.6, reliability 0.65, repeat_booking 0.30 — do not use 0.0 defaults
- Default top-K = 5, configurable per load type
- Response windows are dynamic based on hours until pickup, not fixed
- Haul preference mismatch applies a 0.85 multiplier to distance_score — it discounts, never eliminates
- Insurance currency is a hard filter — expired insurance blocks surfacing regardless of any other score
- Payload capacity is a hard filter — never apply tolerance or rounding, never treat as a scored preference
- Trailer type is a hard filter — a type mismatch is a non-match, not a bad match
- Commodity type certification is a hard filter — do not assume a carrier is certified for all commodity types
- `quick_pay_required` on carrier profile and `quick_pay_available` on load are reserved fields — do not implement at launch but include in schema for Phase 2

---

## Required Schema Fields

These fields must exist in the database schema at launch for the hard filter layer to function. Claude Code should treat this as a checklist when building the carriers and loads tables.

**Carrier profile — required fields for hard filters:**
```sql
platform_status          TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'approved' | 'suspended' | 'removed'
temp_capability_min      INTEGER NOT NULL,                  -- minimum temp in °F the unit can hold
temp_capability_max      INTEGER NOT NULL,                  -- maximum temp in °F the unit can hold
equipment_types          TEXT[] NOT NULL,                   -- e.g. ['reefer_53', 'reefer_48']
trailer_type             TEXT NOT NULL,                     -- 'carrier_owned' | 'power_only' | 'both'
max_payload_lbs          INTEGER NOT NULL,                  -- DOT-rated max payload
certified_commodity_types TEXT[] NOT NULL,                  -- e.g. ['produce', 'protein', 'dairy', 'frozen', 'pharma']
haul_preference          TEXT NOT NULL DEFAULT 'any',       -- 'short' | 'long' | 'any'
operating_authority_active BOOLEAN NOT NULL DEFAULT false,
insurance_current        BOOLEAN NOT NULL DEFAULT false,
insurance_expiry_date    DATE,
insurance_coverage_usd   INTEGER,                           -- coverage amount in dollars
capabilities             TEXT[] NOT NULL DEFAULT '{}',      -- custom capability tags
availability_window_start TIMESTAMPTZ,
availability_window_end  TIMESTAMPTZ,
quick_pay_required       BOOLEAN NOT NULL DEFAULT false,    -- reserved, do not use in matching at launch
```

**Load — required fields for hard filters:**
```sql
required_temp_min        INTEGER NOT NULL,
required_temp_max        INTEGER NOT NULL,
required_equipment_types TEXT[] NOT NULL,
required_trailer_type    TEXT,                              -- null means no trailer type requirement
weight_lbs               INTEGER NOT NULL,
commodity_type           TEXT NOT NULL,                     -- single value, must match carrier's certified types
required_coverage_usd    INTEGER,
required_capabilities    TEXT[] NOT NULL DEFAULT '{}',
excluded_carrier_ids     UUID[] NOT NULL DEFAULT '{}',
quick_pay_available      BOOLEAN NOT NULL DEFAULT false,    -- reserved, do not use in matching at launch
```

---

## Future Factors to Add (Post-Launch)

These factors are not in the launch algorithm but schema and logging should accommodate them. They map to the 22+ parameters Uber Freight evaluates beyond their top 3.

- **Reefer unit maintenance recency** — days since last reefer unit service appointment
- **Pre-cool compliance rate** — historical rate of arriving pre-cooled to correct temp spec
- **Partial load / capacity utilization** — available trailer space vs load volume for consolidation opportunities
- **Carrier acceptance rate by load type** — some carriers consistently decline produce vs protein; this predicts future acceptance probability
- **Time-of-day performance pattern** — carriers who perform better on specific departure windows (Uber Freight tracks this explicitly)
- **Dispute rate** — separate from reliability, tracks contested loads and chargebacks specifically
