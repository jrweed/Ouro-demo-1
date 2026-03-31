"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  TrendingUp,
  Package,
  DollarSign,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { getBookings, type Booking } from "@/lib/bookings";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Load {
  id: string;
  status: string;
  origin: string;
  destination: string;
  commodity?: string;
  pickupDate?: string;
  pricingRateMin?: number;
  pricingRateMax?: number;
}

interface Conversation {
  id: string;
  offer: { from: string; status: string; amount: number } | null;
  origin: string;
  destination: string;
}

interface LaneStat {
  lane: string;
  loads: number;
  totalSpend: number;
  avgRate: number;
}

interface AnalyticsData {
  totalLoads: number;
  loadsByStatus: Record<string, number>;
  totalBookings: number;
  totalSpend: number;
  avgRate: number;
  // Quote funnel
  totalOffers: number;       // conversations that had an offer
  acceptedOffers: number;
  declinedOffers: number;
  pendingOffers: number;
  acceptanceRate: number;    // 0–100
  // Top lanes
  laneStats: LaneStat[];
  // Recent bookings
  recentBookings: Booking[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmtMoney(n: number) {
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function fmtPct(n: number) {
  return n.toFixed(0) + "%";
}

// ─── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  iconBg,
  iconColor,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="rounded-xl border border-[#e5e7eb] bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[12px] font-semibold uppercase tracking-wider text-[#9ca3af]">{label}</p>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ backgroundColor: iconBg }}
        >
          <Icon size={16} style={{ color: iconColor }} />
        </div>
      </div>
      <p className="text-[28px] font-bold tracking-tight text-[#111827]">{value}</p>
      {sub && <p className="mt-1 text-[12px] text-[#9ca3af]">{sub}</p>}
    </div>
  );
}

// ─── Funnel bar ────────────────────────────────────────────────────────────────

function FunnelBar({
  label,
  count,
  total,
  color,
  bg,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
  bg: string;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-24 shrink-0 text-right text-[12px] font-medium text-[#4b5563]">{label}</div>
      <div className="flex-1 overflow-hidden rounded-full bg-[#f3f4f6]" style={{ height: 8 }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color, minWidth: pct > 0 ? 4 : 0 }}
        />
      </div>
      <div
        className="w-16 shrink-0 rounded-full px-2 py-0.5 text-center text-[12px] font-semibold"
        style={{ backgroundColor: bg, color }}
      >
        {count}
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (!loading && user && user.role !== "3pl") router.push("/dashboard/carrier");
  }, [user, loading, router]);

  useEffect(() => {
    // ── Loads ────────────────────────────────────────────────────────────────
    let loads: Load[] = [];
    try {
      loads = JSON.parse(sessionStorage.getItem("ch_loads") || "[]");
    } catch { /* ignore */ }

    const loadsByStatus: Record<string, number> = {};
    for (const l of loads) {
      loadsByStatus[l.status] = (loadsByStatus[l.status] ?? 0) + 1;
    }

    // ── Bookings ─────────────────────────────────────────────────────────────
    const bookings = getBookings();
    const totalSpend = bookings.reduce((s, b) => s + b.acceptedRate, 0);
    const avgRate = bookings.length > 0 ? Math.round(totalSpend / bookings.length) : 0;

    // ── Quote funnel ─────────────────────────────────────────────────────────
    let convs: Conversation[] = [];
    try {
      convs = JSON.parse(sessionStorage.getItem("ch_conversations") || "[]");
    } catch { /* ignore */ }

    const withOffer = convs.filter((c) => c.offer !== null);
    const accepted  = withOffer.filter((c) => c.offer?.status === "accepted").length;
    const declined  = withOffer.filter((c) => c.offer?.status === "declined").length;
    const pending   = withOffer.filter((c) => c.offer?.status === "pending").length;
    const total     = withOffer.length;
    const acceptanceRate = total > 0 ? Math.round((accepted / total) * 100) : 0;

    // ── Spend by lane ────────────────────────────────────────────────────────
    const laneMap = new Map<string, { loads: number; totalSpend: number }>();
    for (const b of bookings) {
      const key = `${b.origin} → ${b.destination}`;
      const existing = laneMap.get(key) ?? { loads: 0, totalSpend: 0 };
      laneMap.set(key, { loads: existing.loads + 1, totalSpend: existing.totalSpend + b.acceptedRate });
    }
    const laneStats: LaneStat[] = Array.from(laneMap.entries())
      .map(([lane, s]) => ({ lane, loads: s.loads, totalSpend: s.totalSpend, avgRate: Math.round(s.totalSpend / s.loads) }))
      .sort((a, b) => b.totalSpend - a.totalSpend)
      .slice(0, 6);

    setData({
      totalLoads: loads.length,
      loadsByStatus,
      totalBookings: bookings.length,
      totalSpend,
      avgRate,
      totalOffers: total,
      acceptedOffers: accepted,
      declinedOffers: declined,
      pendingOffers: pending,
      acceptanceRate,
      laneStats,
      recentBookings: bookings.slice(0, 5),
    });
  }, []);

  if (loading || !user || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f9fafb]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#3b82f6] border-t-transparent" />
      </div>
    );
  }

  // Load status display config
  const STATUS_DISPLAY: Record<string, { label: string; color: string; bg: string }> = {
    draft:              { label: "Draft",             color: "#4b5563", bg: "#f3f4f6" },
    posted:             { label: "Posted",            color: "#1d4ed8", bg: "#dbeafe" },
    quoting:            { label: "Quoting",           color: "#1d4ed8", bg: "#dbeafe" },
    carriers_notified:  { label: "Carriers Notified", color: "#d97706", bg: "#fef3c7" },
    booked:             { label: "Booked",            color: "#16a34a", bg: "#dcfce7" },
    picked_up:          { label: "Picked Up",         color: "#7c3aed", bg: "#f5f3ff" },
    in_transit:         { label: "In Transit",        color: "#7c3aed", bg: "#f5f3ff" },
    delivered:          { label: "Delivered",         color: "#16a34a", bg: "#dcfce7" },
    cancelled:          { label: "Cancelled",         color: "#dc2626", bg: "#fef2f2" },
  };

  const hasBookings = data.totalBookings > 0;
  const hasLoads = data.totalLoads > 0;

  return (
    <AppShell
      role="3pl"
      companyName={user.companyName}
      companyCity={user.companyCity}
      companyState={user.companyState}
      initials={user.initials}
    >
      {/* Header */}
      <div className="mb-6">
        <h1 className="flex items-center gap-2.5 text-[26px] font-bold tracking-tight text-[#111827]">
          <BarChart3 size={24} className="text-[#3b82f6]" />
          Analytics
        </h1>
        <p className="mt-1 text-sm text-[#6b7280]">Overview of loads, bookings, and quote performance</p>
      </div>

      {/* ── Top stat cards ────────────────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <StatCard
          icon={Package}
          label="Loads Posted"
          value={String(data.totalLoads)}
          sub={`${data.loadsByStatus["booked"] ?? 0} booked · ${data.loadsByStatus["delivered"] ?? 0} delivered`}
          iconBg="#eff6ff"
          iconColor="#3b82f6"
        />
        <StatCard
          icon={CheckCircle2}
          label="Active Bookings"
          value={String(data.totalBookings)}
          sub={data.totalBookings > 0 ? "Confirmed with carriers" : "No bookings yet"}
          iconBg="#f0fdf4"
          iconColor="#16a34a"
        />
        <StatCard
          icon={DollarSign}
          label="Total Spend"
          value={hasBookings ? fmtMoney(data.totalSpend) : "—"}
          sub={hasBookings ? `Avg ${fmtMoney(data.avgRate)} per load` : "No bookings yet"}
          iconBg="#f0fdf4"
          iconColor="#16a34a"
        />
        <StatCard
          icon={TrendingUp}
          label="Acceptance Rate"
          value={data.totalOffers > 0 ? fmtPct(data.acceptanceRate) : "—"}
          sub={data.totalOffers > 0 ? `${data.acceptedOffers} of ${data.totalOffers} offers accepted` : "No offers sent yet"}
          iconBg="#eff6ff"
          iconColor="#3b82f6"
        />
      </div>

      <div className="grid grid-cols-3 gap-6">

        {/* ── Quote funnel ──────────────────────────────────────────────────── */}
        <div className="col-span-1 overflow-hidden rounded-xl border border-[#e5e7eb] bg-white">
          <div className="border-b border-[#f3f4f6] px-5 py-4">
            <h2 className="text-[14px] font-semibold text-[#111827]">Quote Funnel</h2>
            <p className="mt-0.5 text-[12px] text-[#9ca3af]">Offer outcomes across all conversations</p>
          </div>
          <div className="flex flex-col gap-4 px-5 py-5">
            {data.totalOffers === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Clock size={28} className="mb-2 text-[#d1d5db]" />
                <p className="text-[13px] text-[#9ca3af]">No offers sent yet</p>
              </div>
            ) : (
              <>
                <FunnelBar label="All offers"  count={data.totalOffers}    total={data.totalOffers} color="#3b82f6" bg="#eff6ff" />
                <FunnelBar label="Accepted"    count={data.acceptedOffers} total={data.totalOffers} color="#16a34a" bg="#dcfce7" />
                <FunnelBar label="Pending"     count={data.pendingOffers}  total={data.totalOffers} color="#d97706" bg="#fef3c7" />
                <FunnelBar label="Declined"    count={data.declinedOffers} total={data.totalOffers} color="#dc2626" bg="#fef2f2" />

                <div className="mt-1 rounded-xl bg-[#f9fafb] px-4 py-3 text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9ca3af]">Acceptance Rate</p>
                  <p className="mt-1 text-[30px] font-bold text-[#111827]">
                    {fmtPct(data.acceptanceRate)}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Loads by status ───────────────────────────────────────────────── */}
        <div className="col-span-1 overflow-hidden rounded-xl border border-[#e5e7eb] bg-white">
          <div className="border-b border-[#f3f4f6] px-5 py-4">
            <h2 className="text-[14px] font-semibold text-[#111827]">Loads by Status</h2>
            <p className="mt-0.5 text-[12px] text-[#9ca3af]">{data.totalLoads} total loads posted</p>
          </div>
          <div className="divide-y divide-[#f9fafb]">
            {!hasLoads ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Package size={28} className="mb-2 text-[#d1d5db]" />
                <p className="text-[13px] text-[#9ca3af]">No loads posted yet</p>
              </div>
            ) : (
              Object.entries(data.loadsByStatus)
                .sort(([, a], [, b]) => b - a)
                .map(([status, count]) => {
                  const cfg = STATUS_DISPLAY[status] ?? { label: status, color: "#6b7280", bg: "#f3f4f6" };
                  const pct = Math.round((count / data.totalLoads) * 100);
                  return (
                    <div key={status} className="flex items-center justify-between px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                          style={{ backgroundColor: cfg.bg, color: cfg.color }}
                        >
                          {cfg.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-20 overflow-hidden rounded-full bg-[#f3f4f6]" style={{ height: 6 }}>
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, backgroundColor: cfg.color, minWidth: 3 }}
                          />
                        </div>
                        <span className="w-5 text-right text-[13px] font-semibold text-[#1f2937]">{count}</span>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>

        {/* ── Spend by lane ─────────────────────────────────────────────────── */}
        <div className="col-span-1 overflow-hidden rounded-xl border border-[#e5e7eb] bg-white">
          <div className="border-b border-[#f3f4f6] px-5 py-4">
            <h2 className="text-[14px] font-semibold text-[#111827]">Spend by Lane</h2>
            <p className="mt-0.5 text-[12px] text-[#9ca3af]">Top lanes by total booked spend</p>
          </div>
          <div className="divide-y divide-[#f9fafb]">
            {data.laneStats.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <ArrowRight size={28} className="mb-2 text-[#d1d5db]" />
                <p className="text-[13px] text-[#9ca3af]">No booked lanes yet</p>
              </div>
            ) : (
              data.laneStats.map((ls) => (
                <div key={ls.lane} className="px-5 py-3">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="truncate text-[13px] font-medium text-[#1f2937] max-w-[60%]">{ls.lane}</p>
                    <p className="text-[13px] font-bold text-[#111827]">{fmtMoney(ls.totalSpend)}</p>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#9ca3af]">
                    <span>{ls.loads} load{ls.loads !== 1 ? "s" : ""}</span>
                    <span>avg {fmtMoney(ls.avgRate)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* ── Recent bookings table ─────────────────────────────────────────────── */}
      {hasBookings && (
        <div className="mt-6 overflow-hidden rounded-xl border border-[#e5e7eb] bg-white">
          <div className="border-b border-[#f3f4f6] px-5 py-4">
            <h2 className="text-[14px] font-semibold text-[#111827]">Recent Bookings</h2>
          </div>
          {/* Header */}
          <div className="grid border-b border-[#f3f4f6] bg-[#f9fafb] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[#9ca3af]"
            style={{ gridTemplateColumns: "1fr 1fr 140px 110px 100px" }}>
            <span>Origin</span>
            <span>Destination</span>
            <span>Carrier</span>
            <span>Rate</span>
            <span>Status</span>
          </div>
          {data.recentBookings.map((b) => {
            const statusLabels: Record<string, { label: string; color: string; bg: string }> = {
              confirmed:        { label: "Confirmed",        color: "#2563eb", bg: "#eff6ff" },
              pickup_scheduled: { label: "Pickup Scheduled", color: "#d97706", bg: "#fffbeb" },
              in_transit:       { label: "In Transit",       color: "#7c3aed", bg: "#f5f3ff" },
              delivered:        { label: "Delivered",        color: "#16a34a", bg: "#f0fdf4" },
            };
            const sc = statusLabels[b.shipmentStatus] ?? { label: b.shipmentStatus, color: "#6b7280", bg: "#f3f4f6" };
            return (
              <div
                key={b.id}
                className="grid items-center border-b border-[#f9fafb] px-5 py-3 text-[13px] last:border-none"
                style={{ gridTemplateColumns: "1fr 1fr 140px 110px 100px" }}
              >
                <span className="text-[#4b5563]">{b.origin}</span>
                <span className="text-[#4b5563]">{b.destination}</span>
                <span className="truncate font-medium text-[#1f2937]">{b.carrierName}</span>
                <span className="font-bold text-[#111827]">{fmtMoney(b.acceptedRate)}</span>
                <span
                  className="inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                  style={{ backgroundColor: sc.bg, color: sc.color }}
                >
                  {sc.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
