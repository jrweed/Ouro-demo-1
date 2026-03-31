# CLAUDE.md — ColdHaul: Southeast Reefer Logistics Network

## Project Summary

ColdHaul is a curated, invite-only B2B SaaS platform connecting small/mid-sized refrigerated freight brokers (3PLs) with vetted carriers in the Southeast US. It is NOT a load board — it is a cooperative matching network with AI-powered pricing intelligence.

**Core value proposition:** Pool proprietary transaction data across small 3PLs to give them enterprise-level pricing intelligence, combined with real-time carrier availability from fleet management tools.

**Business model:** 3PLs pay $400/month. Carriers use free. Launch requires 25 3PLs + 75 carriers + 3,000 historical transactions.

**Coverage area:** SC, GA, NC, FL (Southeast US, expandable)

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind CSS | Deploy on Vercel |
| UI Components | shadcn/ui | Extend with custom components per design system |
| Maps | Mapbox GL JS | Free tier sufficient for MVP |
| Auth | Supabase Auth | Email/password + magic link, role-based (3PL, Carrier, Admin) |
| Database | PostgreSQL via Supabase | RLS policies per user role |
| Backend API | Python FastAPI on Railway | ML/pricing engine only |
| ML/Pricing | scikit-learn regression | Bootstrap with DAT RateView API, transition to proprietary model |
| Real-time | Supabase Realtime (Postgres Changes) | For quote notifications, fleet updates |
| File Storage | Supabase Storage | POD uploads, documents |
| Notifications | Bell icon dropdown (in-app only for MVP) | Email notifications Phase 2 |

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│                   Vercel (Frontend)                    │
│  Next.js 14 App Router + TypeScript + Tailwind        │
│  ┌─────────┐ ┌──────────┐ ┌────────────┐             │
│  │ 3PL App │ │Carrier   │ │ Admin      │             │
│  │ Pages   │ │App Pages │ │ Pages      │             │
│  └────┬────┘ └────┬─────┘ └─────┬──────┘             │
│       └───────────┼──────────────┘                    │
│                   ▼                                    │
│         Shared Component Library                       │
│         (shadcn/ui + Custom Components)                │
└───────────────────┬──────────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        ▼                       ▼
┌───────────────┐     ┌─────────────────┐
│  Supabase     │     │  FastAPI on     │
│  (Primary)    │     │  Railway        │
│               │     │  (ML/Pricing)   │
│  - PostgreSQL │     │                 │
│  - Auth       │     │  - /api/pricing │
│  - Realtime   │     │  - /api/match   │
│  - Storage    │     │  - /api/trends  │
└───────────────┘     └─────────────────┘
```

---

## User Roles & Auth

### Roles
1. **3PL (Broker)** — Posts loads, receives/compares quotes, books carriers, tracks deliveries
2. **Carrier** — Manages fleet (trucks/drivers), receives quote requests, submits quotes, updates load status
3. **Driver** (Future) — Simplified mobile access scoped under a carrier account. Status updates + POD upload only. Architect auth to support `driver` as a sub-role of `carrier` with limited permissions.
4. **Admin** — Platform operators. Not priority for MVP but include role in schema.

### Auth Flow
- Supabase Auth with email/password
- Magic link as secondary option
- Role stored in `profiles` table, checked via RLS policies
- Invite-only: New signups require an invite code or admin approval
- Future driver auth: Carrier creates driver accounts, drivers get limited-scope JWT

### Route Protection
```
/dashboard/3pl/*     → requires role: '3pl'
/dashboard/carrier/* → requires role: 'carrier'
/admin/*             → requires role: 'admin'
/onboarding/*        → authenticated but no role restriction
```

---

## Database Schema

### Core Tables

```sql
-- User profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  role TEXT NOT NULL CHECK (role IN ('3pl', 'carrier', 'admin')),
  company_name TEXT NOT NULL,
  mc_number TEXT,  -- Motor Carrier number (carriers)
  dot_number TEXT, -- DOT number (carriers)
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  address_city TEXT,
  address_state TEXT CHECK (address_state IN ('SC', 'GA', 'NC', 'FL')),
  is_verified BOOLEAN DEFAULT FALSE,
  invited_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Carrier trucks
CREATE TABLE trucks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID NOT NULL REFERENCES profiles(id),
  truck_number TEXT NOT NULL,
  equipment_type TEXT NOT NULL CHECK (equipment_type IN ('reefer_single', 'reefer_multi')),
  vin TEXT,
  temp_range_min NUMERIC, -- °F
  temp_range_max NUMERIC, -- °F
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'loaded', 'in_transit', 'maintenance', 'inactive')),
  current_lat NUMERIC,
  current_lng NUMERIC,
  current_city TEXT,
  current_state TEXT,
  location_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Carrier drivers
CREATE TABLE drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID NOT NULL REFERENCES profiles(id),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  license_number TEXT,
  license_state TEXT,
  hours_remaining NUMERIC, -- HOS compliance
  assigned_truck_id UUID REFERENCES trucks(id),
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'driving', 'off_duty', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Loads posted by 3PLs
CREATE TABLE loads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID NOT NULL REFERENCES profiles(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'quoting', 'booked', 'picked_up', 'in_transit', 'delivered', 'cancelled')),

  -- Route
  origin_city TEXT NOT NULL,
  origin_state TEXT NOT NULL,
  origin_lat NUMERIC,
  origin_lng NUMERIC,
  destination_city TEXT NOT NULL,
  destination_state TEXT NOT NULL,
  destination_lat NUMERIC,
  destination_lng NUMERIC,
  distance_miles NUMERIC,

  -- Schedule
  pickup_date DATE NOT NULL,
  pickup_time_start TIME,
  pickup_time_end TIME,
  delivery_date DATE,

  -- Freight details
  equipment_type TEXT NOT NULL CHECK (equipment_type IN ('reefer_single', 'reefer_multi')),
  commodity TEXT NOT NULL,
  temperature NUMERIC NOT NULL, -- °F
  weight_lbs NUMERIC,
  special_requirements TEXT,

  -- Pricing
  target_rate NUMERIC, -- broker's target (optional)
  ai_rate_min NUMERIC, -- AI recommended range
  ai_rate_max NUMERIC,
  ai_confidence TEXT CHECK (ai_confidence IN ('high', 'medium', 'low')),
  booked_rate NUMERIC, -- final booked rate

  -- Booking
  booked_carrier_id UUID REFERENCES profiles(id),
  booked_truck_id UUID REFERENCES trucks(id),
  booked_driver_id UUID REFERENCES drivers(id),
  booked_at TIMESTAMPTZ,

  -- Tracking
  picked_up_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  pod_url TEXT, -- Proof of Delivery file URL

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Quotes from carriers
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  load_id UUID NOT NULL REFERENCES loads(id),
  carrier_id UUID NOT NULL REFERENCES profiles(id),
  truck_id UUID REFERENCES trucks(id),
  driver_id UUID REFERENCES drivers(id),
  rate NUMERIC NOT NULL,
  notes TEXT,
  estimated_pickup_time TIMESTAMPTZ,
  distance_to_pickup NUMERIC, -- miles from truck to origin
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'withdrawn')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(load_id, carrier_id) -- one quote per carrier per load
);

-- Quote requests sent to carriers
CREATE TABLE quote_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  load_id UUID NOT NULL REFERENCES loads(id),
  carrier_id UUID NOT NULL REFERENCES profiles(id),
  truck_id UUID REFERENCES trucks(id), -- which truck was matched
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'viewed', 'quoted', 'declined', 'expired')),
  sent_at TIMESTAMPTZ DEFAULT now(),
  viewed_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ
);

-- In-app notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  type TEXT NOT NULL, -- 'new_quote', 'quote_accepted', 'quote_request', 'load_update', 'delivery_complete'
  title TEXT NOT NULL,
  body TEXT,
  link TEXT, -- internal route to navigate to
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Pricing transaction history (for ML model training)
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  load_id UUID REFERENCES loads(id),
  origin_city TEXT NOT NULL,
  origin_state TEXT NOT NULL,
  destination_city TEXT NOT NULL,
  destination_state TEXT NOT NULL,
  distance_miles NUMERIC,
  equipment_type TEXT,
  commodity TEXT,
  temperature NUMERIC,
  weight_lbs NUMERIC,
  rate NUMERIC NOT NULL,
  rate_per_mile NUMERIC,
  pickup_date DATE,
  season TEXT, -- 'spring', 'summer', 'fall', 'winter'
  source TEXT DEFAULT 'platform', -- 'platform', 'historical_import', 'dat_bootstrap'
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Row Level Security (RLS)

```sql
-- 3PLs can only see their own loads
CREATE POLICY "3pls_own_loads" ON loads
  FOR ALL USING (broker_id = auth.uid());

-- Carriers can see loads they have quote requests for
CREATE POLICY "carriers_quoted_loads" ON loads
  FOR SELECT USING (
    id IN (SELECT load_id FROM quote_requests WHERE carrier_id = auth.uid())
  );

-- Carriers can only manage their own trucks
CREATE POLICY "carriers_own_trucks" ON trucks
  FOR ALL USING (carrier_id = auth.uid());

-- Carriers can only manage their own drivers
CREATE POLICY "carriers_own_drivers" ON drivers
  FOR ALL USING (carrier_id = auth.uid());

-- Quotes: carriers see their own, 3PLs see quotes on their loads
CREATE POLICY "quotes_visibility" ON quotes
  FOR SELECT USING (
    carrier_id = auth.uid()
    OR load_id IN (SELECT id FROM loads WHERE broker_id = auth.uid())
  );

-- Notifications: users see only their own
CREATE POLICY "own_notifications" ON notifications
  FOR ALL USING (user_id = auth.uid());
```

### Key Indexes

```sql
CREATE INDEX idx_trucks_carrier ON trucks(carrier_id);
CREATE INDEX idx_trucks_status ON trucks(status);
CREATE INDEX idx_trucks_location ON trucks(current_lat, current_lng);
CREATE INDEX idx_loads_broker ON loads(broker_id);
CREATE INDEX idx_loads_status ON loads(status);
CREATE INDEX idx_quotes_load ON quotes(load_id);
CREATE INDEX idx_quotes_carrier ON quotes(carrier_id);
CREATE INDEX idx_quote_requests_carrier ON quote_requests(carrier_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_transactions_lane ON transactions(origin_state, destination_state);
```

---

## Design System

### Color Palette

```css
:root {
  /* Primary (Blue) */
  --primary-50: #eff6ff;
  --primary-100: #dbeafe;
  --primary-500: #3b82f6;
  --primary-600: #2563eb;
  --primary-700: #1d4ed8;

  /* Success (Green) */
  --success-50: #f0fdf4;
  --success-500: #22c55e;
  --success-600: #16a34a;

  /* Warning (Yellow/Amber) */
  --warning-50: #fffbeb;
  --warning-500: #f59e0b;
  --warning-600: #d97706;

  /* Danger (Red) */
  --danger-50: #fef2f2;
  --danger-500: #ef4444;
  --danger-600: #dc2626;

  /* Neutral (Gray) */
  --neutral-50: #f9fafb;
  --neutral-100: #f3f4f6;
  --neutral-200: #e5e7eb;
  --neutral-300: #d1d5db;
  --neutral-400: #9ca3af;
  --neutral-500: #6b7280;
  --neutral-600: #4b5563;
  --neutral-700: #374151;
  --neutral-800: #1f2937;
  --neutral-900: #111827;
}
```

Map these to Tailwind config extensions so you can use `bg-primary-500`, `text-danger-600`, etc.

### Typography

```
Font: Inter (import from Google Fonts)
Fallback: system-ui, -apple-system, sans-serif

H1: text-3xl font-bold (30px) — page titles
H2: text-2xl font-semibold (24px) — section headers
H3: text-xl font-semibold (20px) — card titles
H4: text-lg font-medium (18px) — subsections
Body: text-base (16px) — main content
Small: text-sm (14px) — helper text, labels, table content
XS: text-xs (12px) — timestamps, metadata, badges
```

### Spacing

Use Tailwind's default scale consistently: `1 (4px), 2 (8px), 4 (16px), 6 (24px), 8 (32px), 12 (48px)`.

### Border Radius

```
Buttons/badges: rounded-md (6px)
Cards/inputs: rounded-lg (8px)
Modals/large containers: rounded-xl (12px)
```

### Shadows

```
Subtle: shadow-sm — 0 1px 2px rgba(0,0,0,0.05)
Cards: shadow-md — 0 4px 6px rgba(0,0,0,0.1)
Modals/dropdowns: shadow-lg — 0 10px 15px rgba(0,0,0,0.1)
```

### Layout Structure

```
Desktop (1440px):
┌─────────────────────────────────────────────────┐
│  Top Bar (h-16, fixed, z-50, border-b)          │
├────────┬────────────────────────────────────────┤
│ Sidebar│  Main Content                          │
│ w-60   │  max-w-7xl mx-auto px-6 py-6          │
│ fixed  │  overflow-y-auto                       │
│ border │  min-h-screen                          │
│ -r     │                                        │
└────────┴────────────────────────────────────────┘

Sidebar is role-specific:
  3PL: Dashboard, Post Load, My Loads, Quote Inbox, Active Bookings, Pricing Tool, Settings
  Carrier: Dashboard, My Trucks, Drivers, Quote Requests, Active Loads, Settings
```

---

## Page-by-Page Implementation Spec

### Shared Components

Build these first — they're used everywhere:

#### `<AppShell>`
Top bar + sidebar + main content area. Accepts `role` prop to render correct sidebar nav.

#### `<TopBar>`
- Left: ColdHaul logo/wordmark
- Center: (empty for MVP)
- Right: Notification bell (with unread count badge) + User avatar dropdown (Profile, Settings, Logout)

#### `<Sidebar>`
- Role-based navigation links with icons (use Lucide React icons)
- Active state: `bg-primary-50 text-primary-600 font-medium` with left border accent
- Collapsed state for mobile: hamburger menu in TopBar toggles overlay sidebar

#### `<NotificationDropdown>`
- Triggered by bell icon in TopBar
- Shows 10 most recent notifications, grouped by today / earlier
- Each notification: icon (by type), title, body preview, timestamp, unread dot
- "Mark all as read" link at top
- "View all" link at bottom (goes to /notifications page — simple list view)
- Unread count badge on bell: red circle with white number

#### `<StatCard>`
- Props: `label`, `value`, `trend` (optional: +5% up, -3% down), `icon`
- Large value number, small label below, trend badge top-right
- Subtle background color, rounded-lg, shadow-sm

#### `<StatusBadge>`
- Props: `status`, `size` (sm, md)
- Color mapping:
  - available/active/delivered → green
  - loaded/in_transit/pending → blue
  - maintenance/expiring → amber/yellow
  - inactive/cancelled/error → red
  - draft/unknown → gray
- Dot indicator + text label

#### `<ConfidenceBadge>`
- Props: `level` ('high' | 'medium' | 'low')
- High: green bg, "High Confidence"
- Medium: yellow bg, "Medium Confidence"
- Low: red bg, "Low Confidence"

#### `<EmptyState>`
- Props: `icon`, `title`, `description`, `actionLabel`, `actionHref`
- Centered layout, large icon, descriptive text, CTA button
- Use for: no loads, no trucks, no quotes, no notifications

#### `<LoadCard>`
- Compact card showing: origin → destination, date, commodity, temp, status badge
- Used in dashboards, lists, and activity feeds

#### `<TruckCard>`
- Compact card showing: truck #, equipment, driver, status badge, location, last updated timestamp
- Staleness indicator: green dot (<4h), yellow dot (<24h), gray dot (>24h)

#### `<QuoteCard>`
- Compact card showing: carrier name, rate (large), rating stars, distance to pickup, status badge
- Delta from AI rate shown as tag: "+5% above market" (red) or "-3% below market" (green)

#### `<DataTable>`
- Wrapper around shadcn Table with: sorting, filtering, pagination
- Consistent styling: alternating row backgrounds, hover state, inline action buttons

#### `<ConfirmModal>`
- Props: `title`, `description`, `confirmLabel`, `onConfirm`, `variant` ('default' | 'destructive')
- Used for: accepting quotes, cancelling loads, deleting trucks

#### `<AIPricingSidebar>`
- Sticky sidebar component used in Post Load form and Pricing Intelligence tool
- Shows: rate range, confidence badge, lane insights, recent transactions mini-list
- Skeleton loading state while pricing is being fetched
- Updates via debounced API call (500ms after user stops typing origin/destination)

---

### Screen 1: 3PL Dashboard (`/dashboard/3pl`)

**Layout:**
```
┌──────────────────────────────────────────────┐
│ Page Title: "Dashboard"          [+ Post Load]│
├──────────┬──────────┬──────────┬─────────────┤
│ StatCard │ StatCard │ StatCard │ StatCard     │
│ Active   │ Pending  │ Loads    │ Avg Cost     │
│ Loads    │ Quotes   │ This Mo  │ Savings      │
├──────────┴──────────┴──────────┴─────────────┤
│                                               │
│  ┌─── Loads Needing Attention ──────────────┐ │
│  │ LoadCard (3 pending quotes) [View Quotes]│ │
│  │ LoadCard (expiring quote)   [View Quotes]│ │
│  │ LoadCard (no quotes yet)    [Find Trucks]│ │
│  └──────────────────────────────────────────┘ │
│                                               │
│  ┌─── Recent Activity ──────────────────────┐ │
│  │ 🟢 Quote accepted — Charleston→Atlanta    │ │
│  │ 📋 3 new quotes — Savannah→Miami          │ │
│  │ 🚛 Delivered — Jacksonville→Charlotte     │ │
│  │ ...                                       │ │
│  └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

**Data queries:**
- Active loads: `loads WHERE broker_id = user AND status IN ('posted','quoting','booked','picked_up','in_transit')`
- Pending quotes: `quotes WHERE load_id IN (user's loads) AND status = 'pending'` (count)
- Loads this month: `loads WHERE broker_id = user AND created_at >= start_of_month`
- Avg cost savings: Compare `booked_rate` vs `ai_rate_max` across recent loads (% savings)
- Loads needing attention: Loads with pending/expiring quotes or no quotes after 4+ hours
- Recent activity: Last 20 notifications for this user

**Empty state:** "Welcome to ColdHaul! Post your first load to start finding carriers." + [Post Load] CTA

---

### Screen 2: Post Load Form (`/dashboard/3pl/loads/new`)

**Layout:**
```
┌──────────────────────────────────────────────────────┐
│ Page Title: "Post a Load"                             │
│ Progress: ● Route  ○ Schedule  ○ Freight  ○ Pricing   │
├────────────────────────────────┬─────────────────────┤
│                                │                     │
│  Form Fields (2/3 width)       │ AI Pricing Sidebar  │
│                                │ (1/3 width, sticky) │
│  Step 1: Route                 │                     │
│  ┌─────────────────────────┐   │ ┌─────────────────┐ │
│  │ Origin [Charleston, SC] │   │ │ Recommended Rate│ │
│  │ Destination [Atlanta, GA│   │ │ $1,850 - $2,050 │ │
│  └─────────────────────────┘   │ │                 │ │
│                                │ │ ● High Confid.  │ │
│  Step 2: Schedule              │ │                 │ │
│  ┌─────────────────────────┐   │ │ Avg: $1,940     │ │
│  │ Pickup Date [Mar 15]    │   │ │ 47 recent txns  │ │
│  │ Pickup Window [8am-12pm]│   │ │                 │ │
│  │ Delivery Date [Mar 16]  │   │ │ ─── Trend ───   │ │
│  └─────────────────────────┘   │ │ [mini sparkline]│ │
│                                │ │                 │ │
│  Step 3: Freight Details       │ │ Recent loads:   │ │
│  ┌─────────────────────────┐   │ │ $1,900 (Mar 10) │ │
│  │ Equipment [Reefer Single│   │ │ $2,010 (Mar 8)  │ │
│  │ Commodity [Strawberries]│   │ │ $1,875 (Mar 5)  │ │
│  │ Temperature [34 °F]     │   │ └─────────────────┘ │
│  │ Weight [42,000 lbs]     │   │                     │
│  │ Special Reqs [textarea] │   │                     │
│  └─────────────────────────┘   │                     │
│                                │                     │
│  Step 4: Pricing               │                     │
│  ┌─────────────────────────┐   │                     │
│  │ Target Rate [$1,900]    │   │                     │
│  │ ☐ Request quotes instead│   │                     │
│  └─────────────────────────┘   │                     │
│                                │                     │
│         [Back] [Post Load & Find Trucks →]            │
└────────────────────────────────┴─────────────────────┘
```

**Implementation notes:**
- Use a single scrolling form (NOT multi-page wizard). Show all 4 sections on one page with a sticky progress indicator at top that highlights current section based on scroll position.
- Origin/Destination: Use a city/state autocomplete. On selection, geocode to lat/lng (Mapbox Geocoding API).
- AI Pricing Sidebar: Debounced call to FastAPI `/api/pricing/estimate` when origin + destination are both filled. Shows skeleton loader while fetching. Updates again if equipment type or commodity changes.
- "Post Load & Find Trucks" button: Creates load in DB with status `posted`, then redirects to Find Trucks view (`/dashboard/3pl/loads/[id]/find-trucks`).

**Validation:**
- Required: origin, destination, pickup_date, equipment_type, commodity, temperature
- Optional: pickup time window, delivery date, weight, special requirements, target rate

---

### Screen 3: Find Trucks — Map View (`/dashboard/3pl/loads/[id]/find-trucks`)

**Layout:**
```
┌──────────────────────────────────────────────────────┐
│ Load Summary Bar:                                     │
│ Charleston, SC → Atlanta, GA | Mar 15 | Strawberries  │
│ | 34°F | Reefer Single    [Edit Load] [Back to Loads] │
├────────────┬─────────────────────────────────────────┤
│ Filters    │                                         │
│            │         Mapbox Map                       │
│ Distance:  │                                         │
│ ○ 50 mi    │    📍 (blue) Origin                     │
│ ● 100 mi   │    📍 (gray) Destination                │
│ ○ 200 mi   │    🚛 (green) Available trucks          │
│            │    🚛 (yellow) Stale location            │
│ Min Rating:│                                         │
│ ☑ 4+ stars │                                         │
│            │                                         │
│ Equip Match│                                         │
│ ☑ Yes      │                                         │
│            │                                         │
│ [Request   │                                         │
│  All (7)]  │                                         │
├────────────┴─────────────────────────────────────────┤
│ Matched Trucks (7 found)              Sort: Distance ▾│
│ ┌────────────────┐┌────────────────┐┌───────────────┐│
│ │ Truck #207     ││ Truck #44      ││ Truck #112    ││
│ │ Coastal Reefer ││ Palmetto Cold  ││ Dixie Freight ││
│ │ 18 mi away     ││ 34 mi away     ││ 67 mi away    ││
│ │ ⭐ 4.8         ││ ⭐ 4.6         ││ ⭐ 4.9         ││
│ │ Est. $1,920    ││ Est. $1,880    ││ Est. $1,950   ││
│ │ [Request Quote]││ [Request Quote]││ [Request Quote]││
│ └────────────────┘└────────────────┘└───────────────┘│
└──────────────────────────────────────────────────────┘
```

**Implementation notes:**
- Map: Mapbox GL JS. Center on origin, show radius circle based on selected filter distance.
- Truck markers: Custom markers. Green for fresh location (<4h), yellow for stale (<24h), gray for old (>24h). Hover shows popup with truck details.
- Matched trucks query: Find trucks where `status = 'available'` AND within selected distance of origin AND equipment matches. Use PostGIS `ST_DWithin` or calculate distance in app layer for MVP.
- "Request Quote" fires immediately (no confirmation modal). Creates `quote_request` record, sends notification to carrier. Button changes to "Requested ✓" (disabled).
- "Request All" sends to all matched trucks at once with confirmation: "Send quote requests to 7 carriers?"
- List and map are synchronized: clicking a card highlights the marker, clicking a marker scrolls to the card.

---

### Screen 4: Quote Inbox (`/dashboard/3pl/quotes`)

**Layout:**
```
┌──────────────────────────────────────────────────────┐
│ Page Title: "Quote Inbox"                             │
│ Tabs: [All (12)] [New (5)] [Expiring Soon (2)] [Accepted]│
├──────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────┐   │
│ │ 📦 Charleston, SC → Atlanta, GA                │   │
│ │    Mar 15 | Strawberries | 34°F                │   │
│ │    Posted 3 hours ago · 5 quotes received      │   │
│ │                                                │   │
│ │    ┌──────────┐ ┌──────────┐ ┌──────────┐     │   │
│ │    │$1,880    │ │$1,920    │ │$1,950    │     │   │
│ │    │Palmetto  │ │Coastal   │ │Dixie     │     │   │
│ │    │⭐4.6 34mi│ │⭐4.8 18mi│ │⭐4.9 67mi│     │   │
│ │    └──────────┘ └──────────┘ └──────────┘     │   │
│ │    +2 more quotes         [Compare All Quotes] │   │
│ └────────────────────────────────────────────────┘   │
│                                                       │
│ ┌────────────────────────────────────────────────┐   │
│ │ ⚠️ Savannah, GA → Miami, FL                    │   │
│ │    Mar 18 | Frozen Shrimp | 0°F                │   │
│ │    Posted 6 hours ago · 2 quotes · ⚠️ Expiring │   │
│ │    ...                                         │   │
│ └────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

**Implementation notes:**
- Tab counts are real-time (Supabase Realtime subscription on quotes table)
- Show top 3 quotes inline per load (sorted by rate, lowest first)
- "+N more quotes" links to Quote Comparison View
- Expiring quotes: amber/red accent border, warning icon, "Expires in 2 hours" tag
- "Compare All Quotes" navigates to `/dashboard/3pl/loads/[id]/quotes`

---

### Screen 5: Quote Comparison View (`/dashboard/3pl/loads/[id]/quotes`)

**Layout:**
```
┌──────────────────────────────────────────────────────┐
│ ← Back to Quote Inbox                                 │
│                                                       │
│ Load: Charleston, SC → Atlanta, GA                    │
│ Mar 15 | Strawberries | 34°F | 42,000 lbs            │
│                                                       │
│ AI Market Rate: $1,850 - $2,050 (High Confidence)     │
├──────────────────────────────────────────────────────┤
│ Sort: [Price ▴] [Rating] [Distance]                   │
│ ┌─────────┬────────┬────────┬──────┬────────┬───────┐│
│ │ Carrier │ Rate   │ Rating │ Dist │ Equip  │Action ││
│ ├─────────┼────────┼────────┼──────┼────────┼───────┤│
│ │Palmetto │$1,880  │ ⭐4.6  │ 34mi │ Match ✓│[Accept││
│ │  Cold   │-3% mkt │        │      │        │       ││
│ ├─────────┼────────┼────────┼──────┼────────┼───────┤│
│ │Coastal  │$1,920  │ ⭐4.8  │ 18mi │ Match ✓│[Accept││
│ │  Reefer │ at mkt │        │      │        │       ││
│ ├─────────┼────────┼────────┼──────┼────────┼───────┤│
│ │Dixie    │$1,950  │ ⭐4.9  │ 67mi │ Match ✓│[Accept││
│ │ Freight │+3% mkt │        │      │        │       ││
│ └─────────┴────────┴────────┴──────┴────────┴───────┘│
│                                                       │
│ 💡 Best Value: Coastal Reefer — lowest price with 4.5+│
│    rating and closest truck                           │
└──────────────────────────────────────────────────────┘
```

**Implementation notes:**
- Table sortable by rate, rating, distance
- Rate column shows delta from AI midpoint: green if below, red if above, neutral if within ±2%
- "Best Value" recommendation: Lowest rate among carriers with 4.5+ rating
- "Accept" opens ConfirmModal: "Book Coastal Reefer for $1,920? This will notify the carrier and decline all other quotes."
- On accept: Update load status to `booked`, update quote status to `accepted`, all other quotes to `declined`, create notifications

---

### Screen 6: Carrier Dashboard (`/dashboard/carrier`)

**Layout:**
```
┌──────────────────────────────────────────────────────┐
│ Page Title: "Dashboard"                    [+ Add Truck]│
├──────────┬──────────┬──────────┬─────────────────────┤
│ StatCard │ StatCard │ StatCard │ StatCard             │
│ Total    │ Available│ Active   │ Quote                │
│ Trucks:5 │ Trucks:2 │ Loads:2  │ Requests:4           │
├──────────┴──────────┴──────────┴─────────────────────┤
│                                                       │
│  ┌─── My Fleet ────────────────────────────────────┐  │
│  │ Truck   │ Equipment    │ Driver   │ Status │ Loc │  │
│  │ #207    │ Reefer Single│ Joe M.   │ 🟢 Avail│ Chs│  │
│  │ #44     │ Reefer Single│ Mike R.  │ 🔵 Loaded│ Sav│  │
│  │ #112    │ Reefer Multi │ — unassn │ 🔴 Maint │ Jax│  │
│  │ #89     │ Reefer Single│ Tony L.  │ 🔵 Transit│Atl│  │
│  │ #301    │ Reefer Single│ Sam K.   │ 🟢 Avail│ Mia│  │
│  │                              [View All Trucks →]  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                       │
│  ┌─── New Quote Requests ──────────────────────────┐  │
│  │ 📦 Charleston→Atlanta | Mar 15 | Strawberries   │  │
│  │    Matched: Truck #207 (18 mi away)   [View →]  │  │
│  │ 📦 Savannah→Miami | Mar 18 | Frozen Shrimp      │  │
│  │    Matched: Truck #44 (12 mi away)    [View →]  │  │
│  │ 📦 Jacksonville→Charlotte | Mar 20 | Produce    │  │
│  │    Matched: Truck #301 (89 mi away)   [View →]  │  │
│  │                          [View All Requests →]   │  │
│  └──────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

**Data queries:**
- Fleet stats: Count trucks by status for this carrier
- Active loads: Loads where `booked_carrier_id = user AND status IN ('booked','picked_up','in_transit')`
- Quote requests: `quote_requests WHERE carrier_id = user AND status = 'sent'` (unresponded)
- My Fleet: `trucks WHERE carrier_id = user` (show top 5, link to full fleet view)

**Empty state:** "Welcome to ColdHaul! Add your first truck to start receiving load matches." + [Add Truck] CTA

---

### Screen 7: My Trucks — Fleet Management (`/dashboard/carrier/trucks`)

**Layout:** Full DataTable with expandable rows.

**Collapsed row:** Truck #, Equipment Type, Driver Name, Status Badge, Location (city, state), Last Updated (with staleness indicator)

**Expanded row:** VIN, temp range, current load details (if loaded), GPS coordinates, driver hours remaining, action buttons (Edit Truck, Update Status, Assign Driver)

**Top bar:** [+ Add Truck] button, fleet summary stats (Total: 10, Available: 3, Loaded: 5, Maintenance: 2), filter dropdown (All, Available, Loaded, Maintenance)

**Add Truck modal/page:**
- Truck Number (required)
- Equipment Type: Reefer Single-Temp / Reefer Multi-Temp (required)
- VIN (optional)
- Min Temperature (°F)
- Max Temperature (°F)
- Assign Driver (dropdown of unassigned drivers)

---

### Screen 8: Carrier Onboarding (`/onboarding/carrier`)

**Purpose:** First-time carrier setup after account creation. Guided flow to add trucks and drivers.

**Layout:** Full-width centered card (no sidebar), stepped wizard.

```
Step 1: Company Details
- Company Name (pre-filled from signup)
- MC Number (required)
- DOT Number (required)
- Primary Contact Phone

Step 2: Add Your Trucks (minimum 1)
- Repeatable "Add Truck" cards
- Each card: Truck Number, Equipment Type, VIN (optional), Temp Range
- [+ Add Another Truck] button
- Show count: "2 trucks added"

Step 3: Add Your Drivers (minimum 1)
- Repeatable "Add Driver" cards
- Each card: Driver Name, Phone, License Number, License State
- [+ Add Another Driver] button

Step 4: Assign Drivers to Trucks
- Drag-and-drop or dropdown assignment
- Show unassigned trucks / unassigned drivers
- Allow "assign later" for any

Step 5: Set Truck Locations
- For each truck: City/State autocomplete OR "Use current location" button
- Explain: "We use truck locations to match you with nearby loads. Keep these updated for best results."

[Complete Setup →] → redirects to Carrier Dashboard
```

**Design notes:**
- Progress bar at top (Step 1 of 5)
- Allow skip for optional fields but enforce minimums (1 truck, 1 driver)
- Success state at end: "You're all set! You'll start receiving quote requests as loads match your trucks."
- Store onboarding_complete flag on profile to prevent re-showing

---

### Screen 9: Quote Request Detail — Carrier View (`/dashboard/carrier/quote-requests/[id]`)

**Layout:**
```
┌──────────────────────────────────────────────────────┐
│ ← Back to Quote Requests                              │
│                                                       │
│ Load Details                                          │
│ Charleston, SC → Atlanta, GA                          │
│ Pickup: Mar 15, 8:00 AM - 12:00 PM                   │
│ Delivery: Mar 16                                      │
│ Commodity: Strawberries | Temp: 34°F | 42,000 lbs     │
│ Equipment: Reefer Single-Temp                         │
│ Special Reqs: "Must maintain 32-36°F, no stops"       │
│                                                       │
│ ┌─── Your Best Match ──────────────────────────────┐  │
│ │ 🚛 Truck #207 (Joe M. driving)                   │  │
│ │ 18 miles from pickup · Available tomorrow 8am     │  │
│ │ Equipment: Reefer Single-Temp ✓ · Temp: 28-45°F ✓│  │
│ └──────────────────────────────────────────────────┘  │
│                                                       │
│ ┌─── Submit Your Quote ────────────────────────────┐  │
│ │ AI Suggested Rate: $1,850 - $2,050               │  │
│ │                                                  │  │
│ │ Your Rate: [$1,920        ]                      │  │
│ │ Truck:     [Truck #207 ▾  ]                      │  │
│ │ Est. Pickup: [Mar 15, 9:00 AM]                   │  │
│ │ Notes: [Can pick up 2 hours earlier if needed ]  │  │
│ │                                                  │  │
│ │        [Decline]              [Submit Quote →]   │  │
│ └──────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

**Implementation notes:**
- Pre-fill rate with AI midpoint recommendation
- Pre-select best matching truck
- "Submit Quote" creates quote record, updates quote_request status to `quoted`, notifies 3PL
- "Decline" updates quote_request status to `declined` with optional reason

---

### Screen 10: Active Bookings — 3PL View (`/dashboard/3pl/bookings`)

Card list of booked/in-progress loads with status timeline:
`Confirmed → Picked Up → In Transit → Delivered`

Each card: Load details, carrier name, truck #, driver name/phone, status with progress bar, ETA, [Contact Carrier] button.

---

### Screen 11: Active Loads — Carrier View (`/dashboard/carrier/loads`)

Card list of loads assigned to carrier's trucks. Each card: Truck # assigned, driver, load details, status timeline, action buttons: [Mark Picked Up], [Mark In Transit], [Mark Delivered], [Upload POD].

POD upload: Opens file picker, uploads to Supabase Storage, saves URL to `loads.pod_url`.

---

### Screen 12: Pricing Intelligence Tool — 3PL (`/dashboard/3pl/pricing`)

Standalone pricing research page (no load creation).

**Input form:** Origin, Destination, Date (optional), Equipment Type, Commodity

**Output (same AIPricingSidebar but full-width):**
- Recommended rate range + confidence
- Historical price chart (last 90 days, Recharts line chart)
- Seasonality trend ("Strawberry season peaks in April — expect +8% rates")
- Recent comparable transactions table (date, lane, rate, equipment)

---

### Screen 13: Settings & Profile (`/dashboard/settings`)

Tabbed layout: Profile, Notifications, Billing (3PL only), Team (Phase 2)

- **Profile:** Company name, MC/DOT numbers, contact info, address. Edit inline.
- **Notifications:** Toggle on/off by type: New Quote, Quote Accepted, Quote Request, Load Update, Delivery Complete. (All in-app bell for MVP; email toggles shown but disabled with "Coming soon" tag)
- **Billing (3PL):** Current plan ($400/month), payment method (Stripe integration placeholder), invoice history. Free trial countdown if applicable.
- **Team:** "Coming soon" placeholder. Will support adding team members with role-based permissions.

---

## FastAPI Pricing Engine (`/api/`)

### Endpoints

```
POST /api/pricing/estimate
  Input: { origin, destination, equipment_type, commodity, temperature, date }
  Output: { rate_min, rate_max, confidence, avg_rate, transaction_count, recent_transactions[], trend_data[] }

POST /api/pricing/match-trucks
  Input: { origin_lat, origin_lng, distance_miles, equipment_type, temp_required }
  Output: { trucks[]: { id, truck_number, carrier_name, distance, rating, equipment, est_rate } }

GET /api/pricing/lane-history
  Input: { origin_state, destination_state, equipment_type, days_back }
  Output: { transactions[], avg_rate, trend_direction, seasonality_factor }
```

### ML Model (Phase 1: Simple)

Start with scikit-learn linear regression on historical transactions:
- Features: distance, equipment_type, commodity_category, temperature, season, day_of_week
- Target: rate_per_mile
- Bootstrap training data from DAT RateView API (3,000 transactions minimum)
- Retrain weekly as platform transactions accumulate
- Confidence = f(transaction_count, recency, lane_specificity)
  - High: 20+ recent transactions on this exact lane
  - Medium: 10-19 transactions or similar lanes
  - Low: <10 transactions, extrapolating from regional data

---

## Real-time Features (Supabase Realtime)

Subscribe to Postgres changes for:
1. **New quotes on my loads** (3PL) — update quote count badge, show notification
2. **New quote requests** (Carrier) — show notification badge
3. **Load status changes** (both) — update status in active bookings/loads
4. **Truck location updates** (Carrier fleet) — refresh map markers

Implementation: Use Supabase client's `.channel()` API with Postgres Changes listener.

---

## File Structure

```
coldhual/
├── app/
│   ├── layout.tsx              # Root layout with Inter font, providers
│   ├── page.tsx                # Landing/marketing page (simple for MVP)
│   ├── login/page.tsx          # Auth page
│   ├── signup/page.tsx         # Signup with invite code
│   ├── onboarding/
│   │   └── carrier/page.tsx    # Carrier onboarding wizard
│   ├── dashboard/
│   │   ├── layout.tsx          # AppShell (TopBar + Sidebar + Content)
│   │   ├── 3pl/
│   │   │   ├── page.tsx                    # 3PL Dashboard
│   │   │   ├── loads/
│   │   │   │   ├── page.tsx                # My Loads list
│   │   │   │   ├── new/page.tsx            # Post Load form
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx            # Load detail
│   │   │   │       ├── find-trucks/page.tsx # Map view
│   │   │   │       └── quotes/page.tsx     # Quote comparison
│   │   │   ├── quotes/page.tsx             # Quote Inbox
│   │   │   ├── bookings/page.tsx           # Active Bookings
│   │   │   └── pricing/page.tsx            # Pricing Intelligence
│   │   ├── carrier/
│   │   │   ├── page.tsx                    # Carrier Dashboard
│   │   │   ├── trucks/page.tsx             # Fleet Management
│   │   │   ├── drivers/page.tsx            # Driver Management
│   │   │   ├── quote-requests/
│   │   │   │   ├── page.tsx                # Quote Request list
│   │   │   │   └── [id]/page.tsx           # Quote Request detail
│   │   │   └── loads/page.tsx              # Active Loads
│   │   └── settings/page.tsx               # Settings (both roles)
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx
│   │   ├── TopBar.tsx
│   │   ├── Sidebar.tsx
│   │   └── NotificationDropdown.tsx
│   ├── shared/
│   │   ├── StatCard.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── ConfidenceBadge.tsx
│   │   ├── EmptyState.tsx
│   │   ├── LoadCard.tsx
│   │   ├── TruckCard.tsx
│   │   ├── QuoteCard.tsx
│   │   ├── DataTable.tsx
│   │   └── ConfirmModal.tsx
│   ├── loads/
│   │   ├── PostLoadForm.tsx
│   │   ├── AIPricingSidebar.tsx
│   │   ├── LoadSummaryBar.tsx
│   │   └── QuoteComparisonTable.tsx
│   ├── trucks/
│   │   ├── TruckTable.tsx
│   │   ├── AddTruckForm.tsx
│   │   └── TruckLocationMap.tsx
│   ├── quotes/
│   │   ├── QuoteInboxList.tsx
│   │   ├── QuoteRequestCard.tsx
│   │   └── SubmitQuoteForm.tsx
│   └── maps/
│       ├── FindTrucksMap.tsx
│       └── TruckMarker.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # Browser Supabase client
│   │   ├── server.ts           # Server-side Supabase client
│   │   ├── middleware.ts        # Auth middleware
│   │   └── types.ts            # Generated DB types
│   ├── api/
│   │   └── pricing.ts          # FastAPI client helpers
│   ├── mapbox/
│   │   └── config.ts           # Mapbox token + helpers
│   └── utils/
│       ├── formatting.ts       # Currency, date, distance formatters
│       ├── constants.ts        # Status colors, equipment types, states list
│       └── validation.ts       # Zod schemas for forms
├── hooks/
│   ├── useAuth.ts              # Auth state hook
│   ├── useProfile.ts           # Current user profile
│   ├── useRealtime.ts          # Supabase Realtime subscription wrapper
│   └── useNotifications.ts     # Notification state + mark read
├── styles/
│   └── globals.css             # Tailwind + CSS variables
├── public/
│   └── ...
├── tailwind.config.ts          # Extended with design system colors
├── next.config.js
├── package.json
└── tsconfig.json
```

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=

# FastAPI Pricing Engine
NEXT_PUBLIC_PRICING_API_URL=

# Stripe (Phase 2)
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

---

## Development Priorities

### Phase 1 (MVP — Build First)
1. Auth + role-based routing + profile setup
2. Carrier onboarding wizard
3. Fleet management (add trucks, drivers, assign, update status)
4. Post Load form with AI pricing sidebar (mock pricing initially)
5. Find Trucks map view with Mapbox
6. Quote request flow (3PL → Carrier)
7. Quote submission flow (Carrier → 3PL)
8. Quote inbox + comparison view
9. Accept quote → booking flow
10. 3PL Dashboard + Carrier Dashboard
11. Notifications (bell icon)

### Phase 2 (Post-Launch)
1. Active bookings tracking + status updates
2. POD upload
3. Pricing Intelligence standalone tool
4. Email notifications
5. Historical pricing charts (Recharts)
6. Carrier ratings system
7. Billing / Stripe integration
8. Team management (multi-user per company)
9. Driver mobile app (separate Next.js PWA or React Native)

### Phase 3 (Growth)
1. Real ML model training on proprietary data
2. Expand to additional states
3. Shipper portal (Phase 3+ consideration)
4. Advanced analytics dashboard
5. API for integrations with existing TMS platforms

---

## Key Design Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Map provider | Mapbox GL JS | Better free tier, custom styling, clustering |
| AI pricing update | Live (debounced 500ms) | Better UX, more impressive for demos |
| Quote request | Fire-and-forget (no modal) | Reduce friction, 3PLs want speed |
| Notifications | Bell icon dropdown only | Simple for MVP, email Phase 2 |
| Mobile | Responsive web, no native app | MVP speed, driver app architected for later |
| Onboarding | Full carrier wizard | Critical for data quality at launch |
| Empty states | Detailed with CTAs | First 25 3PLs all see them, onboarding matters |
| Form style | Single scrolling page with sticky progress | Faster than multi-page wizard, less disorienting |
| Driver auth | Future sub-role under carrier | Architected now, built later |
| Platform name | ColdHaul (placeholder) | Replace when final branding decided |
