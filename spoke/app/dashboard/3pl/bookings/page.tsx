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
  DollarSign,
  MapPin,
  CheckCircle2,
  ChevronRight,
  FileText,
  Receipt,
  RefreshCw,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";
import {
  getBookings,
  SHIPMENT_STATUS_CONFIG,
  SHIPMENT_STATUS_ORDER,
  type Booking,
  type ShipmentStatus,
} from "@/lib/bookings";
import { createInvoice } from "@/lib/invoices";

// ─── Live truck data (from carrier's ch_trucks) ───────────────────────────────

interface LiveTruck {
  truckNum: string;
  status: string;
  city: string;
  state: string;
}

const TRUCK_STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  available:   { label: "Available",   color: "#15803d", bg: "#f0fdf4" },
  loaded:      { label: "Loaded",      color: "#1d4ed8", bg: "#eff6ff" },
  in_transit:  { label: "In Transit",  color: "#7c3aed", bg: "#f5f3ff" },
  maintenance: { label: "Maintenance", color: "#b91c1c", bg: "#fef2f2" },
  inactive:    { label: "Inactive",    color: "#6b7280", bg: "#f9fafb" },
};

function getLiveTrucks(): LiveTruck[] {
  try {
    return JSON.parse(sessionStorage.getItem("ch_trucks") || "[]");
  } catch { return []; }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function formatDatetime(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

import { equipmentLabel as equipLabel } from "@/lib/utils/constants";

// ─── Status timeline ──────────────────────────────────────────────────────────

function StatusTimeline({ current }: { current: ShipmentStatus }) {
  const currentIdx = SHIPMENT_STATUS_ORDER.indexOf(current);
  return (
    <div className="flex items-center gap-0">
      {SHIPMENT_STATUS_ORDER.map((status, i) => {
        const cfg = SHIPMENT_STATUS_CONFIG[status];
        const isComplete = i < currentIdx;
        const isCurrent = i === currentIdx;
        const isUpcoming = i > currentIdx;
        return (
          <div key={status} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all ${
                  isComplete
                    ? "border-[#22c55e] bg-[#22c55e]"
                    : isCurrent
                    ? "border-2 bg-white"
                    : "border-[#e5e7eb] bg-white"
                }`}
                style={isCurrent ? { borderColor: cfg.dot } : {}}
              >
                {isComplete ? (
                  <CheckCircle2 size={14} className="text-white" />
                ) : (
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: isCurrent ? cfg.dot : "#d1d5db" }}
                  />
                )}
              </div>
              <span
                className={`text-center text-[10px] font-medium leading-tight max-w-[68px] ${
                  isCurrent ? "font-semibold" : isUpcoming ? "text-[#9ca3af]" : "text-[#6b7280]"
                }`}
                style={isCurrent ? { color: cfg.color } : {}}
              >
                {cfg.label}
              </span>
            </div>
            {i < SHIPMENT_STATUS_ORDER.length - 1 && (
              <div
                className="mx-1 mb-4 h-px w-8 shrink-0 transition-all"
                style={{ backgroundColor: i < currentIdx ? "#22c55e" : "#e5e7eb" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Booking card ──────────────────────────────────────────────────────────────

function BookingCard({
  booking,
  liveTruck,
}: {
  booking: Booking;
  liveTruck: LiveTruck | null;
}) {
  const sc = SHIPMENT_STATUS_CONFIG[booking.shipmentStatus];
  const isDelivered = booking.shipmentStatus === "delivered";

  return (
    <div className={`overflow-hidden rounded-xl border bg-white transition-all ${
      isDelivered ? "border-[#e5e7eb] opacity-75" : "border-[#e5e7eb] shadow-sm"
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 px-5 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]"
            style={{ backgroundColor: sc.bg }}>
            <Truck size={18} style={{ color: sc.dot }} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="text-[15px] font-bold text-[#111827]">{booking.origin}</span>
              <ArrowRight size={14} className="shrink-0 text-[#9ca3af]" />
              <span className="text-[15px] font-bold text-[#111827]">{booking.destination}</span>
              <span
                className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                style={{ backgroundColor: sc.bg, color: sc.color }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: sc.dot }} />
                {sc.label}
              </span>
            </div>
            <p className="mt-0.5 text-[12px] text-[#6b7280]">
              Booked {formatDatetime(booking.createdAt)}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9ca3af]">Accepted Rate</p>
          <p className="text-[22px] font-bold tracking-tight text-[#111827]">
            ${booking.acceptedRate.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Timeline */}
      <div className="border-t border-[#f3f4f6] px-5 py-4">
        <StatusTimeline current={booking.shipmentStatus} />
      </div>

      {/* Details + actions */}
      <div className="border-t border-[#f3f4f6] px-5 py-4">
        <div className="flex flex-wrap gap-x-6 gap-y-3 mb-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Carrier</p>
            <p className="mt-0.5 flex items-center gap-1 text-[13px] font-medium text-[#1f2937]">
              <Truck size={12} className="text-[#9ca3af]" />
              {booking.carrierName}
            </p>
            <p className="text-[11px] text-[#6b7280]">Truck {booking.truckNum} · {booking.driverName}</p>
          </div>
          {liveTruck && (() => {
            const ts = TRUCK_STATUS_LABELS[liveTruck.status] ?? TRUCK_STATUS_LABELS.inactive;
            return (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af] flex items-center gap-1">
                  <RefreshCw size={9} className="text-[#22c55e]" /> Live Truck Status
                </p>
                <span
                  className="mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                  style={{ backgroundColor: ts.bg, color: ts.color }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: ts.color }} />
                  {ts.label}
                </span>
                {liveTruck.city && (
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-[#6b7280]">
                    <MapPin size={10} className="text-[#9ca3af]" />
                    {liveTruck.city}, {liveTruck.state}
                  </p>
                )}
              </div>
            );
          })()}
          {booking.pickupDate && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Pickup Date</p>
              <p className="mt-0.5 flex items-center gap-1 text-[13px] font-medium text-[#1f2937]">
                <Calendar size={12} className="text-[#9ca3af]" />
                {formatDate(booking.pickupDate)}
              </p>
            </div>
          )}
          {booking.commodity && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Commodity</p>
              <p className="mt-0.5 flex items-center gap-1 text-[13px] font-medium text-[#1f2937]">
                <Package size={12} className="text-[#9ca3af]" />
                {booking.commodity}
              </p>
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
                <MapPin size={12} className="text-[#9ca3af]" />
                {booking.distanceMiles} mi
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href={`/dashboard/3pl/loads/${booking.loadId}`}
              className="flex items-center gap-1 text-[12px] font-medium text-[#3b82f6] hover:text-[#2563eb] transition-colors"
            >
              View load <ChevronRight size={12} />
            </Link>
            <span className="text-[#d1d5db]">·</span>
            <Link
              href={`/dashboard/3pl/quotes?conv=${booking.convId}`}
              className="flex items-center gap-1 text-[12px] font-medium text-[#3b82f6] hover:text-[#2563eb] transition-colors"
            >
              Conversation <ChevronRight size={12} />
            </Link>
            <span className="text-[#d1d5db]">·</span>
            <Link
              href={`/dashboard/invoices/inv-${booking.id}`}
              className="flex items-center gap-1 text-[12px] font-medium text-[#6b7280] hover:text-[#374151] transition-colors"
            >
              <Receipt size={12} /> Invoice
            </Link>
          </div>
          {isDelivered ? (
            <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#16a34a]">
              <CheckCircle2 size={14} /> Delivered
            </div>
          ) : (
            <span className="flex items-center gap-1.5 text-[12px] text-[#6b7280]">
              <RefreshCw size={11} className="text-[#22c55e]" />
              Status updates when carrier changes truck status
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

type FilterKey = "all" | "active" | "delivered";

export default function BookingsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [liveTrucks, setLiveTrucks] = useState<LiveTruck[]>([]);
  const [filter, setFilter] = useState<FilterKey>("all");

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (!loading && user && user.role !== "3pl") router.push("/dashboard/carrier");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    const all = getBookings().sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    // Auto-generate invoices for any booking that doesn't have one yet
    all.forEach((booking) => {
      createInvoice({
        bookingId: booking.id,
        loadId: booking.loadId,
        convId: booking.convId,
        brokerCompany: user.companyName,
        carrierName: booking.carrierName,
        origin: booking.origin,
        destination: booking.destination,
        pickupDate: booking.pickupDate,
        commodity: booking.commodity,
        temperature: booking.temperature,
        equipmentType: booking.equipmentType,
        distanceMiles: booking.distanceMiles,
        driverName: booking.driverName,
        truckNum: booking.truckNum,
        freightCharge: booking.acceptedRate,
      });
    });
    setBookings(all);
  }, [user]);

  // Live truck data — updates whenever carrier changes fleet
  useEffect(() => {
    function refresh() { setLiveTrucks(getLiveTrucks()); }
    refresh();
    window.addEventListener("ch_fleet_updated", refresh);
    return () => window.removeEventListener("ch_fleet_updated", refresh);
  }, []);

  // Refresh bookings when fleet status changes (truck status → booking status auto-sync)
  useEffect(() => {
    function onFleetUpdate() {
      setBookings(getBookings().sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    }
    window.addEventListener("ch_fleet_updated", onFleetUpdate);
    return () => window.removeEventListener("ch_fleet_updated", onFleetUpdate);
  }, []);

  const filtered =
    filter === "all" ? bookings
    : filter === "active" ? bookings.filter((b) => b.shipmentStatus !== "delivered")
    : bookings.filter((b) => b.shipmentStatus === "delivered");

  const counts = {
    all: bookings.length,
    active: bookings.filter((b) => b.shipmentStatus !== "delivered").length,
    delivered: bookings.filter((b) => b.shipmentStatus === "delivered").length,
  };

  const totalValue = bookings
    .filter((b) => b.shipmentStatus !== "delivered")
    .reduce((s, b) => s + b.acceptedRate, 0);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f9fafb]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#3b82f6] border-t-transparent" />
      </div>
    );
  }

  return (
    <AppShell role="3pl" companyName={user.companyName} companyCity={user.companyCity} companyState={user.companyState} initials={user.initials}>
      <Link href="/dashboard/3pl" className="mb-5 inline-flex items-center gap-1.5 text-sm text-[#6b7280] hover:text-[#374151] transition-colors">
        <ArrowLeft size={15} /> Back to Dashboard
      </Link>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[#111827]">Active Bookings</h1>
          <p className="mt-1 text-sm text-[#6b7280]">Track your confirmed loads and shipment progress</p>
        </div>
        {totalValue > 0 && (
          <div className="text-right">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9ca3af]">Active Value</p>
            <p className="text-[22px] font-bold tracking-tight text-[#111827]">
              ${totalValue.toLocaleString()}
            </p>
          </div>
        )}
      </div>

      {/* Filter tabs */}
      <div className="mb-5 flex gap-1 rounded-xl border border-[#e5e7eb] bg-[#f9fafb] p-1 w-fit">
        {([
          { key: "all" as FilterKey,       label: "All" },
          { key: "active" as FilterKey,    label: "Active" },
          { key: "delivered" as FilterKey, label: "Delivered" },
        ]).map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === key ? "bg-white text-[#111827] shadow-sm" : "text-[#6b7280] hover:text-[#374151]"
            }`}
          >
            {label}
            {counts[key] > 0 && (
              <span className={`text-[11px] font-semibold ${filter === key ? "text-[#6b7280]" : "text-[#9ca3af]"}`}>
                {counts[key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Booking list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f3f4f6]">
            <FileText size={24} className="text-[#9ca3af]" />
          </div>
          <p className="text-sm font-medium text-[#374151]">No bookings yet</p>
          <p className="mt-1 text-xs text-[#9ca3af]">
            {filter === "all"
              ? "Accepted offers will appear here. Head to Quote Inbox to negotiate with carriers."
              : "No bookings in this category."}
          </p>
          {filter === "all" && (
            <Link href="/dashboard/3pl/quotes" className="mt-4 flex items-center gap-1.5 rounded-lg bg-[#3b82f6] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2563eb] transition-colors">
              <DollarSign size={15} /> Go to Quote Inbox
            </Link>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              liveTruck={liveTrucks.find((t) => t.truckNum === booking.truckNum) ?? null}
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}
