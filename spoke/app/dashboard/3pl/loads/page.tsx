"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  MapPin,
  ArrowRight,
  Calendar,
  Package,
  Truck,
  Bell,
  ChevronRight,
  FileText,
  Trash2,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";

// ─── Types ────────────────────────────────────────────────────────────────────

type LoadStatus = "active" | "carriers_notified" | "booked";

interface StoredLoad {
  id: string;
  origin: string;
  destination: string;
  pickupDate: string;
  commodity: string;
  temperature: string;
  equipmentType: string;
  weightLbs?: string;
  distanceMiles?: number;
  durationMinutes?: number;
  pricingRateMin?: number;
  pricingRateMax?: number;
  createdAt: string;
  status: LoadStatus;
  notifiedCarriers?: { id: string; carrierName: string; quoteStatus: string }[];
}

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<LoadStatus, { label: string; bg: string; color: string; dot: string }> = {
  active: { label: "Active", bg: "#eff6ff", color: "#2563eb", dot: "#3b82f6" },
  carriers_notified: { label: "Carriers Notified", bg: "#fffbeb", color: "#d97706", dot: "#f59e0b" },
  booked: { label: "Booked", bg: "#f0fdf4", color: "#16a34a", dot: "#22c55e" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(isoString: string) {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

import { equipmentLabel as equipLabel } from "@/lib/utils/constants";
import { getLoads, deleteLoad, deleteConversationsByLoad } from "@/lib/supabase/db";
import { deleteConversationsByLoadId } from "@/lib/conversations";

// ─── Load row card ─────────────────────────────────────────────────────────────

function LoadCard({ load, onDelete }: { load: StoredLoad; onDelete: (id: string) => void }) {
  const sc = STATUS_CONFIG[load.status] ?? STATUS_CONFIG.active;
  const notifiedCount = load.notifiedCarriers?.length ?? 0;

  return (
    <Link
      href={`/dashboard/3pl/loads/${load.id}`}
      className="block rounded-xl border border-[#e5e7eb] bg-white px-5 py-4 hover:border-[#3b82f6]/40 hover:shadow-sm transition-all"
    >
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#eff6ff]">
          <Package size={18} className="text-[#3b82f6]" />
        </div>

        {/* Lane + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-sm font-semibold text-[#111827] truncate">
              {load.origin}
            </span>
            <ArrowRight size={13} className="shrink-0 text-[#9ca3af]" />
            <span className="text-sm font-semibold text-[#111827] truncate">
              {load.destination}
            </span>
            {/* Status badge */}
            <span
              className="ml-1 flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
              style={{ backgroundColor: sc.bg, color: sc.color }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: sc.dot }} />
              {sc.label}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[12px] text-[#6b7280]">
            {load.pickupDate && (
              <span className="flex items-center gap-1">
                <Calendar size={11} />
                {formatDate(load.pickupDate)}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Package size={11} />
              {load.commodity}
            </span>
            <span className="flex items-center gap-1">
              <Truck size={11} />
              {equipLabel(load.equipmentType)}
            </span>
            {load.distanceMiles && (
              <span className="flex items-center gap-1">
                <MapPin size={11} />
                {load.distanceMiles} mi
              </span>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="shrink-0 text-right">
          {notifiedCount > 0 ? (
            <div className="flex items-center justify-end gap-1.5 text-[13px] font-medium text-[#d97706]">
              <Bell size={13} />
              {notifiedCount} carrier{notifiedCount !== 1 ? "s" : ""} notified
            </div>
          ) : (
            <p className="text-[13px] text-[#9ca3af]">No carriers notified</p>
          )}
          {load.pricingRateMin && load.pricingRateMax && (
            <p className="mt-0.5 text-[12px] text-[#6b7280]">
              Market: ${load.pricingRateMin.toLocaleString()}–${load.pricingRateMax.toLocaleString()}
            </p>
          )}
          <p className="mt-0.5 text-[11px] text-[#9ca3af]">{timeAgo(load.createdAt)}</p>
        </div>

        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (confirm(`Delete load ${load.origin} → ${load.destination}?`)) {
              onDelete(load.id);
            }
          }}
          className="shrink-0 rounded-lg p-1.5 text-[#d1d5db] hover:bg-[#fef2f2] hover:text-[#ef4444] transition-colors"
          title="Delete load"
        >
          <Trash2 size={15} />
        </button>

        <ChevronRight size={16} className="shrink-0 text-[#d1d5db]" />
      </div>
    </Link>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function MyLoadsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [loads, setLoads] = useState<StoredLoad[]>([]);
  const [filter, setFilter] = useState<"all" | LoadStatus>("all");

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (!loading && user && user.role !== "3pl") router.push("/dashboard/carrier");
  }, [user, loading, router]);

  useEffect(() => {
    getLoads().then((data) => setLoads(data as unknown as StoredLoad[])).catch(() => setLoads([]));
  }, []);

  async function handleDelete(id: string) {
    await deleteLoad(id);
    deleteConversationsByLoadId(id);
    deleteConversationsByLoad(id).catch(console.error);
    setLoads((prev) => prev.filter((l) => l.id !== id));
  }

  const filtered =
    filter === "all" ? loads : loads.filter((l) => l.status === filter);

  const counts = {
    all: loads.length,
    active: loads.filter((l) => l.status === "active").length,
    carriers_notified: loads.filter((l) => l.status === "carriers_notified").length,
    booked: loads.filter((l) => l.status === "booked").length,
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f9fafb]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#3b82f6] border-t-transparent" />
      </div>
    );
  }

  return (
    <AppShell
      role="3pl"
      companyName={user.companyName}
      companyCity={user.companyCity}
      companyState={user.companyState}
      initials={user.initials}
    >
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[#111827]">My Loads</h1>
          <p className="mt-1 text-sm text-[#6b7280]">
            Track submitted loads and carrier quote activity
          </p>
        </div>
        <Link
          href="/dashboard/3pl/loads/new"
          className="flex items-center gap-1.5 rounded-lg bg-[#3b82f6] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#2563eb] transition-colors"
        >
          <Plus size={17} /> Input Load
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="mb-5 flex gap-1 rounded-xl border border-[#e5e7eb] bg-[#f9fafb] p-1 w-fit">
        {(
          [
            { key: "all", label: "All" },
            { key: "active", label: "Active" },
            { key: "carriers_notified", label: "Carriers Notified" },
            { key: "booked", label: "Booked" },
          ] as { key: "all" | LoadStatus; label: string }[]
        ).map(({ key, label }) => {
          const count = counts[key];
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
                <span className={`text-[11px] font-semibold ${filter === key ? "text-[#6b7280]" : "text-[#9ca3af]"}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Load list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f3f4f6]">
            <FileText size={24} className="text-[#9ca3af]" />
          </div>
          <p className="text-sm font-medium text-[#374151]">
            {filter === "all" ? "No loads yet" : `No ${filter.replace("_", " ")} loads`}
          </p>
          <p className="mt-1 text-xs text-[#9ca3af]">
            {filter === "all"
              ? "Submit a load to get market rate estimates and find nearby carriers."
              : "Switch to a different filter to see other loads."}
          </p>
          {filter === "all" && (
            <Link
              href="/dashboard/3pl/loads/new"
              className="mt-4 flex items-center gap-1.5 rounded-lg bg-[#3b82f6] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2563eb] transition-colors"
            >
              <Plus size={15} /> Input your first load
            </Link>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtered.map((load) => (
            <LoadCard key={load.id} load={load} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </AppShell>
  );
}
