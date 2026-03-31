"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Truck,
  Package,
  MapPin,
  Plus,
  ChevronRight,
  ArrowRight,
  Wrench,
  MessageSquare,
  DollarSign,
  AlertCircle,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useAuth } from "@/hooks/useAuth";
import { getConversationsByCarrier, type Conversation } from "@/lib/conversations";
import { getBookingsByCarrier, SHIPMENT_STATUS_CONFIG, type Booking } from "@/lib/bookings";
import { getTrucks, getDriverForTruck, type Truck as TruckType } from "@/lib/fleet";
import { EQUIPMENT_TYPES } from "@/lib/utils/constants";

// Load extra fields from ch_loads for a given loadId
function enrichFromLoads(loadId: string): { date: string; commodity: string; temp: string } {
  try {
    const loads: { id: string; pickupDate?: string; commodity?: string; temperature?: string }[] =
      JSON.parse(sessionStorage.getItem("ch_loads") || "[]");
    const l = loads.find((x) => x.id === loadId);
    if (l) {
      const date = l.pickupDate
        ? new Date(l.pickupDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : "";
      return { date, commodity: l.commodity ?? "", temp: l.temperature ?? "" };
    }
  } catch { /* ignore */ }
  return { date: "", commodity: "", temp: "" };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function equipLabel(val: string) {
  return EQUIPMENT_TYPES.find((e) => e.value === val)?.label ?? val;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TruckRow({ truck, driverName }: { truck: TruckType; driverName: string | null }) {
  return (
    <Link
      href="/dashboard/carrier/trucks"
      className={`grid items-center border-b border-[#f3f4f6] px-5 py-3.5 text-sm last:border-none hover:bg-[#fafafa] transition-colors ${
        truck.status === "maintenance" ? "bg-[#fef2f2]/40" : "bg-white"
      }`}
      style={{ gridTemplateColumns: "80px 160px 160px 130px 120px 72px" }}
    >
      <span className="font-semibold text-[#1f2937]">{truck.truckNum}</span>
      <span className="text-[13px] text-[#4b5563]">{equipLabel(truck.equipmentType)}</span>
      <span className={`text-[13px] ${driverName ? "text-[#374151]" : "text-[#9ca3af]"}`}>
        {driverName ?? (
          <span className="flex items-center gap-1">
            Unassigned{" "}
            <span className="text-[11px] font-medium text-[#d97706]">⚠</span>
          </span>
        )}
      </span>
      <StatusBadge status={truck.status} />
      <span className="flex items-center gap-1 text-[13px] text-[#4b5563]">
        <MapPin size={12} className="text-[#9ca3af]" />
        {truck.city}, {truck.state}
      </span>
      <span className="rounded-md border border-[#d1d5db] px-2.5 py-1 text-center text-xs text-[#4b5563]">
        Edit
      </span>
    </Link>
  );
}

function QuoteRequestCard({ conv }: { conv: Conversation }) {
  const extra = enrichFromLoads(conv.loadId);
  const offerAmount = conv.offer?.amount;
  const meta = [extra.date, extra.commodity, extra.temp ? `${extra.temp}°F` : ""].filter(Boolean).join(" · ");

  return (
    <div className="flex items-center justify-between rounded-[10px] border border-[#e5e7eb] bg-white px-5 py-4">
      <div className="flex flex-1 items-center gap-4 min-w-0">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#eff6ff]">
          <Package size={18} className="text-[#3b82f6]" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-[#111827]">{conv.origin}</span>
            <ArrowRight size={14} className="shrink-0 text-[#9ca3af]" />
            <span className="truncate text-sm font-semibold text-[#111827]">{conv.destination}</span>
          </div>
          {meta && <p className="mt-0.5 text-[13px] text-[#6b7280]">{meta}</p>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-4 ml-3">
        <div className="text-right">
          <div className="flex items-center justify-end gap-1 text-[13px] font-medium text-[#16a34a]">
            <Truck size={13} /> Truck {conv.truckNum}
          </div>
          {offerAmount && (
            <p className="mt-0.5 flex items-center justify-end gap-1 text-xs font-semibold text-[#d97706]">
              <DollarSign size={10} /> ${offerAmount.toLocaleString()} offer
            </p>
          )}
          <p className="mt-0.5 text-xs text-[#9ca3af]">{timeAgo(conv.lastActivity)}</p>
        </div>
        <Link
          href={`/dashboard/carrier/inbox?conv=${conv.id}`}
          className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-[#3b82f6] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#2563eb] transition-colors"
        >
          View &amp; Quote <ChevronRight size={13} />
        </Link>
      </div>
    </div>
  );
}

function ActiveLoadRow({ booking }: { booking: Booking }) {
  const sc = SHIPMENT_STATUS_CONFIG[booking.shipmentStatus];
  return (
    <div className="flex items-center justify-between border-b border-[#f3f4f6] px-5 py-3.5 last:border-none hover:bg-[#fafafa] transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: sc.bg }}>
          <Truck size={15} style={{ color: sc.dot }} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[13px] font-semibold text-[#111827]">
            <span className="truncate">{booking.origin}</span>
            <ArrowRight size={12} className="shrink-0 text-[#9ca3af]" />
            <span className="truncate">{booking.destination}</span>
          </div>
          <p className="mt-0.5 text-[11px] text-[#6b7280]">
            Truck {booking.truckNum} · {booking.driverName}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        <span
          className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold"
          style={{ color: sc.color, backgroundColor: sc.bg }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: sc.dot }} />
          {sc.label}
        </span>
        <p className="text-[13px] font-bold text-[#111827]">${booking.acceptedRate.toLocaleString()}</p>
        <Link
          href="/dashboard/carrier/loads"
          className="rounded-md border border-[#d1d5db] px-2.5 py-1 text-xs text-[#4b5563] hover:bg-[#f9fafb] transition-colors"
        >
          Manage
        </Link>
      </div>
    </div>
  );
}

function ConvRow({ conv }: { conv: Conversation }) {
  const hasPendingOffer = conv.offer?.status === "pending" && conv.offer.from === "3pl";
  return (
    <div className="flex items-center justify-between border-b border-[#f3f4f6] px-5 py-3.5 last:border-none hover:bg-[#fafafa] transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f0fdf4]">
          <MessageSquare size={15} className="text-[#16a34a]" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[13px] font-semibold text-[#111827]">
            <span className="truncate">{conv.origin}</span>
            <ArrowRight size={12} className="shrink-0 text-[#9ca3af]" />
            <span className="truncate">{conv.destination}</span>
          </div>
          <p className="mt-0.5 truncate text-[11px] text-[#6b7280]">{conv.lastMessage || "No messages yet"}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {hasPendingOffer && (
          <span className="flex items-center gap-1 rounded-full bg-[#fef9c3] px-2.5 py-1 text-[11px] font-semibold text-[#854d0e]">
            <DollarSign size={10} /> ${conv.offer!.amount.toLocaleString()} offer
          </span>
        )}
        {(conv.unreadCarrier ?? 0) > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#22c55e] px-1.5 text-[11px] font-semibold text-white">
            {conv.unreadCarrier}
          </span>
        )}
        <p className="text-[11px] text-[#9ca3af]">{timeAgo(conv.lastActivity)}</p>
        <Link
          href={`/dashboard/carrier/inbox?conv=${conv.id}`}
          className="rounded-md border border-[#d1d5db] px-2.5 py-1 text-xs text-[#4b5563] hover:bg-[#f9fafb] transition-colors"
        >
          Open
        </Link>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CarrierDashboard() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [trucks, setTrucks] = useState<TruckType[]>([]);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (!loading && user && user.role !== "carrier") router.push("/dashboard/3pl");
  }, [user, loading, router]);

  useEffect(() => {
    setConvs(
      getConversationsByCarrier().sort(
        (a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
      )
    );
    setBookings(
      getBookingsByCarrier().sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    );
    setTrucks(getTrucks().sort((a, b) => a.truckNum.localeCompare(b.truckNum)));
  }, []);

  const activeBookings = bookings.filter((b) => b.shipmentStatus !== "delivered");
  const totalUnread = convs.reduce((sum, c) => sum + (c.unreadCarrier ?? 0), 0);
  const pendingOffers = convs.filter((c) => c.offer?.status === "pending" && c.offer.from === "3pl");

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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[#111827]">Dashboard</h1>
          <p className="mt-1 text-sm text-[#6b7280]">Manage your fleet and respond to load opportunities</p>
        </div>
        <Link
          href="/dashboard/carrier/trucks"
          className="flex items-center gap-1.5 rounded-lg bg-[#3b82f6] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#2563eb] transition-colors"
        >
          <Plus size={17} /> Add Truck
        </Link>
      </div>

      {/* Pending offer alert */}
      {pendingOffers.length > 0 && (
        <div className="mb-6 flex items-center gap-4 rounded-[10px] border border-[#22c55e]/30 bg-[#f0fdf4] px-5 py-3.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white">
            <AlertCircle size={17} className="text-[#16a34a]" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#14532d]">
              {pendingOffers.length === 1
                ? "You have 1 pending offer from a broker"
                : `You have ${pendingOffers.length} pending offers from brokers`}
            </p>
            <p className="mt-0.5 text-[13px] text-[#16a34a]">
              Review and accept or decline in your inbox
            </p>
          </div>
          <Link
            href="/dashboard/carrier/inbox"
            className="whitespace-nowrap rounded-lg bg-[#22c55e] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#16a34a] transition-colors"
          >
            Open Inbox
          </Link>
        </div>
      )}

      {/* Stat cards */}
      <div className="mb-7 flex gap-4">
        <StatCard
          icon={Truck}
          label="Total Trucks"
          value={String(trucks.length)}
          sub={`${trucks.filter(t => t.status === "available").length} available · ${trucks.filter(t => t.status === "loaded" || t.status === "in_transit").length} active · ${trucks.filter(t => t.status === "maintenance").length} maint`}
          accentClass="bg-[#eff6ff]"
        />
        <StatCard
          icon={Package}
          label="Active Loads"
          value={String(activeBookings.length)}
          sub={activeBookings.length > 0 ? "In progress" : "No active loads"}
          accentClass="bg-[#f0fdf4]"
        />
        <StatCard
          icon={MessageSquare}
          label="Unread Messages"
          value={String(totalUnread || 0)}
          sub={totalUnread > 0 ? `${totalUnread} new message${totalUnread !== 1 ? "s" : ""}` : "All caught up"}
          accentClass="bg-[#fffbeb]"
        />
        <StatCard
          icon={MapPin}
          label="Coverage Area"
          value="4"
          sub="SC, GA, FL, NC"
          accentClass="bg-[#eff6ff]"
        />
      </div>

      {/* Active loads section */}
      {activeBookings.length > 0 && (
        <section className="mb-7">
          <div className="mb-3.5 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[18px] font-semibold text-[#111827]">
              Active Loads
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#22c55e] px-1.5 text-xs font-semibold text-white">
                {activeBookings.length}
              </span>
            </h2>
            <Link
              href="/dashboard/carrier/loads"
              className="flex items-center gap-1 text-[13px] font-medium text-[#3b82f6] hover:text-[#2563eb] transition-colors"
            >
              Manage all <ChevronRight size={14} />
            </Link>
          </div>
          <div className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white">
            {activeBookings.slice(0, 3).map((b) => (
              <ActiveLoadRow key={b.id} booking={b} />
            ))}
          </div>
        </section>
      )}

      {/* Recent messages section */}
      {convs.length > 0 && (
        <section className="mb-7">
          <div className="mb-3.5 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[18px] font-semibold text-[#111827]">
              Recent Messages
              {totalUnread > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#22c55e] px-1.5 text-xs font-semibold text-white">
                  {totalUnread}
                </span>
              )}
            </h2>
            <Link
              href="/dashboard/carrier/inbox"
              className="flex items-center gap-1 text-[13px] font-medium text-[#3b82f6] hover:text-[#2563eb] transition-colors"
            >
              Open inbox <ChevronRight size={14} />
            </Link>
          </div>
          <div className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white">
            {convs.slice(0, 3).map((c) => (
              <ConvRow key={c.id} conv={c} />
            ))}
          </div>
        </section>
      )}

      {/* Fleet table */}
      <section className="mb-7">
        <div className="mb-3.5 flex items-center justify-between">
          <h2 className="text-[18px] font-semibold text-[#111827]">My Fleet</h2>
          <Link
            href="/dashboard/carrier/trucks"
            className="flex items-center gap-1 text-[13px] font-medium text-[#3b82f6] hover:text-[#2563eb] transition-colors"
          >
            Manage all trucks <ChevronRight size={14} />
          </Link>
        </div>

        <div className="overflow-hidden rounded-xl border border-[#e5e7eb]">
          <div
            className="grid border-b border-[#e5e7eb] bg-[#f9fafb] px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#6b7280]"
            style={{ gridTemplateColumns: "80px 160px 160px 130px 120px 72px" }}
          >
            <span>Truck</span>
            <span>Equipment</span>
            <span>Driver</span>
            <span>Status</span>
            <span>Location</span>
            <span />
          </div>
          {trucks.map((truck) => (
            <TruckRow key={truck.id} truck={truck} driverName={getDriverForTruck(truck.id)?.name ?? null} />
          ))}
        </div>
      </section>

      {/* Maintenance alert — only show if there are trucks in maintenance */}
      {trucks.filter(t => t.status === "maintenance").length > 0 && (
        <div className="mb-7 flex items-center gap-4 rounded-[10px] border border-[#ef4444]/20 bg-[#fef2f2] px-5 py-3.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white">
            <Wrench size={17} className="text-[#ef4444]" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#1f2937]">
              {trucks.filter(t => t.status === "maintenance").map(t => t.truckNum).join(", ")} in maintenance
            </p>
            <p className="mt-0.5 text-[13px] text-[#4b5563]">
              {trucks.filter(t => t.status === "maintenance").map(t => t.notes || "No notes").join(" · ")}
            </p>
          </div>
          <Link
            href="/dashboard/carrier/trucks"
            className="whitespace-nowrap rounded-lg border border-[#d1d5db] bg-white px-4 py-2 text-[13px] font-medium text-[#374151] hover:bg-[#f9fafb] transition-colors"
          >
            Manage Fleet
          </Link>
        </div>
      )}

      {/* Quote requests — broker offers awaiting carrier response */}
      <section>
        <div className="mb-3.5 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-[18px] font-semibold text-[#111827]">
            New Quote Requests
            {pendingOffers.length > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ef4444] px-1.5 text-xs font-semibold text-white">
                {pendingOffers.length}
              </span>
            )}
          </h2>
          <Link
            href="/dashboard/carrier/quote-requests"
            className="flex items-center gap-1 text-[13px] font-medium text-[#3b82f6] hover:text-[#2563eb] transition-colors"
          >
            View all requests <ChevronRight size={14} />
          </Link>
        </div>
        {pendingOffers.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-[#e5e7eb] bg-white py-12 text-center">
            <Package size={26} className="mb-2 text-[#d1d5db]" />
            <p className="text-sm font-medium text-[#374151]">No pending quote requests</p>
            <p className="mt-1 text-xs text-[#9ca3af]">Broker offers will appear here when sent to your trucks.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {pendingOffers.slice(0, 3).map((conv) => (
              <QuoteRequestCard key={conv.id} conv={conv} />
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
