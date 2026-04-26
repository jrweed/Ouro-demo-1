"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Package,
  Inbox,
  FileText,
  DollarSign,
  Plus,
  CheckCircle2,
  Truck,
  AlertTriangle,
  ChevronRight,
  XCircle,
  Bell,
  ArrowRight,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { StatCard } from "@/components/shared/StatCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAuth } from "@/hooks/useAuth";
import { getBookings } from "@/lib/bookings";
import { getNotifications, type AppNotification } from "@/lib/notifications";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StoredLoad {
  id: string;
  origin: string;
  destination: string;
  pickupDate?: string;
  commodity?: string;
  temperature?: string;
  status: "active" | "carriers_notified" | "booked";
  createdAt?: string;
  notifiedCarriers?: { id: string }[];
}

interface StoredConversation {
  id: string;
  loadId: string;
  offer: { from: string; status: string } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(isoString: string) {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatPickupDate(dateStr?: string) {
  if (!dateStr) return "";
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    month: "short", day: "numeric",
  });
}

// ─── Load status display ──────────────────────────────────────────────────────

const LOAD_STATUS_DISPLAY: Record<string, { label: string; bg: string; color: string }> = {
  active:             { label: "Active",             bg: "#eff6ff", color: "#2563eb" },
  carriers_notified:  { label: "Carriers Notified",  bg: "#fffbeb", color: "#d97706" },
  booked:             { label: "Booked",             bg: "#f0fdf4", color: "#16a34a" },
};

// ─── Activity feed config ─────────────────────────────────────────────────────

type IconCmp = typeof Bell;
const NOTIF_ICON_CONFIG: Record<string, { icon: IconCmp; iconBg: string; iconColor: string }> = {
  offer_sent:       { icon: DollarSign,   iconBg: "#f0fdf4", iconColor: "#16a34a" },
  offer_received:   { icon: DollarSign,   iconBg: "#eff6ff", iconColor: "#3b82f6" },
  carrier_notified: { icon: Bell,         iconBg: "#fffbeb", iconColor: "#d97706" },
  quote_received:   { icon: Inbox,        iconBg: "#eff6ff", iconColor: "#3b82f6" },
  offer_accepted:   { icon: CheckCircle2, iconBg: "#f0fdf4", iconColor: "#16a34a" },
  offer_declined:   { icon: XCircle,      iconBg: "#fef2f2", iconColor: "#dc2626" },
  system:           { icon: Package,      iconBg: "#f9fafb", iconColor: "#6b7280" },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function LoadAttentionCard({
  load,
  quoteCount,
}: {
  load: StoredLoad;
  quoteCount: number;
}) {
  const sc = LOAD_STATUS_DISPLAY[load.status] ?? LOAD_STATUS_DISPLAY.active;
  const isBooked = load.status === "booked";
  const hasQuotes = quoteCount > 0 || load.status === "carriers_notified";

  const actionHref = isBooked
    ? "/dashboard/3pl/bookings"
    : hasQuotes
    ? "/dashboard/3pl/quotes"
    : `/dashboard/3pl/loads/${load.id}/find-trucks`;

  const actionLabel = isBooked ? "View Booking" : hasQuotes ? "View Quotes" : "Find Trucks";

  return (
    <div className="flex items-center justify-between rounded-[10px] border border-[#e5e7eb] bg-white px-5 py-4">
      <div className="flex flex-1 items-center gap-4 min-w-0">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#eff6ff]">
          <Package size={18} className="text-[#3b82f6]" />
        </div>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-[#111827]">
            <span className="truncate">{load.origin}</span>
            <ArrowRight size={13} className="shrink-0 text-[#9ca3af]" />
            <span className="truncate">{load.destination}</span>
          </p>
          <p className="mt-0.5 text-[13px] text-[#6b7280]">
            {[formatPickupDate(load.pickupDate), load.commodity, load.temperature ? `${load.temperature}°F` : ""].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3 ml-4">
        <div className="text-right">
          <span
            className="inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
            style={{ backgroundColor: sc.bg, color: sc.color }}
          >
            {sc.label}
          </span>
          <p className="mt-1 text-[13px] text-[#4b5563]">
            {quoteCount > 0 ? `${quoteCount} quote${quoteCount !== 1 ? "s" : ""}` : "No quotes yet"}
          </p>
        </div>
        <Link
          href={actionHref}
          className="whitespace-nowrap rounded-lg bg-[#3b82f6] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#2563eb] transition-colors"
        >
          {actionLabel}
        </Link>
      </div>
    </div>
  );
}

function ActivityItem({ notif }: { notif: AppNotification }) {
  const cfg = NOTIF_ICON_CONFIG[notif.type] ?? NOTIF_ICON_CONFIG.system;
  const Icon = cfg.icon;

  const inner = (
    <div className="flex gap-3 border-b border-[#f3f4f6] py-3 last:border-none">
      <div
        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: cfg.iconBg }}
      >
        <Icon size={15} style={{ color: cfg.iconColor }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#1f2937]">{notif.title}</p>
        <p className="mt-0.5 text-[13px] text-[#6b7280]">{notif.body}</p>
      </div>
      <span className="shrink-0 text-xs text-[#9ca3af]">{timeAgo(notif.createdAt)}</span>
    </div>
  );

  return notif.href ? (
    <Link href={notif.href} className="block hover:bg-[#fafafa] transition-colors -mx-5 px-5">
      {inner}
    </Link>
  ) : (
    inner
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ThreePLDashboard() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [loads, setLoads] = useState<StoredLoad[]>([]);
  const [convs, setConvs] = useState<StoredConversation[]>([]);
  const [activity, setActivity] = useState<AppNotification[]>([]);
  const [bookingCount, setBookingCount] = useState(0);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (!loading && user && user.role !== "3pl") router.push("/dashboard/carrier");
  }, [user, loading, router]);

  useEffect(() => {
    try {
      setLoads(JSON.parse(sessionStorage.getItem("ch_loads") || "[]"));
    } catch { /* ignore */ }
    try {
      setConvs(JSON.parse(sessionStorage.getItem("ch_conversations") || "[]"));
    } catch { /* ignore */ }
    setActivity(getNotifications().filter((n) => n.role === "3pl" || n.role === "both").slice(0, 5));
    setBookingCount(getBookings().length);
  }, []);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f9fafb]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#3b82f6] border-t-transparent" />
      </div>
    );
  }

  // ── Derived stats ────────────────────────────────────────────────────────────
  const activeLoads = loads.filter((l) => l.status !== "booked");
  const pendingQuotes = convs.filter(
    (c) => c.offer?.from === "carrier" && c.offer?.status === "pending"
  ).length;

  const now = new Date();
  const loadsThisMonth = loads.filter((l) => {
    if (!l.createdAt) return true; // include if no date
    const d = new Date(l.createdAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  // Loads needing attention: unbooked, most recent first, max 3
  const attentionLoads = [...activeLoads]
    .sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    })
    .slice(0, 3);

  // Quote count per load
  function quoteCountForLoad(loadId: string) {
    return convs.filter((c) => c.loadId === loadId && c.offer !== null).length;
  }

  // Unread alerts: loads with pending carrier offers
  const pendingCarrierOffers = convs.filter(
    (c) => c.offer?.from === "carrier" && c.offer?.status === "pending"
  ).length;

  return (
    <AppShell
      role="3pl"
      companyName={user.companyName}
      companyCity={user.companyCity}
      companyState={user.companyState}
      initials={user.initials}
    >
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[#111827]">Dashboard</h1>
          <p className="mt-1 text-sm text-[#6b7280]">Welcome back — here&apos;s your activity overview</p>
        </div>
        <Link
          href="/dashboard/3pl/loads/new"
          className="flex items-center gap-1.5 rounded-lg bg-[#3b82f6] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#2563eb] transition-colors"
        >
          <Plus size={17} /> Input Load
        </Link>
      </div>

      {/* Pending carrier offers alert */}
      {pendingCarrierOffers > 0 && (
        <div className="mb-6 flex items-center gap-4 rounded-[10px] border border-[#22c55e]/30 bg-[#f0fdf4] px-5 py-3.5">
          <AlertTriangle size={17} className="shrink-0 text-[#16a34a]" />
          <p className="flex-1 text-sm font-semibold text-[#14532d]">
            {pendingCarrierOffers === 1
              ? "1 carrier has responded to your offer"
              : `${pendingCarrierOffers} carriers have responded to your offers`}
          </p>
          <Link
            href="/dashboard/3pl/quotes"
            className="whitespace-nowrap rounded-lg bg-[#22c55e] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#16a34a] transition-colors"
          >
            Review Quotes
          </Link>
        </div>
      )}

      {/* Stat cards */}
      <div className="mb-7 flex gap-4">
        <StatCard
          icon={Package}
          label="Active Loads"
          value={loads.length > 0 ? String(activeLoads.length) : "0"}
          sub={loads.length > 0 ? `${loads.filter(l => l.status === "booked").length} booked` : "No loads posted yet"}
          accentClass="bg-[#eff6ff]"
        />
        <StatCard
          icon={Inbox}
          label="Pending Quotes"
          value={String(pendingQuotes)}
          sub={pendingQuotes > 0 ? "Carrier quotes to review" : "No pending quotes"}
          accentClass="bg-[#fffbeb]"
        />
        <StatCard
          icon={FileText}
          label="Loads This Month"
          value={String(loadsThisMonth)}
          sub={`${loads.length} total posted`}
          accentClass="bg-[#f0fdf4]"
        />
        <StatCard
          icon={DollarSign}
          label="Total Bookings"
          value={String(bookingCount)}
          sub={bookingCount > 0 ? "Confirmed with carriers" : "No bookings yet"}
          accentClass="bg-[#f0fdf4]"
        />
      </div>

      {/* Loads needing attention */}
      <section className="mb-7">
        <div className="mb-3.5 flex items-center justify-between">
          <h2 className="text-[18px] font-semibold text-[#111827]">Loads Needing Attention</h2>
          <Link
            href="/dashboard/3pl/loads"
            className="flex items-center gap-1 text-[13px] font-medium text-[#3b82f6] hover:text-[#2563eb] transition-colors"
          >
            View all loads <ChevronRight size={14} />
          </Link>
        </div>

        {attentionLoads.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No active loads"
            description="Post a load to start getting quotes from carriers."
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            {attentionLoads.map((load) => (
              <LoadAttentionCard
                key={load.id}
                load={load}
                quoteCount={quoteCountForLoad(load.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Recent activity */}
      <section>
        <h2 className="mb-3.5 text-[18px] font-semibold text-[#111827]">Recent Activity</h2>
        <div className="rounded-xl border border-[#e5e7eb] bg-white px-5 py-1">
          {activity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Bell size={24} className="mb-2 text-[#d1d5db]" />
              <p className="text-sm text-[#9ca3af]">Activity will appear here as you send offers and manage loads.</p>
            </div>
          ) : (
            activity.map((n) => <ActivityItem key={n.id} notif={n} />)
          )}
        </div>
      </section>
    </AppShell>
  );
}
