"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Truck,
  MapPin,
  Star,
  CheckCircle2,
  ChevronDown,
  Package,
  Thermometer,
  Calendar,
  ArrowRight,
  Bell,
  TrendingUp,
  TrendingDown,
  Minus,
  Shield,
  XCircle,
  Zap,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";
import {
  runMatching,
  loadToMatchingFormat,
  type MatchResult,
  type FilterRejection,
} from "@/lib/matching";
import { ensureCarrierData } from "@/lib/carrier-data";
import { equipmentLabel as equipLabel } from "@/lib/utils/constants";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ActiveLoad {
  id: string;
  origin: string;
  destination: string;
  pickupDate: string;
  commodity: string;
  temperature: string;
  equipmentType: string;
  weightLbs?: string | number;
  pricingRateMin?: number;
  pricingRateMax?: number;
  distanceMiles?: number;
}

type Likelihood = "high" | "medium" | "low";

interface MatchedCarrier {
  id: string;
  carrierId: string;
  truckId: string;
  truckNum: string;
  carrierName: string;
  contactName: string;
  phone: string;
  distanceMi: number;
  rating: number;
  totalLoads: number;
  equipment: string;
  city: string;
  state: string;
  likelihood: Likelihood;
  likelihoodNote: string;
  matchScore: number;
  scores: MatchResult["scores"];
  notified: boolean;
  notifiedAt: string | null;
}

// ─── Likelihood config ──────────────────────────────────────────────────────

const LIKELIHOOD_CONFIG: Record<
  Likelihood,
  { label: string; bg: string; color: string; dot: string; icon: typeof TrendingUp }
> = {
  high:   { label: "Strong match", bg: "#f0fdf4", color: "#16a34a", dot: "#22c55e", icon: TrendingUp },
  medium: { label: "Good match",   bg: "#fffbeb", color: "#d97706", dot: "#f59e0b", icon: Minus },
  low:    { label: "Weak match",   bg: "#fef2f2", color: "#dc2626", dot: "#ef4444", icon: TrendingDown },
};

function scoreLikelihood(composite: number): Likelihood {
  if (composite >= 0.5) return "high";
  if (composite >= 0.1) return "medium";
  return "low";
}

function buildLikelihoodNote(m: MatchResult): string {
  const parts: string[] = [];
  parts.push(`${m.deadhead_miles.toFixed(0)} mi deadhead`);
  if (m.scores.repeat_booking >= 0.5) parts.push("strong lane history");
  else if (m.scores.repeat_booking >= 0.3 && m.carrier.total_loads_completed > 0) parts.push("some lane history");
  else if (m.carrier.total_loads_completed === 0) parts.push("new to platform");
  if (m.scores.reliability >= 0.9) parts.push("highly reliable");
  else if (m.scores.reliability < 0.75) parts.push("reliability concerns");
  return parts.join(" · ");
}

function matchResultToCarrier(m: MatchResult): MatchedCarrier {
  // Use shared equipLabel for truck equipment type display
  return {
    id: `${m.carrier.id}__${m.truck.id}`,
    carrierId: m.carrier.id,
    truckId: m.truck.id,
    truckNum: m.truck.unit_number,
    carrierName: m.carrier.company_name,
    contactName: m.carrier.contact_name,
    phone: m.carrier.phone,
    distanceMi: Math.round(m.deadhead_miles),
    rating: m.carrier.rating ?? 0,
    totalLoads: m.carrier.total_loads_completed,
    equipment: equipLabel(m.truck.equipment_type),
    city: m.truck.current_location_city,
    state: m.truck.current_location_state,
    likelihood: scoreLikelihood(m.scores.composite),
    likelihoodNote: buildLikelihoodNote(m),
    matchScore: m.scores.composite,
    scores: m.scores,
    notified: false,
    notifiedAt: null,
  };
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function ScorePill({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 70 ? "#16a34a" : pct >= 30 ? "#d97706" : "#dc2626";
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-[#9ca3af]">{label}</span>
      <div className="h-1.5 w-12 rounded-full bg-[#f3f4f6]">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-[10px] font-medium" style={{ color }}>{pct}%</span>
    </div>
  );
}

function CarrierCard({
  carrier,
  onNotify,
  isSelected,
  onSelect,
}: {
  carrier: MatchedCarrier;
  onNotify: (id: string) => void;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const lhd = LIKELIHOOD_CONFIG[carrier.likelihood];
  const LIcon = lhd.icon;

  return (
    <div
      onClick={() => onSelect(carrier.id)}
      className={`cursor-pointer rounded-xl border bg-white p-5 transition-all ${
        isSelected
          ? "border-[#3b82f6] shadow-md ring-1 ring-[#3b82f6]/20"
          : "border-[#e5e7eb] hover:border-[#3b82f6]/40 hover:shadow-sm"
      }`}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#111827]">
            {carrier.carrierName}
          </p>
          <p className="mt-0.5 text-xs text-[#6b7280]">
            Truck {carrier.truckNum} · {carrier.contactName}
          </p>
        </div>
        {/* Match badge */}
        <div className="flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
          style={{ backgroundColor: lhd.bg, color: lhd.color }}
        >
          <LIcon size={11} />
          {lhd.label}
        </div>
      </div>

      {/* Meta row */}
      <div className="mb-3 flex flex-wrap gap-3 text-[13px] text-[#4b5563]">
        <span className="flex items-center gap-1">
          <MapPin size={12} className="text-[#9ca3af]" />
          {carrier.city}, {carrier.state} · {carrier.distanceMi} mi
        </span>
        {carrier.rating > 0 && (
          <span className="flex items-center gap-1 font-medium text-[#374151]">
            <Star size={12} className="fill-[#f59e0b] text-[#f59e0b]" />
            {carrier.rating.toFixed(1)}
            <span className="font-normal text-[#9ca3af]">({carrier.totalLoads} loads)</span>
          </span>
        )}
        {carrier.rating === 0 && (
          <span className="flex items-center gap-1 text-[#9ca3af]">
            <Star size={12} />
            New carrier
          </span>
        )}
        <span className="flex items-center gap-1">
          <Truck size={12} className="text-[#9ca3af]" />
          {carrier.equipment}
        </span>
      </div>

      {/* Likelihood note */}
      <p className="mb-3 flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs"
        style={{ backgroundColor: lhd.bg, color: lhd.color }}
      >
        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: lhd.dot }} />
        {carrier.likelihoodNote}
      </p>

      {/* Score breakdown */}
      <div className="mb-4 grid grid-cols-5 gap-y-1">
        <ScorePill label="Distance" value={carrier.scores.distance} />
        <ScorePill label="Freshness" value={carrier.scores.freshness} />
        <ScorePill label="History" value={carrier.scores.repeat_booking} />
        <ScorePill label="Rating" value={carrier.scores.rating} />
        <ScorePill label="Reliability" value={carrier.scores.reliability} />
      </div>

      {/* Composite score + actions */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 rounded-lg bg-[#f9fafb] px-3 py-1.5 text-[13px]">
          <Zap size={12} className="text-[#3b82f6]" />
          <span className="font-semibold text-[#111827]">{(carrier.matchScore * 100).toFixed(1)}%</span>
          <span className="text-[#9ca3af]">match</span>
        </div>

        {/* Notify / Notified — pushed to the right */}
        <div className="ml-auto">
          {carrier.notified ? (
            <div className="text-right">
              <div className="flex items-center gap-1.5 rounded-lg bg-[#f0fdf4] px-3 py-2 text-[13px] font-medium text-[#16a34a]">
                <CheckCircle2 size={14} /> Notified
              </div>
              {carrier.notifiedAt && (
                <p className="mt-1 text-[11px] text-[#9ca3af]">
                  {new Date(carrier.notifiedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                </p>
              )}
            </div>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onNotify(carrier.id); }}
              className="flex items-center gap-1.5 rounded-lg bg-[#3b82f6] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#2563eb] transition-colors"
            >
              <Bell size={13} /> Notify Carrier
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function RejectionCard({ rejections }: { rejections: FilterRejection[] }) {
  const [expanded, setExpanded] = useState(false);
  if (rejections.length === 0) return null;
  return (
    <div className="rounded-xl border border-[#fecaca] bg-[#fef2f2] p-4">
      <button onClick={() => setExpanded(v => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-[#991b1b]">
          <Shield size={14} />
          {rejections.length} carrier{rejections.length > 1 ? "s" : ""} filtered out by hard constraints
        </div>
        <ChevronDown size={14} className={`text-[#991b1b] transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>
      {expanded && (
        <div className="mt-3 space-y-1.5">
          {rejections.map((r) => (
            <div key={r.carrier_id} className="flex items-start gap-2 text-xs text-[#7f1d1d]">
              <XCircle size={12} className="mt-0.5 shrink-0 text-[#ef4444]" />
              <span><span className="font-semibold">{r.carrier_name}</span> — {r.reason}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function FindTrucksPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading } = useAuth();

  const [load, setLoad] = useState<ActiveLoad | null>(null);
  const [carriers, setCarriers] = useState<MatchedCarrier[]>([]);
  const [rejections, setRejections] = useState<FilterRejection[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [distanceFilter, setDistanceFilter] = useState<number>(200);
  const [sortBy, setSortBy] = useState<"score" | "distance" | "rating">("score");
  const [notifyAllLoading, setNotifyAllLoading] = useState(false);
  const [matchingDone, setMatchingDone] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (!loading && user && user.role !== "3pl") router.push("/dashboard/carrier");
  }, [user, loading, router]);

  // Seed carrier data on mount
  useEffect(() => { ensureCarrierData(); }, []);

  // Load data from sessionStorage
  useEffect(() => {
    const id = params.id as string;
    const fallback: ActiveLoad = {
      id,
      origin: "Charleston, SC",
      destination: "Atlanta, GA",
      pickupDate: "2026-03-15",
      commodity: "Strawberries",
      temperature: "34",
      equipmentType: "reefer_single",
    };
    try {
      const loads = JSON.parse(sessionStorage.getItem("ch_loads") || "[]");
      const found = loads.find((l: ActiveLoad) => l.id === id);
      if (found) { setLoad(found); return; }
      const active = sessionStorage.getItem("ch_active_load");
      if (active) { setLoad(JSON.parse(active)); return; }
    } catch { /* ignore */ }
    setLoad(fallback);
  }, [params.id]);

  // Run matching algorithm when load is available
  useEffect(() => {
    if (!load) return;
    const matchLoad = loadToMatchingFormat(load);
    const { results, rejections: rej } = runMatching(matchLoad);
    setCarriers(results.map(matchResultToCarrier));
    setRejections(rej);
    setMatchingDone(true);
  }, [load]);

  // Persist notified carrier state back to ch_loads
  function persistNotifications(updatedCarriers: MatchedCarrier[]) {
    try {
      const loads = JSON.parse(sessionStorage.getItem("ch_loads") || "[]");
      const notified = updatedCarriers
        .filter((c) => c.notified)
        .map((c) => ({
          id: c.carrierId,
          carrierName: c.carrierName,
          truckNum: c.truckNum,
          contactName: c.contactName,
          city: c.city,
          state: c.state,
          distanceMi: c.distanceMi,
          rating: c.rating,
          matchScore: c.matchScore,
          likelihood: c.likelihood,
          likelihoodNote: c.likelihoodNote,
          notifiedAt: c.notifiedAt,
          quoteStatus: "pending" as const,
        }));
      const updated = loads.map((l: { id: string }) =>
        l.id === load?.id
          ? { ...l, notifiedCarriers: notified, status: notified.length > 0 ? "carriers_notified" : "active" }
          : l
      );
      sessionStorage.setItem("ch_loads", JSON.stringify(updated));
    } catch { /* ignore */ }
  }

  function handleNotify(carrierId: string) {
    const now = new Date().toISOString();
    setCarriers((prev) => {
      const updated = prev.map((c) =>
        c.id === carrierId ? { ...c, notified: true, notifiedAt: now } : c
      );
      persistNotifications(updated);
      return updated;
    });
  }

  async function handleNotifyAll() {
    setNotifyAllLoading(true);
    await new Promise((r) => setTimeout(r, 400));
    const now = new Date().toISOString();
    setCarriers((prev) => {
      const updated = prev.map((c) =>
        c.distanceMi <= distanceFilter && !c.notified
          ? { ...c, notified: true, notifiedAt: now }
          : c
      );
      persistNotifications(updated);
      return updated;
    });
    setNotifyAllLoading(false);
  }

  const filtered = carriers
    .filter((c) => c.distanceMi <= distanceFilter)
    .sort((a, b) => {
      if (sortBy === "score") return b.matchScore - a.matchScore;
      if (sortBy === "distance") return a.distanceMi - b.distanceMi;
      return b.rating - a.rating;
    });

  const unnotifiedCount = filtered.filter((c) => !c.notified).length;

  if (loading || !user || !load) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f9fafb]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#3b82f6] border-t-transparent" />
      </div>
    );
  }

  const eqLabel = equipLabel(load.equipmentType);

  return (
    <AppShell
      role="3pl"
      companyName={user.companyName}
      companyCity={user.companyCity}
      companyState={user.companyState}
      initials={user.initials}
    >
      {/* Back nav */}
      <Link href="/dashboard/3pl/loads/new"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-[#6b7280] hover:text-[#374151] transition-colors"
      >
        <ArrowLeft size={15} /> Back to load details
      </Link>

      {/* Load summary bar */}
      <div className="mb-6 rounded-xl border border-[#e5e7eb] bg-white px-5 py-4">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <div className="flex items-center gap-2 text-base font-semibold text-[#111827]">
            <MapPin size={15} className="text-[#3b82f6]" />
            {load.origin}
            <ArrowRight size={14} className="text-[#9ca3af]" />
            {load.destination}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[13px] text-[#6b7280]">
            {load.pickupDate && (
              <span className="flex items-center gap-1">
                <Calendar size={12} />
                {new Date(load.pickupDate + "T12:00:00").toLocaleDateString("en-US", {
                  month: "short", day: "numeric", year: "numeric",
                })}
              </span>
            )}
            {load.commodity && (
              <span className="flex items-center gap-1">
                <Package size={12} /> {load.commodity}
              </span>
            )}
            {load.temperature && (
              <span className="flex items-center gap-1">
                <Thermometer size={12} /> {load.temperature}°F
              </span>
            )}
            <span className="flex items-center gap-1">
              <Truck size={12} /> {eqLabel}
            </span>
          </div>
          <Link href="/dashboard/3pl/loads/new"
            className="ml-auto text-[13px] font-medium text-[#3b82f6] hover:text-[#2563eb] transition-colors"
          >
            Edit load
          </Link>
        </div>
      </div>

      <div className="flex gap-6 items-start">
        {/* ── Filter sidebar ── */}
        <div className="w-48 shrink-0">
          <div className="rounded-xl border border-[#e5e7eb] bg-white p-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#6b7280]">
              Filters
            </p>

            <p className="mb-2 text-xs font-medium text-[#374151]">Max deadhead distance</p>
            {([50, 100, 200, 500] as const).map((d) => (
              <label key={d}
                className="flex cursor-pointer items-center gap-2 py-1 text-sm text-[#4b5563]"
              >
                <input type="radio" name="distance" checked={distanceFilter === d}
                  onChange={() => setDistanceFilter(d)} className="accent-[#3b82f6]"
                />
                {d} mi
              </label>
            ))}

            {unnotifiedCount > 0 && (
              <button onClick={handleNotifyAll} disabled={notifyAllLoading}
                className="mt-4 w-full rounded-lg bg-[#111827] px-3 py-2.5 text-xs font-semibold text-white hover:bg-[#374151] disabled:opacity-60 transition-colors"
              >
                {notifyAllLoading ? "Sending…" : `Notify all (${unnotifiedCount})`}
              </button>
            )}

            {unnotifiedCount === 0 && filtered.length > 0 && (
              <div className="mt-4 flex items-center gap-1.5 rounded-lg bg-[#f0fdf4] px-3 py-2 text-xs font-medium text-[#16a34a]">
                <CheckCircle2 size={13} /> All notified
              </div>
            )}
          </div>
        </div>

        {/* ── Results ── */}
        <div className="flex-1 min-w-0">
          {/* List header */}
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-[#374151]">
              <span className="font-semibold text-[#111827]">{filtered.length}</span> matched carrier{filtered.length !== 1 ? "s" : ""}
              {distanceFilter < 500 ? ` within ${distanceFilter} mi` : ""}
            </p>
            <div className="relative flex items-center gap-1.5">
              <span className="text-xs text-[#9ca3af]">Sort:</span>
              <select value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="appearance-none rounded-lg border border-[#e5e7eb] bg-white py-1.5 pl-3 pr-7 text-xs font-medium text-[#374151] outline-none focus:border-[#3b82f6] cursor-pointer"
              >
                <option value="score">Match score</option>
                <option value="distance">Distance</option>
                <option value="rating">Rating</option>
              </select>
              <ChevronDown size={12}
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#9ca3af]"
              />
            </div>
          </div>

          {/* Rejections */}
          {matchingDone && <RejectionCard rejections={rejections} />}

          {/* Cards */}
          <div className="mt-3 flex flex-col gap-3">
            {filtered.map((carrier) => (
              <CarrierCard
                key={carrier.id}
                carrier={carrier}
                onNotify={handleNotify}
                isSelected={selectedId === carrier.id}
                onSelect={setSelectedId}
              />
            ))}
          </div>

          {filtered.length === 0 && matchingDone && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f3f4f6]">
                <Truck size={24} className="text-[#9ca3af]" />
              </div>
              <p className="text-sm font-medium text-[#374151]">
                No carriers matched within {distanceFilter} miles
              </p>
              <p className="mt-1 text-xs text-[#9ca3af]">
                Try expanding the distance filter or adjusting load requirements
              </p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
