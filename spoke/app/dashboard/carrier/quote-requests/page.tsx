"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Inbox,
  MapPin,
  Package,
  Thermometer,
  Truck,
  Calendar,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Bell,
  Star,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";
import {
  getConversationsByCarrier,
  sendOffer,
  respondToOffer,
  updateConversationTruck,
} from "@/lib/conversations";
import { addNotification } from "@/lib/notifications";
import { getTrucks, getDrivers, type Truck as TruckData, type Driver } from "@/lib/fleet";

// ─── Deadhead distance estimation ─────────────────────────────────────────────

const CITY_COORDS: Record<string, [number, number]> = {
  "charleston_sc":    [32.7765, -79.9311],
  "atlanta_ga":       [33.7490, -84.3880],
  "savannah_ga":      [32.0835, -81.0998],
  "jacksonville_fl":  [30.3322, -81.6557],
  "miami_fl":         [25.7617, -80.1918],
  "charlotte_nc":     [35.2271, -80.8431],
  "tampa_fl":         [27.9506, -82.4572],
  "nashville_tn":     [36.1627, -86.7816],
  "memphis_tn":       [35.1495, -90.0490],
  "new_orleans_la":   [29.9511, -90.0715],
  "houston_tx":       [29.7604, -95.3698],
  "dallas_tx":        [32.7767, -96.7970],
  "birmingham_al":    [33.5186, -86.8104],
  "columbia_sc":      [34.0007, -81.0348],
  "orlando_fl":       [28.5383, -81.3792],
  "raleigh_nc":       [35.7796, -78.6382],
  "richmond_va":      [37.5407, -77.4360],
  "norfolk_va":       [36.8507, -76.2859],
  "greensboro_nc":    [36.0726, -79.7920],
};

function cityKey(city: string, state: string): string {
  return `${city.toLowerCase().replace(/\s+/g, "_")}_${state.toLowerCase()}`;
}

function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function estimateDeadhead(truckCity: string, truckState: string, pickupLocation: string): number | null {
  const truckCoord = CITY_COORDS[cityKey(truckCity, truckState)];
  const match = pickupLocation.match(/^([^,]+),\s*([A-Z]{2})/);
  if (!match) return null;
  const pickupCoord = CITY_COORDS[cityKey(match[1].trim(), match[2].trim())];
  if (!truckCoord || !pickupCoord) return null;
  return Math.round(haversineMiles(truckCoord[0], truckCoord[1], pickupCoord[0], pickupCoord[1]));
}

// ─── Truck picker ─────────────────────────────────────────────────────────────

type TruckWithMeta = TruckData & { deadhead: number | null; driverName: string | null };

function TruckPicker({
  trucks,
  drivers,
  pickupLocation,
  selectedId,
  onSelect,
}: {
  trucks: TruckData[];
  drivers: Driver[];
  pickupLocation: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const withMeta: TruckWithMeta[] = trucks.map((t) => ({
    ...t,
    deadhead: estimateDeadhead(t.city, t.state, pickupLocation),
    driverName: drivers.find((d) => d.assignedTruckId === t.id)?.name ?? null,
  }));

  const available = withMeta
    .filter((t) => t.status === "available")
    .sort((a, b) => {
      if (a.deadhead === null && b.deadhead === null) return 0;
      if (a.deadhead === null) return 1;
      if (b.deadhead === null) return -1;
      return a.deadhead - b.deadhead;
    });
  const unavailable = withMeta.filter((t) => t.status !== "available");
  const all = [...available, ...unavailable];

  if (all.length === 0) {
    return (
      <p className="mt-2 text-[12px] text-[#9ca3af] italic">
        No trucks in your fleet. Add trucks in the Fleet tab.
      </p>
    );
  }

  return (
    <div className="mt-3 flex flex-col gap-1.5">
      {all.map((truck, i) => {
        const isAvail = truck.status === "available";
        const isSelected = selectedId === truck.id;
        const isRecommended = i === 0 && isAvail;
        return (
          <button
            key={truck.id}
            type="button"
            onClick={() => isAvail && onSelect(truck.id)}
            disabled={!isAvail}
            className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all ${
              isSelected
                ? "border-[#3b82f6] bg-[#eff6ff]"
                : isAvail
                ? "border-[#e5e7eb] bg-white hover:border-[#93c5fd] hover:bg-[#f9fafb]"
                : "cursor-not-allowed border-[#f3f4f6] bg-[#fafafa] opacity-50"
            }`}
          >
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isSelected ? "bg-[#dbeafe]" : "bg-[#f3f4f6]"}`}>
              <Truck size={14} className={isSelected ? "text-[#3b82f6]" : "text-[#6b7280]"} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[13px] font-semibold text-[#111827]">
                  Truck {truck.truckNum}
                </span>
                {isRecommended && (
                  <span className="flex items-center gap-0.5 rounded-full bg-[#3b82f6] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    <Star size={8} fill="white" /> Best match
                  </span>
                )}
                {!isAvail && (
                  <span className="text-[11px] text-[#9ca3af] capitalize">
                    ({truck.status.replace("_", " ")})
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[#6b7280]">
                <span>{truck.year} {truck.make} {truck.model}</span>
                <span>·</span>
                <span className="flex items-center gap-0.5">
                  <MapPin size={9} /> {truck.city}, {truck.state}
                </span>
                {truck.deadhead !== null && (
                  <>
                    <span>·</span>
                    <span className={truck.deadhead < 50 ? "font-medium text-[#16a34a]" : ""}>
                      ~{truck.deadhead} mi deadhead
                    </span>
                  </>
                )}
                {truck.driverName && (
                  <>
                    <span>·</span>
                    <span>Driver: {truck.driverName}</span>
                  </>
                )}
              </div>
            </div>
            {isSelected && <CheckCircle2 size={15} className="shrink-0 text-[#3b82f6]" />}
          </button>
        );
      })}
    </div>
  );
}

// ─── Types ─────────────────────────────────────────────────────────────────────

type RequestStatus = "new" | "quoted" | "accepted" | "declined";

interface QuoteRequest {
  id: string;
  /** convId from ch_conversations — present for real (non-demo) requests */
  convId?: string;
  // Load details sent by the broker
  origin: string;
  destination: string;
  pickupDate: string;
  commodity: string;
  temperatureF: number;
  weightLbs: number;
  equipmentType: string;
  distanceMiles: number;
  // The broker's offered amount (shown as context in the quote form)
  brokerRateMin: number;
  brokerRateMax: number;
  // Which truck was matched
  truckNum: string;
  distanceMiToPickup: number;
  // Broker who sent the request
  brokerName: string;
  brokerCompany: string;
  // Timing
  receivedAt: string; // ISO timestamp
  // State for this session
  status: RequestStatus;
  quotedRate: number | null; // carrier's submitted quote
  quotedAt: string | null;
}

// ─── SessionStorage helpers ───────────────────────────────────────────────────

function getStoredLoads(): Array<Record<string, string | number | undefined>> {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(sessionStorage.getItem("ch_loads") || "[]");
  } catch {
    return [];
  }
}

function buildFromConversations(): QuoteRequest[] {
  const convs = getConversationsByCarrier();
  const loads = getStoredLoads();

  return convs
    .filter((c) => c.offer !== null)
    .map((conv) => {
      const offer = conv.offer!;
      const load = loads.find((l) => l.id === conv.loadId);

      let status: RequestStatus;
      if (offer.status === "accepted") status = "accepted";
      else if (offer.status === "declined") status = "declined";
      else if (offer.from === "carrier") status = "quoted";
      else status = "new"; // pending offer from broker

      const quotedRate =
        offer.from === "carrier" && offer.status === "pending"
          ? offer.amount
          : null;

      return {
        id: conv.id,
        convId: conv.id,
        origin: conv.origin,
        destination: conv.destination,
        pickupDate: (load?.pickupDate as string) || "",
        commodity: (load?.commodity as string) || "—",
        temperatureF: load?.temperature
          ? parseFloat(load.temperature as string)
          : 0,
        weightLbs: (load?.weightLbs as number) || 0,
        equipmentType: (load?.equipmentType as string) || "—",
        distanceMiles: (load?.distanceMiles as number) || 0,
        brokerRateMin: offer.amount,
        brokerRateMax: offer.amount,
        truckNum: conv.truckNum || "—",
        distanceMiToPickup: 0,
        brokerName: "Broker",
        brokerCompany: conv.carrierName || "—",
        receivedAt: offer.timestamp,
        status,
        quotedRate,
        quotedAt: quotedRate ? offer.timestamp : null,
      } satisfies QuoteRequest;
    });
}

// ─── Demo data ────────────────────────────────────────────────────────────────
// TODO: Replace with Supabase query:
//   SELECT qr.*, loads.*, brokers.company_name
//   FROM quote_requests qr
//   JOIN loads ON loads.id = qr.load_id
//   JOIN users brokers ON brokers.id = qr.broker_id
//   WHERE qr.carrier_id = auth.uid()
//   ORDER BY qr.created_at DESC
//
// Supabase Realtime subscription for new requests:
//   supabase.channel('quote_requests')
//     .on('postgres_changes', { event: 'INSERT', schema: 'public',
//         table: 'quote_requests', filter: `carrier_id=eq.${carrierId}` },
//         (payload) => setRequests(prev => [mapRow(payload.new), ...prev]))
//     .subscribe()
const DEMO_REQUESTS: QuoteRequest[] = [
  {
    id: "qr1",
    origin: "Charleston, SC",
    destination: "Atlanta, GA",
    pickupDate: "2026-03-15",
    commodity: "Strawberries",
    temperatureF: 34,
    weightLbs: 42000,
    equipmentType: "Reefer Single-Temp",
    distanceMiles: 295,
    brokerRateMin: 1750,
    brokerRateMax: 1940,
    truckNum: "#207",
    distanceMiToPickup: 18,
    brokerName: "Alex Carter",
    brokerCompany: "Lowcountry Logistics",
    receivedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    status: "new",
    quotedRate: null,
    quotedAt: null,
  },
  {
    id: "qr2",
    origin: "Savannah, GA",
    destination: "Miami, FL",
    pickupDate: "2026-03-18",
    commodity: "Frozen Shrimp",
    temperatureF: 0,
    weightLbs: 38500,
    equipmentType: "Reefer Single-Temp",
    distanceMiles: 680,
    brokerRateMin: 3200,
    brokerRateMax: 3600,
    truckNum: "#44",
    distanceMiToPickup: 12,
    brokerName: "Alex Carter",
    brokerCompany: "Lowcountry Logistics",
    receivedAt: new Date(Date.now() - 65 * 60 * 1000).toISOString(),
    status: "new",
    quotedRate: null,
    quotedAt: null,
  },
  {
    id: "qr3",
    origin: "Jacksonville, FL",
    destination: "Charlotte, NC",
    pickupDate: "2026-03-20",
    commodity: "Produce Mix",
    temperatureF: 36,
    weightLbs: 44000,
    equipmentType: "Reefer Single-Temp",
    distanceMiles: 510,
    brokerRateMin: 2400,
    brokerRateMax: 2750,
    truckNum: "#301",
    distanceMiToPickup: 89,
    brokerName: "Alex Carter",
    brokerCompany: "Lowcountry Logistics",
    receivedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    status: "new",
    quotedRate: null,
    quotedAt: null,
  },
  {
    id: "qr4",
    origin: "Atlanta, GA",
    destination: "Savannah, GA",
    pickupDate: "2026-03-22",
    commodity: "Dairy",
    temperatureF: 38,
    weightLbs: 35000,
    equipmentType: "Reefer Multi-Temp",
    distanceMiles: 248,
    brokerRateMin: 1400,
    brokerRateMax: 1600,
    truckNum: "#89",
    distanceMiToPickup: 5,
    brokerName: "Alex Carter",
    brokerCompany: "Lowcountry Logistics",
    receivedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    status: "new",
    quotedRate: null,
    quotedAt: null,
  },
];

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  RequestStatus,
  { label: string; bg: string; color: string; dot: string }
> = {
  new: { label: "New", bg: "#eff6ff", color: "#2563eb", dot: "#3b82f6" },
  quoted: { label: "Quoted", bg: "#fffbeb", color: "#d97706", dot: "#f59e0b" },
  accepted: { label: "Accepted", bg: "#f0fdf4", color: "#16a34a", dot: "#22c55e" },
  declined: { label: "Declined", bg: "#f9fafb", color: "#6b7280", dot: "#9ca3af" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(isoString: string) {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatPickupDate(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Quote input component ─────────────────────────────────────────────────────

function QuoteInput({
  request,
  onSubmit,
  onDecline,
}: {
  request: QuoteRequest;
  onSubmit: (id: string, rate: number, truckNum: string, driverName: string) => void;
  onDecline: (id: string) => void;
}) {
  const [rate, setRate] = useState("");
  const [error, setError] = useState("");
  const [trucks, setTrucks] = useState<TruckData[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedTruckId, setSelectedTruckId] = useState<string | null>(null);

  // Load fleet and auto-select best-match truck
  useEffect(() => {
    const ts = getTrucks();
    const ds = getDrivers();
    setTrucks(ts);
    setDrivers(ds);
    // Auto-select first available truck sorted by deadhead
    const best = ts
      .filter((t) => t.status === "available")
      .map((t) => ({ ...t, deadhead: estimateDeadhead(t.city, t.state, request.origin) }))
      .sort((a, b) => {
        if (a.deadhead === null && b.deadhead === null) return 0;
        if (a.deadhead === null) return 1;
        if (b.deadhead === null) return -1;
        return a.deadhead - b.deadhead;
      })[0];
    if (best) setSelectedTruckId(best.id);
  }, [request.origin]);

  const midPoint = (request.brokerRateMin + request.brokerRateMax) / 2;
  const perMile =
    rate && !isNaN(Number(rate))
      ? (Number(rate) / request.distanceMiles).toFixed(2)
      : null;

  function handleSubmit() {
    const parsed = Number(rate.replace(/,/g, ""));
    if (!rate || isNaN(parsed) || parsed < 100) {
      setError("Please enter a valid rate.");
      return;
    }
    if (!selectedTruckId) {
      setError("Please assign a truck before submitting.");
      return;
    }
    const truck = trucks.find((t) => t.id === selectedTruckId);
    if (!truck) return;
    const driver = drivers.find((d) => d.assignedTruckId === selectedTruckId);
    setError("");
    onSubmit(request.id, parsed, truck.truckNum, driver?.name ?? "—");
  }

  return (
    <div className="mt-4 rounded-xl border border-[#e5e7eb] bg-[#f9fafb] p-4">
      <p className="mb-3 text-[13px] font-semibold text-[#374151]">
        Submit your quote
      </p>

      {/* Broker's rate context */}
      <div className="mb-3 flex items-center gap-2 rounded-lg border border-[#dbeafe] bg-[#eff6ff] px-3 py-2 text-[13px]">
        <DollarSign size={13} className="shrink-0 text-[#2563eb]" />
        <span className="text-[#1d4ed8]">
          {request.brokerRateMin === request.brokerRateMax ? (
            <>
              Broker offer:{" "}
              <span className="font-semibold">
                ${request.brokerRateMin.toLocaleString()}
              </span>
            </>
          ) : (
            <>
              Broker expects:{" "}
              <span className="font-semibold">
                ${request.brokerRateMin.toLocaleString()} – ${request.brokerRateMax.toLocaleString()}
              </span>
              <span className="ml-1 text-[#6b7280]">
                (mid ${midPoint.toLocaleString()})
              </span>
            </>
          )}
        </span>
      </div>

      {/* Rate input row */}
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-[#374151]">
              $
            </span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Enter your rate"
              value={rate}
              onChange={(e) => {
                setRate(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="w-full rounded-lg border border-[#d1d5db] bg-white py-2.5 pl-7 pr-3 text-sm font-semibold text-[#111827] outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/10"
            />
          </div>
          {perMile && (
            <p className="mt-1 text-[11px] text-[#6b7280]">
              ≈ ${perMile}/mi over {request.distanceMiles} miles
            </p>
          )}
        </div>
        <button
          onClick={handleSubmit}
          className="rounded-lg bg-[#3b82f6] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2563eb] transition-colors"
        >
          Send Quote
        </button>
        <button
          onClick={() => onDecline(request.id)}
          className="rounded-lg border border-[#d1d5db] bg-white px-4 py-2.5 text-sm font-medium text-[#4b5563] hover:bg-[#f3f4f6] transition-colors"
        >
          Decline
        </button>
      </div>

      {error && <p className="mt-2 text-[11px] text-[#ef4444]">{error}</p>}

      {/* Truck selection */}
      <div className="mt-4 border-t border-[#e5e7eb] pt-3">
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#4b5563]">
          Assign Truck — sorted by deadhead to pickup
        </p>
        <TruckPicker
          trucks={trucks}
          drivers={drivers}
          pickupLocation={request.origin}
          selectedId={selectedTruckId}
          onSelect={setSelectedTruckId}
        />
      </div>
    </div>
  );
}

// ─── Request card ──────────────────────────────────────────────────────────────

function RequestCard({
  request,
  onSubmitQuote,
  onDecline,
}: {
  request: QuoteRequest;
  onSubmitQuote: (id: string, rate: number, truckNum: string, driverName: string) => void;
  onDecline: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(request.status === "new");
  const sc = STATUS_CONFIG[request.status];

  return (
    <div
      className={`overflow-hidden rounded-xl border bg-white transition-all ${
        request.status === "new"
          ? "border-[#3b82f6]/30 shadow-sm"
          : "border-[#e5e7eb]"
      }`}
    >
      {/* Card header — always visible */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-4 px-5 py-4 text-left"
      >
        {/* Icon */}
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]"
          style={{ backgroundColor: sc.bg }}
        >
          {request.status === "quoted" ? (
            <DollarSign size={18} style={{ color: sc.color }} />
          ) : request.status === "accepted" ? (
            <CheckCircle2 size={18} style={{ color: sc.color }} />
          ) : request.status === "declined" ? (
            <XCircle size={18} style={{ color: sc.color }} />
          ) : (
            <Bell size={18} style={{ color: sc.color }} />
          )}
        </div>

        {/* Lane + metadata */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-sm font-semibold text-[#111827]">
              {request.origin}
            </span>
            <ArrowRight size={13} className="text-[#9ca3af]" />
            <span className="text-sm font-semibold text-[#111827]">
              {request.destination}
            </span>
            {/* Status badge */}
            <span
              className="ml-1 flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
              style={{ backgroundColor: sc.bg, color: sc.color }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: sc.dot }}
              />
              {sc.label}
            </span>
          </div>
          <div className="mt-0.5 flex flex-wrap gap-3 text-[12px] text-[#6b7280]">
            <span className="flex items-center gap-1">
              <Truck size={11} />
              Truck {request.truckNum}
            </span>
            <span className="flex items-center gap-1">
              <MapPin size={11} />
              {request.distanceMiToPickup} mi to pickup
            </span>
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {timeAgo(request.receivedAt)}
            </span>
            <span>{request.brokerCompany}</span>
          </div>
        </div>

        {/* Rate summary (right side) */}
        <div className="shrink-0 text-right">
          {request.status === "quoted" && request.quotedRate ? (
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-[#9ca3af]">
                Your quote
              </p>
              <p className="text-lg font-bold text-[#111827]">
                ${request.quotedRate.toLocaleString()}
              </p>
            </div>
          ) : request.status === "new" ? (
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-[#9ca3af]">
                Expected range
              </p>
              <p className="text-sm font-bold text-[#111827]">
                ${request.brokerRateMin.toLocaleString()}
                <span className="mx-0.5 font-normal text-[#9ca3af]">–</span>
                ${request.brokerRateMax.toLocaleString()}
              </p>
            </div>
          ) : null}
        </div>

        {/* Expand/collapse chevron */}
        <div className="shrink-0 text-[#9ca3af]">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Expandable detail section */}
      {expanded && (
        <div className="border-t border-[#f3f4f6] px-5 pb-5 pt-4">
          {/* Load details grid */}
          <div className="mb-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">
                Pickup date
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-[13px] font-medium text-[#1f2937]">
                <Calendar size={12} className="text-[#9ca3af]" />
                {formatPickupDate(request.pickupDate)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">
                Commodity
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-[13px] font-medium text-[#1f2937]">
                <Package size={12} className="text-[#9ca3af]" />
                {request.commodity}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">
                Temperature
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-[13px] font-medium text-[#1f2937]">
                <Thermometer size={12} className="text-[#9ca3af]" />
                {request.temperatureF}°F
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">
                Weight
              </p>
              <p className="mt-0.5 text-[13px] font-medium text-[#1f2937]">
                {request.weightLbs.toLocaleString()} lbs
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">
                Equipment
              </p>
              <p className="mt-0.5 text-[13px] font-medium text-[#1f2937]">
                {request.equipmentType}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">
                Distance
              </p>
              <p className="mt-0.5 text-[13px] font-medium text-[#1f2937]">
                {request.distanceMiles} miles
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">
                Broker
              </p>
              <p className="mt-0.5 text-[13px] font-medium text-[#1f2937]">
                {request.brokerName}
              </p>
              <p className="text-[11px] text-[#6b7280]">{request.brokerCompany}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">
                Matched truck
              </p>
              <p className="mt-0.5 text-[13px] font-medium text-[#1f2937]">
                Truck {request.truckNum}
              </p>
              <p className="text-[11px] text-[#6b7280]">
                {request.distanceMiToPickup} mi to pickup
              </p>
            </div>
          </div>

          {/* Action area based on status */}
          {request.status === "new" && (
            <QuoteInput
              request={request}
              onSubmit={onSubmitQuote}
              onDecline={onDecline}
            />
          )}

          {request.status === "quoted" && request.quotedRate && (
            <div className="mt-1 flex items-center gap-2 rounded-lg bg-[#fffbeb] border border-[#f59e0b]/20 px-4 py-3 text-[13px]">
              <Clock size={14} className="shrink-0 text-[#d97706]" />
              <span className="text-[#4b5563]">
                Quote of{" "}
                <span className="font-semibold text-[#111827]">
                  ${request.quotedRate.toLocaleString()}
                </span>{" "}
                sent to {request.brokerCompany}.{" "}
                {request.quotedAt &&
                  `Sent at ${new Date(request.quotedAt).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}.`}{" "}
                Waiting for confirmation.
              </span>
            </div>
          )}

          {request.status === "accepted" && request.quotedRate && (
            <div className="mt-1 flex items-center gap-2 rounded-lg bg-[#f0fdf4] border border-[#22c55e]/20 px-4 py-3 text-[13px]">
              <CheckCircle2 size={14} className="shrink-0 text-[#16a34a]" />
              <span className="text-[#4b5563]">
                Booking confirmed at{" "}
                <span className="font-semibold text-[#111827]">
                  ${request.quotedRate.toLocaleString()}
                </span>
                . Truck {request.truckNum} is assigned to this load.
              </span>
            </div>
          )}

          {request.status === "declined" && (
            <div className="mt-1 flex items-center gap-2 rounded-lg bg-[#f9fafb] border border-[#e5e7eb] px-4 py-3 text-[13px]">
              <XCircle size={14} className="shrink-0 text-[#9ca3af]" />
              <span className="text-[#6b7280]">
                You declined this request.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

function mergeRequests(real: QuoteRequest[]): QuoteRequest[] {
  // Show real first; append demo items whose IDs don't collide with real
  const realIds = new Set(real.map((r) => r.id));
  const demo = DEMO_REQUESTS.filter((r) => !realIds.has(r.id));
  const all = [...real, ...demo];
  // Sort: new requests first, then quoted, then accepted/declined
  const ORDER: Record<RequestStatus, number> = { new: 0, quoted: 1, accepted: 2, declined: 3 };
  return all.sort((a, b) => ORDER[a.status] - ORDER[b.status]);
}

export default function QuoteRequestsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [requests, setRequests] = useState<QuoteRequest[]>(DEMO_REQUESTS);
  const [filter, setFilter] = useState<"all" | RequestStatus>("all");

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (!loading && user && user.role !== "carrier") router.push("/dashboard/3pl");
  }, [user, loading, router]);

  // Load real requests from conversations on mount
  useEffect(() => {
    setRequests(mergeRequests(buildFromConversations()));
  }, []);

  function refresh() {
    setRequests(mergeRequests(buildFromConversations()));
  }

  // Submit a rate quote — for real requests, send it through the conversation system.
  // TODO: UPDATE quote_requests SET status = 'quoted', carrier_rate = rate, quoted_at = now()
  function handleSubmitQuote(requestId: string, rate: number, truckNum: string, driverName: string) {
    const req = requests.find((r) => r.id === requestId);
    if (req?.convId) {
      updateConversationTruck(req.convId, truckNum, driverName);
      sendOffer(req.convId, rate, "carrier");
      addNotification({
        type: "quote_received",
        title: "Quote sent",
        body: `Your quote of $${rate.toLocaleString()} has been sent to the broker.`,
        role: "carrier",
        href: `/dashboard/carrier/inbox?conv=${req.convId}`,
      });
      refresh();
    } else {
      // Demo request — local state only
      const now = new Date().toISOString();
      setRequests((prev) =>
        prev.map((r) =>
          r.id === requestId
            ? { ...r, status: "quoted", quotedRate: rate, quotedAt: now, truckNum, distanceMiToPickup: 0 }
            : r
        )
      );
    }
  }

  // Decline a request.
  // TODO: UPDATE quote_requests SET status = 'declined' WHERE id = requestId
  function handleDecline(requestId: string) {
    const req = requests.find((r) => r.id === requestId);
    if (req?.convId) {
      respondToOffer(req.convId, "declined", undefined, "carrier");
      refresh();
    } else {
      setRequests((prev) =>
        prev.map((r) =>
          r.id === requestId ? { ...r, status: "declined" } : r
        )
      );
    }
  }

  const filtered =
    filter === "all" ? requests : requests.filter((r) => r.status === filter);

  const newCount = requests.filter((r) => r.status === "new").length;

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f9fafb]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#3b82f6] border-t-transparent" />
      </div>
    );
  }

  return (
    <AppShell
      role="carrier"
      companyName={user.companyName}
      companyCity={user.companyCity}
      companyState={user.companyState}
      mcNumber={user.mcNumber}
      initials={user.initials}
    >
      {/* Page header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-2.5 text-[26px] font-bold tracking-tight text-[#111827]">
            Quote Requests
            {newCount > 0 && (
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#ef4444] px-1.5 text-sm font-semibold text-white">
                {newCount}
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-[#6b7280]">
            Review incoming loads and submit your rates
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="mb-5 flex gap-1 rounded-xl border border-[#e5e7eb] bg-[#f9fafb] p-1 w-fit">
        {(
          [
            { key: "all", label: "All" },
            { key: "new", label: "New" },
            { key: "quoted", label: "Quoted" },
            { key: "accepted", label: "Accepted" },
            { key: "declined", label: "Declined" },
          ] as { key: "all" | RequestStatus; label: string }[]
        ).map(({ key, label }) => {
          const count =
            key === "all"
              ? requests.length
              : requests.filter((r) => r.status === key).length;
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                filter === key
                  ? "bg-white text-[#111827] shadow-sm"
                  : "text-[#6b7280] hover:text-[#374151]"
              }`}
            >
              {label}
              {count > 0 && (
                <span
                  className={`text-[11px] font-semibold ${
                    filter === key ? "text-[#6b7280]" : "text-[#9ca3af]"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Request list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f3f4f6]">
            <Inbox size={24} className="text-[#9ca3af]" />
          </div>
          <p className="text-sm font-medium text-[#374151]">
            No {filter === "all" ? "" : filter} requests
          </p>
          <p className="mt-1 text-xs text-[#9ca3af]">
            {filter === "all"
              ? "Brokers will notify you when they have loads matching your fleet."
              : "Switch to a different filter to see other requests."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((req) => (
            <RequestCard
              key={req.id}
              request={req}
              onSubmitQuote={handleSubmitQuote}
              onDecline={handleDecline}
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}
