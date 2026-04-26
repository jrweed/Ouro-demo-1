"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  ArrowRight,
  Calendar,
  Package,
  Thermometer,
  Truck,
  Scale,
  Bell,
  Clock,
  DollarSign,
  Star,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  Search,
  FileText,
  ChevronUp,
  ChevronDown,
  Phone,
  MessageSquare,
  Send,
  X,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";
import dynamic from "next/dynamic";
import { ensureConversation } from "@/lib/conversations";
import { getBookings, type Booking, SHIPMENT_STATUS_CONFIG, SHIPMENT_STATUS_ORDER } from "@/lib/bookings";

const RouteMap = dynamic(
  () => import("@/components/maps/RouteMap").then((m) => m.RouteMap),
  { ssr: false, loading: () => <div className="h-[220px] w-full animate-pulse rounded-xl bg-[#f3f4f6]" /> }
);

// ─── Types ────────────────────────────────────────────────────────────────────

type LoadStatus = "active" | "carriers_notified" | "booked";
type Likelihood = "high" | "medium" | "low";
type QuoteStatus = "pending" | "quoted" | "accepted" | "declined";

interface NotifiedCarrier {
  id: string;
  carrierName: string;
  truckNum: string;
  driverName: string;
  city: string;
  state: string;
  distanceMi: number;
  rating: number;
  rateMin: number;
  rateMax: number;
  likelihood: Likelihood;
  likelihoodNote: string;
  notifiedAt: string;
  quoteStatus: QuoteStatus;
  quotedRate?: number;
}

interface LoadDetail {
  id: string;
  origin: string;
  destination: string;
  originLat?: number;
  originLng?: number;
  destLat?: number;
  destLng?: number;
  pickupDate: string;
  pickupWindowStart?: string;
  pickupWindowEnd?: string;
  deliveryDate?: string;
  commodity: string;
  temperature: string;
  equipmentType: string;
  weightLbs?: string;
  specialRequirements?: string;
  targetRate?: string;
  pricingRateMin?: number;
  pricingRateMax?: number;
  distanceMiles?: number;
  durationMinutes?: number;
  createdAt: string;
  status: LoadStatus;
  notifiedCarriers?: NotifiedCarrier[];
}

// ─── Config ────────────────────────────────────────────────────────────────────

const LOAD_STATUS_CONFIG: Record<LoadStatus, { label: string; bg: string; color: string; dot: string }> = {
  active: { label: "Active", bg: "#eff6ff", color: "#2563eb", dot: "#3b82f6" },
  carriers_notified: { label: "Carriers Notified", bg: "#fffbeb", color: "#d97706", dot: "#f59e0b" },
  booked: { label: "Booked", bg: "#f0fdf4", color: "#16a34a", dot: "#22c55e" },
};

const QUOTE_STATUS_CONFIG: Record<QuoteStatus, { label: string; bg: string; color: string }> = {
  pending: { label: "Awaiting quote", bg: "#f9fafb", color: "#6b7280" },
  quoted: { label: "Quote received", bg: "#fffbeb", color: "#d97706" },
  accepted: { label: "Accepted", bg: "#f0fdf4", color: "#16a34a" },
  declined: { label: "Declined", bg: "#fef2f2", color: "#dc2626" },
};

const LIKELIHOOD_ICON: Record<Likelihood, typeof TrendingUp> = {
  high: TrendingUp,
  medium: Minus,
  low: TrendingDown,
};

const LIKELIHOOD_COLOR: Record<Likelihood, string> = {
  high: "#16a34a",
  medium: "#d97706",
  low: "#dc2626",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });
}

function formatTime(isoStr: string) {
  return new Date(isoStr).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

import { equipmentLabel as equipLabel } from "@/lib/utils/constants";

// ─── Carrier quote card ────────────────────────────────────────────────────────

function CarrierQuoteCard({
  carrier,
  marketMid,
  loadInfo,
}: {
  carrier: NotifiedCarrier;
  marketMid?: number;
  loadInfo: { id: string; origin: string; destination: string };
}) {
  const cardRouter = useRouter();
  const [callState, setCallState] = useState<"idle" | "calling">("idle");
  const [offerState, setOfferState] = useState<"idle" | "inputting" | "sent">("idle");
  const [offerRate, setOfferRate] = useState("");

  const qs = QUOTE_STATUS_CONFIG[carrier.quoteStatus];
  const LIcon = LIKELIHOOD_ICON[carrier.likelihood];
  const lColor = LIKELIHOOD_COLOR[carrier.likelihood];

  let marketTag: { label: string; color: string } | null = null;
  if (marketMid) {
    const mid = (carrier.rateMin + carrier.rateMax) / 2;
    const pct = ((mid - marketMid) / marketMid) * 100;
    if (pct < -3) marketTag = { label: `${Math.abs(pct).toFixed(0)}% below market`, color: "text-[#16a34a]" };
    else if (pct > 3) marketTag = { label: `${pct.toFixed(0)}% above market`, color: "text-[#ef4444]" };
    else marketTag = { label: "At market rate", color: "text-[#6b7280]" };
  }

  function handleCall() {
    // TODO: Integrate with carrier's phone number stored in the carriers table.
    //       On mobile this opens the dialer via: window.location.href = `tel:${carrier.phone}`
    setCallState("calling");
    setTimeout(() => setCallState("idle"), 3000);
  }

  function handleMessage() {
    // Ensure a conversation exists and navigate to the inbox
    const conv = ensureConversation({
      loadId: loadInfo.id,
      carrierId: carrier.id,
      carrierName: carrier.carrierName,
      driverName: carrier.driverName,
      truckNum: carrier.truckNum,
      origin: loadInfo.origin,
      destination: loadInfo.destination,
    });
    cardRouter.push(`/dashboard/3pl/quotes?conv=${conv.id}`);
  }

  function handleSendOffer() {
    // Ensure conversation exists then navigate to inbox with this load + rate pre-filled.
    // The offer is actually sent (and notifications fired) from inside the inbox.
    const conv = ensureConversation({
      loadId: loadInfo.id,
      carrierId: carrier.id,
      carrierName: carrier.carrierName,
      driverName: carrier.driverName,
      truckNum: carrier.truckNum,
      origin: loadInfo.origin,
      destination: loadInfo.destination,
    });
    const params = new URLSearchParams({
      conv: conv.id,
      offerLoad: loadInfo.id,
      ...(offerRate ? { offerRate } : {}),
    });
    cardRouter.push(`/dashboard/3pl/quotes?${params.toString()}`);
  }

  return (
    <div className="rounded-xl border border-[#e5e7eb] bg-white p-5">
      {/* Top row: carrier info + quote status */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-[#111827]">{carrier.carrierName}</p>
          <p className="mt-0.5 text-[13px] text-[#6b7280]">
            Truck {carrier.truckNum} · {carrier.driverName} · {carrier.city}, {carrier.state}
          </p>
        </div>
        <span
          className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
          style={{ backgroundColor: qs.bg, color: qs.color }}
        >
          {qs.label}
        </span>
      </div>

      {/* Stats row */}
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-[#6b7280]">
        <span className="flex items-center gap-1">
          <MapPin size={12} className="text-[#9ca3af]" />
          {carrier.distanceMi} mi to pickup
        </span>
        <span className="flex items-center gap-1">
          <Star size={12} className="fill-[#f59e0b] text-[#f59e0b]" />
          {carrier.rating.toFixed(1)}
        </span>
        <span className="flex items-center gap-1" style={{ color: lColor }}>
          <LIcon size={12} />
          {carrier.likelihood === "high"
            ? "Likely to accept"
            : carrier.likelihood === "medium"
            ? "May accept"
            : "Less likely"}
        </span>
        <span className="flex items-center gap-1 text-[#9ca3af]">
          <Bell size={12} />
          Notified {formatTime(carrier.notifiedAt)}
        </span>
      </div>

      {/* Likelihood note */}
      <p
        className="mb-4 rounded-lg px-3 py-2 text-[12px]"
        style={{ backgroundColor: `${LIKELIHOOD_COLOR[carrier.likelihood]}12`, color: lColor }}
      >
        {carrier.likelihoodNote}
      </p>

      {/* Rate row */}
      <div className="mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">
          {carrier.quoteStatus === "quoted" || carrier.quoteStatus === "accepted"
            ? "Their quote"
            : "Expected range"}
        </p>
        {carrier.quoteStatus === "quoted" || carrier.quoteStatus === "accepted" ? (
          <p className="text-[22px] font-bold tracking-tight text-[#111827]">
            ${carrier.quotedRate?.toLocaleString()}
          </p>
        ) : (
          <p className="text-[20px] font-bold tracking-tight text-[#111827]">
            ${carrier.rateMin.toLocaleString()}
            <span className="mx-1 text-base font-normal text-[#9ca3af]">–</span>
            ${carrier.rateMax.toLocaleString()}
          </p>
        )}
        {marketTag && (
          <p className={`mt-0.5 text-[11px] font-medium ${marketTag.color}`}>
            {marketTag.label}
          </p>
        )}
      </div>

      {/* Send Offer inline input (shown when inputting) */}
      {offerState === "inputting" && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-[#3b82f6] bg-[#eff6ff] px-3 py-2.5">
          <span className="text-[13px] font-semibold text-[#374151]">$</span>
          <input
            type="number"
            min="0"
            placeholder="Enter offer amount"
            value={offerRate}
            onChange={(e) => setOfferRate(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendOffer()}
            autoFocus
            className="flex-1 bg-transparent text-[13px] font-semibold text-[#111827] placeholder:text-[#9ca3af] outline-none"
          />
          <button
            onClick={handleSendOffer}
            className="flex items-center gap-1 rounded-md bg-[#3b82f6] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#2563eb] transition-colors"
          >
            <Send size={12} /> Send
          </button>
          <button
            onClick={() => { setOfferState("idle"); setOfferRate(""); }}
            className="flex items-center justify-center rounded-md p-1.5 text-[#9ca3af] hover:text-[#374151] transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        {/* Call */}
        <button
          onClick={handleCall}
          className={`flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-[13px] font-semibold transition-all ${
            callState === "calling"
              ? "border-[#22c55e] bg-[#f0fdf4] text-[#16a34a]"
              : "border-[#d1d5db] bg-white text-[#374151] hover:border-[#3b82f6] hover:text-[#2563eb]"
          }`}
        >
          <Phone size={14} />
          {callState === "calling" ? "Calling…" : "Call"}
        </button>

        {/* Message */}
        <button
          onClick={handleMessage}
          className="flex items-center gap-1.5 rounded-lg border border-[#d1d5db] bg-white px-3.5 py-2 text-[13px] font-semibold text-[#374151] transition-all hover:border-[#3b82f6] hover:text-[#2563eb]"
        >
          <MessageSquare size={14} />
          Message
        </button>

        {/* Send Offer */}
        {offerState === "idle" && (
          <button
            onClick={() => setOfferState("inputting")}
            className="ml-auto flex items-center gap-1.5 rounded-lg bg-[#3b82f6] px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-[#2563eb] transition-colors"
          >
            <DollarSign size={14} /> Send Offer
          </button>
        )}
        {offerState === "sent" && (
          <div className="ml-auto flex items-center gap-1.5 rounded-lg bg-[#f0fdf4] px-3.5 py-2 text-[13px] font-semibold text-[#16a34a]">
            <CheckCircle2 size={14} /> Offer sent!
          </div>
        )}

        {/* Accepted badge */}
        {carrier.quoteStatus === "accepted" && offerState === "idle" && (
          <div className="flex items-center gap-1.5 rounded-lg bg-[#f0fdf4] px-3 py-2 text-[13px] font-semibold text-[#16a34a]">
            <CheckCircle2 size={14} /> Booked
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Booking status card ───────────────────────────────────────────────────────

function BookingStatusCard({ booking }: { booking: Booking }) {
  const currentIdx = SHIPMENT_STATUS_ORDER.indexOf(booking.shipmentStatus);

  return (
    <div className="overflow-hidden rounded-xl border border-[#bbf7d0] bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#dcfce7] bg-[#f0fdf4] px-5 py-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={17} className="text-[#16a34a]" />
          <span className="text-[15px] font-semibold text-[#14532d]">Booking Confirmed</span>
        </div>
        <span className="text-[22px] font-bold text-[#14532d]">
          ${booking.acceptedRate.toLocaleString()}
        </span>
      </div>

      {/* Carrier info row */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-[#f3f4f6] px-5 py-3 text-[13px]">
        <span className="font-semibold text-[#1f2937]">{booking.carrierName}</span>
        <span className="text-[#d1d5db]">·</span>
        <span className="flex items-center gap-1 text-[#4b5563]">
          <Truck size={12} className="text-[#9ca3af]" /> {booking.truckNum}
        </span>
        <span className="text-[#d1d5db]">·</span>
        <span className="text-[#4b5563]">{booking.driverName}</span>
        {booking.pickupDate && (
          <>
            <span className="text-[#d1d5db]">·</span>
            <span className="flex items-center gap-1 text-[#4b5563]">
              <Calendar size={12} className="text-[#9ca3af]" />
              Pickup: {new Date(booking.pickupDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          </>
        )}
      </div>

      {/* Shipment progress timeline */}
      <div className="px-5 py-4">
        <p className="mb-3.5 text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">
          Shipment Progress
        </p>
        <div className="flex items-start">
          {SHIPMENT_STATUS_ORDER.flatMap((status, idx) => {
            const cfg = SHIPMENT_STATUS_CONFIG[status];
            const isCurrent = idx === currentIdx;
            const isFuture = idx > currentIdx;
            const parts = [];

            if (idx > 0) {
              parts.push(
                <div
                  key={`line-${idx}`}
                  className="mt-[5px] h-[2px] flex-1"
                  style={{ backgroundColor: idx <= currentIdx ? "#22c55e" : "#e5e7eb" }}
                />
              );
            }

            parts.push(
              <div key={status} className="flex flex-col items-center" style={{ maxWidth: 80 }}>
                <div
                  className="h-[11px] w-[11px] rounded-full border-2"
                  style={{
                    backgroundColor: isFuture ? "#ffffff" : cfg.dot,
                    borderColor: isFuture ? "#d1d5db" : cfg.dot,
                  }}
                />
                <span
                  className="mt-1.5 text-center text-[10px] leading-tight"
                  style={{ color: isFuture ? "#9ca3af" : cfg.color, fontWeight: isCurrent ? 600 : 500 }}
                >
                  {cfg.label}
                </span>
              </div>
            );

            return parts;
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function LoadDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading } = useAuth();
  const [load, setLoad] = useState<LoadDetail | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [mapMinimized, setMapMinimized] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (!loading && user && user.role !== "3pl") router.push("/dashboard/carrier");
  }, [user, loading, router]);

  // TODO: SELECT * FROM loads WHERE id = params.id AND broker_id = auth.uid()
  //       JOIN quote_requests ON quote_requests.load_id = loads.id
  useEffect(() => {
    const id = params.id as string;
    try {
      const loads = JSON.parse(sessionStorage.getItem("ch_loads") || "[]");
      const found = loads.find((l: LoadDetail) => l.id === id);
      if (found) { setLoad(found); return; }
      const active = sessionStorage.getItem("ch_active_load");
      if (active) { setLoad(JSON.parse(active)); return; }
    } catch { /* ignore */ }
    setLoad({
      id,
      origin: "Charleston, SC",
      destination: "Atlanta, GA",
      pickupDate: "2026-03-15",
      commodity: "Strawberries",
      temperature: "34",
      equipmentType: "reefer_single",
      createdAt: new Date().toISOString(),
      status: "active",
      notifiedCarriers: [],
    });
  }, [params.id]);

  useEffect(() => {
    if (!load) return;
    const found = getBookings().find((b) => b.loadId === load.id);
    setBooking(found ?? null);
  }, [load]);

  if (loading || !user || !load) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f9fafb]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#3b82f6] border-t-transparent" />
      </div>
    );
  }

  const sc = LOAD_STATUS_CONFIG[load.status] ?? LOAD_STATUS_CONFIG.active;
  const notifiedCarriers = load.notifiedCarriers ?? [];
  const marketMid =
    load.pricingRateMin && load.pricingRateMax
      ? (load.pricingRateMin + load.pricingRateMax) / 2
      : undefined;
  const hasCoords = load.originLat && load.originLng && load.destLat && load.destLng;

  return (
    <AppShell
      role="3pl"
      companyName={user.companyName}
      companyCity={user.companyCity}
      companyState={user.companyState}
      initials={user.initials}
    >
      {/* Back nav */}
      <Link
        href="/dashboard/3pl/loads"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-[#6b7280] hover:text-[#374151] transition-colors"
      >
        <ArrowLeft size={15} /> Back to My Loads
      </Link>

      {/* Page title row */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h1 className="text-[22px] font-bold tracking-tight text-[#111827]">{load.origin}</h1>
            <ArrowRight size={18} className="text-[#9ca3af]" />
            <h1 className="text-[22px] font-bold tracking-tight text-[#111827]">{load.destination}</h1>
            <span
              className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
              style={{ backgroundColor: sc.bg, color: sc.color }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: sc.dot }} />
              {sc.label}
            </span>
          </div>
          <p className="mt-1 text-sm text-[#6b7280]">
            Submitted{" "}
            {new Date(load.createdAt).toLocaleDateString("en-US", {
              month: "short", day: "numeric", year: "numeric",
            })}
          </p>
        </div>
        <Link
          href={`/dashboard/3pl/loads/${load.id}/find-trucks`}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[#3b82f6] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2563eb] transition-colors"
        >
          <Search size={15} /> Find Carriers
        </Link>
      </div>

      {/* ── Two-column layout ── */}
      <div className="flex gap-6 items-start">

        {/* ── Main column: map + carriers ── */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* Booking status */}
          {load.status === "booked" && booking && (
            <BookingStatusCard booking={booking} />
          )}

          {/* Collapsible route map */}
          {hasCoords && (
            <div className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white">
              <button
                onClick={() => setMapMinimized((v) => !v)}
                className="flex w-full items-center justify-between px-5 py-3.5 text-left hover:bg-[#f9fafb] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-[#3b82f6]" />
                  <span className="text-sm font-semibold text-[#374151]">Route</span>
                  {load.distanceMiles && load.durationMinutes && (
                    <span className="text-[12px] text-[#6b7280]">
                      · {load.distanceMiles} mi · {formatDuration(load.durationMinutes)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[12px] font-medium text-[#9ca3af]">
                  {mapMinimized ? (
                    <><ChevronDown size={15} /> Show map</>
                  ) : (
                    <><ChevronUp size={15} /> Minimize</>
                  )}
                </div>
              </button>
              {!mapMinimized && (
                <div className="px-4 pb-4">
                  <RouteMap
                    originCoords={[load.originLat!, load.originLng!]}
                    destCoords={[load.destLat!, load.destLng!]}
                    originLabel={load.origin}
                    destLabel={load.destination}
                    height={220}
                  />
                </div>
              )}
            </div>
          )}

          {/* ── Notified carriers — primary focus ── */}
          <div>
            {/* Section header */}
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-[18px] font-semibold text-[#111827]">Notified Carriers</h2>
                {notifiedCarriers.length > 0 && (
                  <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#f59e0b] px-1.5 text-sm font-semibold text-white">
                    {notifiedCarriers.length}
                  </span>
                )}
              </div>
              <Link
                href={`/dashboard/3pl/loads/${load.id}/find-trucks`}
                className="flex items-center gap-1.5 text-[13px] font-medium text-[#3b82f6] hover:text-[#2563eb] transition-colors"
              >
                <Search size={13} /> Find more carriers
              </Link>
            </div>

            {/* Quote tally bar (when at least one carrier notified) */}
            {notifiedCarriers.length > 0 && (
              <div className="mb-4 flex gap-3 rounded-xl border border-[#e5e7eb] bg-white px-5 py-3.5">
                {[
                  { label: "Awaiting", count: notifiedCarriers.filter((c) => c.quoteStatus === "pending").length, color: "#6b7280", bg: "#f9fafb" },
                  { label: "Quoted", count: notifiedCarriers.filter((c) => c.quoteStatus === "quoted").length, color: "#d97706", bg: "#fffbeb" },
                  { label: "Accepted", count: notifiedCarriers.filter((c) => c.quoteStatus === "accepted").length, color: "#16a34a", bg: "#f0fdf4" },
                  { label: "Declined", count: notifiedCarriers.filter((c) => c.quoteStatus === "declined").length, color: "#dc2626", bg: "#fef2f2" },
                ].map(({ label, count, color, bg }) => (
                  <div
                    key={label}
                    className="flex flex-1 flex-col items-center rounded-lg py-2.5"
                    style={{ backgroundColor: bg }}
                  >
                    <span className="text-[22px] font-bold" style={{ color }}>{count}</span>
                    <span className="text-[11px] font-medium" style={{ color }}>{label}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Carrier cards */}
            {notifiedCarriers.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-[#e5e7eb] bg-white py-16 text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f3f4f6]">
                  <FileText size={24} className="text-[#9ca3af]" />
                </div>
                <p className="text-sm font-medium text-[#374151]">No carriers notified yet</p>
                <p className="mt-1 text-xs text-[#9ca3af]">
                  Find and notify carriers to start receiving quotes.
                </p>
                <Link
                  href={`/dashboard/3pl/loads/${load.id}/find-trucks`}
                  className="mt-4 flex items-center gap-1.5 rounded-lg bg-[#3b82f6] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2563eb] transition-colors"
                >
                  <Search size={15} /> Find Carriers
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {notifiedCarriers.map((carrier) => (
                  <CarrierQuoteCard
                    key={carrier.id}
                    carrier={carrier}
                    marketMid={marketMid}
                    loadInfo={{ id: load.id, origin: load.origin, destination: load.destination }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right panel: load details ── */}
        <div className="w-72 shrink-0">
          <div className="rounded-xl border border-[#e5e7eb] bg-white p-5">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-[#6b7280]">
              Load Details
            </p>
            <div className="space-y-3.5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Pickup Date</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-[#1f2937]">
                  <Calendar size={13} className="text-[#9ca3af]" />
                  {formatDate(load.pickupDate)}
                </p>
              </div>
              {load.deliveryDate && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Delivery Date</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-[#1f2937]">
                    <Calendar size={13} className="text-[#9ca3af]" />
                    {formatDate(load.deliveryDate)}
                  </p>
                </div>
              )}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Commodity</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-[#1f2937]">
                  <Package size={13} className="text-[#9ca3af]" /> {load.commodity}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Temperature</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-[#1f2937]">
                  <Thermometer size={13} className="text-[#9ca3af]" /> {load.temperature}°F
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Equipment</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-[#1f2937]">
                  <Truck size={13} className="text-[#9ca3af]" /> {equipLabel(load.equipmentType)}
                </p>
              </div>
              {load.weightLbs && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Weight</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-[#1f2937]">
                    <Scale size={13} className="text-[#9ca3af]" />
                    {Number(load.weightLbs).toLocaleString()} lbs
                  </p>
                </div>
              )}
              {load.distanceMiles && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Distance</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-[#1f2937]">
                    <MapPin size={13} className="text-[#9ca3af]" /> {load.distanceMiles} miles
                  </p>
                </div>
              )}
              {load.durationMinutes && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Drive Time</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-[#1f2937]">
                    <Clock size={13} className="text-[#9ca3af]" /> {formatDuration(load.durationMinutes)}
                  </p>
                </div>
              )}
              {load.targetRate && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Target Rate</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-[#1f2937]">
                    <DollarSign size={13} className="text-[#9ca3af]" />
                    ${Number(load.targetRate).toLocaleString()}
                  </p>
                </div>
              )}
              {load.pricingRateMin && load.pricingRateMax && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Market Range</p>
                  <p className="mt-0.5 text-sm font-medium text-[#1f2937]">
                    ${load.pricingRateMin.toLocaleString()} – ${load.pricingRateMax.toLocaleString()}
                  </p>
                </div>
              )}
              {load.specialRequirements && (
                <div className="border-t border-[#f3f4f6] pt-3.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">
                    Special Requirements
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed text-[#374151]">
                    {load.specialRequirements}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </AppShell>
  );
}
