"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Package,
  Truck,
  MapPin,
  CheckCircle2,
  FileText,
  Star,
  Edit2,
  X,
  ExternalLink,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";
import {
  getBookingsByCarrier,
  updateBookingTruck,
  SHIPMENT_STATUS_CONFIG,
  type Booking,
} from "@/lib/bookings";
import { updateConversationTruck } from "@/lib/conversations";
import { getTrucks, getDrivers, type Truck as TruckData, type Driver } from "@/lib/fleet";

// ─── Live truck status from ch_trucks ─────────────────────────────────────────

const TRUCK_STATUS_LABELS: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  available:   { label: "Available",   color: "#15803d", bg: "#f0fdf4",  dot: "#22c55e" },
  loaded:      { label: "Loaded",      color: "#1d4ed8", bg: "#eff6ff",  dot: "#3b82f6" },
  in_transit:  { label: "In Transit",  color: "#7c3aed", bg: "#f5f3ff",  dot: "#8b5cf6" },
  maintenance: { label: "Maintenance", color: "#b91c1c", bg: "#fef2f2",  dot: "#ef4444" },
  inactive:    { label: "Inactive",    color: "#6b7280", bg: "#f9fafb",  dot: "#9ca3af" },
};

interface LiveTruck { id: string; truckNum: string; status: string; city: string; state: string; }

function getLiveTrucks(): LiveTruck[] {
  try { return JSON.parse(sessionStorage.getItem("ch_trucks") || "[]"); }
  catch { return []; }
}

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

function cityKey(city: string, state: string) {
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function equipLabel(val?: string) {
  if (!val) return "—";
  if (val === "reefer_single") return "Reefer Single-Temp";
  if (val === "reefer_multi") return "Reefer Multi-Temp";
  return val;
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
    <div className="flex flex-col gap-1.5">
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
                <span className="text-[13px] font-semibold text-[#111827]">Truck {truck.truckNum}</span>
                {isRecommended && (
                  <span className="flex items-center gap-0.5 rounded-full bg-[#3b82f6] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    <Star size={8} fill="white" /> Best match
                  </span>
                )}
                {!isAvail && (
                  <span className="text-[11px] text-[#9ca3af] capitalize">({truck.status.replace("_", " ")})</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[#6b7280]">
                <span>{truck.year} {truck.make} {truck.model}</span>
                <span>·</span>
                <span className="flex items-center gap-0.5"><MapPin size={9} /> {truck.city}, {truck.state}</span>
                {truck.deadhead !== null && (
                  <>
                    <span>·</span>
                    <span className={truck.deadhead < 50 ? "font-medium text-[#16a34a]" : ""}>
                      ~{truck.deadhead} mi deadhead
                    </span>
                  </>
                )}
                {truck.driverName && <><span>·</span><span>Driver: {truck.driverName}</span></>}
              </div>
            </div>
            {isSelected && <CheckCircle2 size={15} className="shrink-0 text-[#3b82f6]" />}
          </button>
        );
      })}
    </div>
  );
}

// ─── Load card ────────────────────────────────────────────────────────────────

function ActiveLoadCard({
  booking,
  liveTrucks,
  onTruckChange,
}: {
  booking: Booking;
  liveTrucks: LiveTruck[];
  onTruckChange: (id: string, truckNum: string, driverName: string) => void;
}) {
  const sc = SHIPMENT_STATUS_CONFIG[booking.shipmentStatus];

  const [showPicker, setShowPicker] = useState(false);
  const [allTrucks] = useState<TruckData[]>(() => getTrucks());
  const [drivers] = useState<Driver[]>(() => getDrivers());

  const currentTruckId = allTrucks.find((t) => t.truckNum === booking.truckNum)?.id ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    if (currentTruckId) return currentTruckId;
    const best = allTrucks
      .filter((t) => t.status === "available")
      .map((t) => ({ ...t, deadhead: estimateDeadhead(t.city, t.state, booking.origin) }))
      .sort((a, b) => {
        if (a.deadhead === null && b.deadhead === null) return 0;
        if (a.deadhead === null) return 1;
        if (b.deadhead === null) return -1;
        return a.deadhead - b.deadhead;
      })[0];
    return best?.id ?? null;
  });

  function handleConfirm() {
    const truck = allTrucks.find((t) => t.id === selectedId);
    if (!truck) return;
    const driver = drivers.find((d) => d.assignedTruckId === selectedId);
    onTruckChange(booking.id, truck.truckNum, driver?.name ?? "—");
    setShowPicker(false);
  }

  const hasTruck = booking.truckNum && booking.truckNum !== "—";
  // Find live truck data for the assigned truck
  const liveTruck = liveTrucks.find((t) => t.truckNum === booking.truckNum) ?? null;
  const truckStatus = liveTruck ? (TRUCK_STATUS_LABELS[liveTruck.status] ?? TRUCK_STATUS_LABELS.inactive) : null;

  return (
    <div className={`rounded-xl border bg-white transition-all ${booking.shipmentStatus === "delivered" ? "border-[#e5e7eb] opacity-75" : "border-[#e5e7eb] shadow-sm"}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-[#f3f4f6] px-5 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]" style={{ backgroundColor: sc.bg }}>
            <Truck size={18} style={{ color: sc.dot }} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="text-[15px] font-bold text-[#111827]">{booking.origin}</span>
              <ArrowRight size={14} className="shrink-0 text-[#9ca3af]" />
              <span className="text-[15px] font-bold text-[#111827]">{booking.destination}</span>
              {/* Booking status badge — read-only */}
              <span
                className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                style={{ backgroundColor: sc.bg, color: sc.color }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: sc.dot }} />
                {sc.label}
              </span>
            </div>
            <p className="mt-0.5 text-[12px] text-[#9ca3af]">
              Confirmed {new Date(booking.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9ca3af]">Your Rate</p>
          <p className="text-[22px] font-bold tracking-tight text-[#111827]">
            ${booking.acceptedRate.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Assigned truck panel */}
      <div className="border-b border-[#f3f4f6] px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Assigned Truck</p>
            {hasTruck ? (
              <div className="mt-1 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f3f4f6]">
                  <Truck size={16} className="text-[#4b5563]" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[#111827]">Truck {booking.truckNum}</p>
                  <p className="text-[11px] text-[#6b7280]">{booking.driverName}</p>
                </div>
                {/* Live truck status badge */}
                {truckStatus && (
                  <span
                    className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                    style={{ backgroundColor: truckStatus.bg, color: truckStatus.color }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: truckStatus.dot }} />
                    {truckStatus.label}
                  </span>
                )}
                {liveTruck?.city && (
                  <span className="flex items-center gap-1 text-[11px] text-[#6b7280]">
                    <MapPin size={10} className="text-[#9ca3af]" />
                    {liveTruck.city}, {liveTruck.state}
                  </span>
                )}
              </div>
            ) : (
              <p className="mt-1 text-[13px] font-medium text-[#ef4444]">No truck assigned</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {hasTruck && liveTruck && (
              <Link
                href={`/dashboard/carrier/trucks/${liveTruck.id}`}
                className="flex items-center gap-1 rounded-lg border border-[#e5e7eb] bg-white px-3 py-1.5 text-[12px] font-medium text-[#374151] hover:bg-[#f9fafb] transition-colors"
              >
                <ExternalLink size={11} /> Update status
              </Link>
            )}
            {booking.shipmentStatus !== "delivered" && (
              <button
                onClick={() => setShowPicker((v) => !v)}
                className="flex items-center gap-1 rounded-lg border border-[#d1d5db] bg-white px-3 py-1.5 text-[12px] font-medium text-[#374151] hover:bg-[#f9fafb] transition-colors"
              >
                <Edit2 size={11} /> {hasTruck ? "Change truck" : "Assign truck"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Load details */}
      <div className="flex flex-wrap gap-x-6 gap-y-3 px-5 py-4">
        {booking.pickupDate && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Pickup Date</p>
            <p className="mt-0.5 flex items-center gap-1 text-[13px] font-medium text-[#1f2937]">
              <Calendar size={12} className="text-[#9ca3af]" /> {formatDate(booking.pickupDate)}
            </p>
          </div>
        )}
        {booking.commodity && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Commodity</p>
            <p className="mt-0.5 flex items-center gap-1 text-[13px] font-medium text-[#1f2937]">
              <Package size={12} className="text-[#9ca3af]" /> {booking.commodity}
            </p>
          </div>
        )}
        {booking.temperature && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Temperature</p>
            <p className="mt-0.5 text-[13px] font-medium text-[#1f2937]">{booking.temperature}°F</p>
          </div>
        )}
        {booking.equipmentType && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Equipment</p>
            <p className="mt-0.5 text-[13px] font-medium text-[#1f2937]">{equipLabel(booking.equipmentType)}</p>
          </div>
        )}
        {booking.distanceMiles && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Distance</p>
            <p className="mt-0.5 flex items-center gap-1 text-[13px] font-medium text-[#1f2937]">
              <MapPin size={12} className="text-[#9ca3af]" /> {booking.distanceMiles} mi
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end border-t border-[#f3f4f6] px-5 py-3">
        <Link
          href={`/dashboard/carrier/inbox?conv=${booking.convId}`}
          className="flex items-center gap-1 text-[12px] font-medium text-[#3b82f6] hover:text-[#2563eb] transition-colors"
        >
          Open conversation <ArrowRight size={12} />
        </Link>
      </div>

      {/* Inline truck picker */}
      {showPicker && (
        <div className="border-t border-[#e5e7eb] px-5 py-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#4b5563]">
              Assign Truck — sorted by deadhead to pickup
            </p>
            <button onClick={() => setShowPicker(false)} className="rounded p-1 text-[#9ca3af] hover:text-[#374151] transition-colors">
              <X size={14} />
            </button>
          </div>
          <TruckPicker
            trucks={allTrucks}
            drivers={drivers}
            pickupLocation={booking.origin}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handleConfirm}
              disabled={!selectedId}
              className="flex items-center gap-1.5 rounded-lg bg-[#3b82f6] px-5 py-2 text-sm font-semibold text-white hover:bg-[#2563eb] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <CheckCircle2 size={14} /> Confirm Assignment
            </button>
            <button
              onClick={() => setShowPicker(false)}
              className="rounded-lg border border-[#e5e7eb] bg-white px-4 py-2 text-sm font-medium text-[#4b5563] hover:bg-[#f9fafb] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function CarrierActiveLoadsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [liveTrucks, setLiveTrucks] = useState<LiveTruck[]>([]);
  const [filter, setFilter] = useState<"active" | "all">("active");

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (!loading && user && user.role !== "carrier") router.push("/dashboard/3pl");
  }, [user, loading, router]);

  useEffect(() => {
    setBookings(getBookingsByCarrier().sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ));
  }, []);

  // Live truck data — refreshes whenever fleet changes
  useEffect(() => {
    function refresh() { setLiveTrucks(getLiveTrucks()); }
    refresh();
    window.addEventListener("ch_fleet_updated", refresh);
    return () => window.removeEventListener("ch_fleet_updated", refresh);
  }, []);

  function handleTruckChange(bookingId: string, truckNum: string, driverName: string) {
    updateBookingTruck(bookingId, truckNum, driverName);
    const booking = getBookingsByCarrier().find((b) => b.id === bookingId);
    if (booking) updateConversationTruck(booking.convId, truckNum, driverName);
    setBookings(getBookingsByCarrier().sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ));
  }

  const filtered = filter === "active"
    ? bookings.filter((b) => b.shipmentStatus !== "delivered")
    : bookings;

  const activeCount = bookings.filter((b) => b.shipmentStatus !== "delivered").length;

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f9fafb]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#3b82f6] border-t-transparent" />
      </div>
    );
  }

  return (
    <AppShell role="carrier" companyName={user.companyName} companyCity={user.companyCity} companyState={user.companyState} mcNumber={user.mcNumber} initials={user.initials}>
      <Link href="/dashboard/carrier" className="mb-5 inline-flex items-center gap-1.5 text-sm text-[#6b7280] hover:text-[#374151] transition-colors">
        <ArrowLeft size={15} /> Back to Dashboard
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-2.5 text-[26px] font-bold tracking-tight text-[#111827]">
            Active Loads
            {activeCount > 0 && (
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#22c55e] px-1.5 text-sm font-semibold text-white">
                {activeCount}
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-[#6b7280]">Assign trucks to your loads · update truck status in My Trucks</p>
        </div>
        <Link
          href="/dashboard/carrier/trucks"
          className="flex items-center gap-1.5 rounded-lg border border-[#e5e7eb] bg-white px-4 py-2 text-sm font-medium text-[#374151] hover:bg-[#f9fafb] transition-colors"
        >
          <Truck size={14} /> My Trucks
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="mb-5 flex gap-1 rounded-xl border border-[#e5e7eb] bg-[#f9fafb] p-1 w-fit">
        {([
          { key: "active" as const, label: "Active", count: activeCount },
          { key: "all" as const,    label: "All",    count: bookings.length },
        ]).map(({ key, label, count }) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === key ? "bg-white text-[#111827] shadow-sm" : "text-[#6b7280] hover:text-[#374151]"
            }`}
          >
            {label}
            {count > 0 && (
              <span className={`text-[11px] font-semibold ${filter === key ? "text-[#6b7280]" : "text-[#9ca3af]"}`}>{count}</span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f3f4f6]">
            <FileText size={24} className="text-[#9ca3af]" />
          </div>
          <p className="text-sm font-medium text-[#374151]">No active loads</p>
          <p className="mt-1 text-xs text-[#9ca3af]">Accepted offers from brokers will appear here.</p>
          <Link href="/dashboard/carrier/inbox" className="mt-4 flex items-center gap-1.5 rounded-lg bg-[#3b82f6] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2563eb] transition-colors">
            Open Inbox
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((booking) => (
            <ActiveLoadCard
              key={booking.id}
              booking={booking}
              liveTrucks={liveTrucks}
              onTruckChange={handleTruckChange}
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}
