"use client";

import { Sparkles, TrendingUp, AlertCircle } from "lucide-react";
import { ConfidenceBadge } from "@/components/shared/ConfidenceBadge";

export interface RecentTransaction {
  rate: number;
  date: string;
  lane: string;
}

export interface AIPricingData {
  rateMin: number;
  rateMax: number;
  confidence: "high" | "medium" | "low";
  avgRate: number;
  perMile: number;
  transactionCount: number;
  trendPct: number;
  trendUp: boolean;
  seasonalityNote?: string;
  recentTransactions: RecentTransaction[];
  origin: string;
  destination: string;
  distanceMiles: number;
}

interface AIPricingSidebarProps {
  data: AIPricingData | null;
  loading?: boolean;
}

// Per-mile rate ranges by equipment category
const RATE_CURVES: Record<string, { min: number; max: number; seasonNote?: string }> = {
  reefer_single: { min: 2.80, max: 3.60, seasonNote: "Produce season peak starts mid-March. Expect reefer rates to increase 5–8% through April." },
  reefer_multi:  { min: 3.00, max: 3.80, seasonNote: "Produce season peak starts mid-March. Expect reefer rates to increase 5–8% through April." },
  dry_van:       { min: 2.00, max: 2.80 },
  flatbed:       { min: 2.50, max: 3.50, seasonNote: "Construction season ramp-up in spring typically increases flatbed demand 10–15%." },
  step_deck:     { min: 2.60, max: 3.60 },
  tanker:        { min: 3.00, max: 4.00 },
  lowboy:        { min: 3.50, max: 5.00 },
  hotshot:       { min: 2.20, max: 3.00 },
  box_truck:     { min: 1.80, max: 2.50 },
};

// Demo mock data returned when origin + destination are filled.
// TODO: Replace with live call to FastAPI /api/pricing/estimate
export function generateMockPricing(
  origin: string,
  destination: string,
  distanceMiles: number,
  equipmentType?: string,
): AIPricingData {
  const curve = RATE_CURVES[equipmentType || "dry_van"] || RATE_CURVES.dry_van;
  const perMileAvg = (curve.min + curve.max) / 2;
  const rateMin = Math.round(curve.min * distanceMiles);
  const rateMax = Math.round(curve.max * distanceMiles);
  const avgRate = Math.round(perMileAvg * distanceMiles);

  return {
    rateMin,
    rateMax,
    confidence: distanceMiles > 100 ? "high" : "medium",
    avgRate,
    perMile: parseFloat(perMileAvg.toFixed(2)),
    transactionCount: 32 + Math.floor(Math.random() * 30),
    trendPct: 2.3,
    trendUp: true,
    seasonalityNote: curve.seasonNote,
    recentTransactions: [
      { rate: Math.round((perMileAvg + 0.1) * distanceMiles), date: "Apr 20, 2026", lane: `${origin.split(",")[0]} → ${destination.split(",")[0]}` },
      { rate: Math.round((perMileAvg - 0.05) * distanceMiles), date: "Apr 18, 2026", lane: `${origin.split(",")[0]} → ${destination.split(",")[0]}` },
      { rate: Math.round((perMileAvg + 0.15) * distanceMiles), date: "Apr 15, 2026", lane: `${origin.split(",")[0]} → ${destination.split(",")[0]}` },
      { rate: Math.round(perMileAvg * distanceMiles), date: "Apr 12, 2026", lane: `${origin.split(",")[0]} → ${destination.split(",")[0]}` },
    ],
    origin,
    destination,
    distanceMiles,
  };
}

// Legacy static mock for backward compat
export const MOCK_PRICING_DATA: AIPricingData = generateMockPricing("Charleston, SC", "Atlanta, GA", 295, "reefer_single");

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded bg-[#f3f4f6] ${className ?? ""}`} />
  );
}

function PricingTxnRow({ rate, date, lane }: RecentTransaction) {
  return (
    <div className="flex items-center justify-between border-b border-[#f3f4f6] py-2 last:border-none">
      <div>
        <p className="text-[13px] font-medium text-[#374151]">{lane}</p>
        <p className="text-[11px] text-[#9ca3af]">{date}</p>
      </div>
      <span className="text-sm font-semibold text-[#1f2937]">
        ${rate.toLocaleString()}
      </span>
    </div>
  );
}

export function AIPricingSidebar({ data, loading }: AIPricingSidebarProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-[#e5e7eb] bg-white overflow-hidden">
        <div className="border-b border-[#e5e7eb] bg-[#eff6ff] p-5">
          <Skeleton className="mb-2 h-4 w-40" />
          <Skeleton className="h-3 w-32" />
        </div>
        <div className="p-5 space-y-4">
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-5 w-28" />
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
          <Skeleton className="h-14" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-4/6" />
          <Skeleton className="h-3 w-full" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-[#e5e7eb] bg-white overflow-hidden">
        <div className="border-b border-[#e5e7eb] bg-gradient-to-br from-[#eff6ff] to-[#e0ecff] p-5">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={15} className="text-[#2563eb]" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#1d4ed8]">
              Market Rate Intelligence
            </span>
          </div>
          <p className="text-xs text-[#6b7280]">
            Enter origin &amp; destination to get a market rate estimate
          </p>
        </div>
        <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#eff6ff]">
            <Sparkles size={22} className="text-[#3b82f6]" />
          </div>
          <p className="text-sm font-medium text-[#374151]">
            Waiting for lane details
          </p>
          <p className="mt-1 text-xs text-[#9ca3af]">
            Rates update automatically as you fill in Route and Freight Details
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#e5e7eb] bg-white overflow-hidden">
      {/* Header */}
      <div className="border-b border-[#e5e7eb] bg-gradient-to-br from-[#eff6ff] to-[#e0ecff] px-5 py-4">
        <div className="flex items-center gap-2 mb-1.5">
          <Sparkles size={15} className="text-[#2563eb]" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#1d4ed8]">
            Market Rate Intelligence
          </span>
        </div>
        <p className="text-xs text-[#6b7280]">
          {data.origin} → {data.destination} · {data.distanceMiles} mi
        </p>
      </div>

      {/* Recommended rate */}
      <div className="px-5 pt-5 pb-4">
        <p className="mb-1.5 text-xs font-medium text-[#6b7280]">
          Recommended Rate
        </p>
        <div className="flex items-baseline gap-1.5">
          <span className="text-[32px] font-bold tracking-tight text-[#111827]">
            ${data.rateMin.toLocaleString()}
          </span>
          <span className="text-lg font-medium text-[#9ca3af]">–</span>
          <span className="text-[32px] font-bold tracking-tight text-[#111827]">
            ${data.rateMax.toLocaleString()}
          </span>
        </div>
        <div className="mt-2.5">
          <ConfidenceBadge level={data.confidence} />
        </div>
      </div>

      {/* Lane stats grid */}
      <div className="px-5 pb-4">
        <div className="rounded-[10px] bg-[#f9fafb] p-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-[#9ca3af]">
                Avg Rate
              </p>
              <p className="mt-0.5 text-lg font-bold text-[#1f2937]">
                ${data.avgRate.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-[#9ca3af]">
                Per Mile
              </p>
              <p className="mt-0.5 text-lg font-bold text-[#1f2937]">
                ${data.perMile.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-[#9ca3af]">
                Transactions
              </p>
              <p className="mt-0.5 text-lg font-bold text-[#1f2937]">
                {data.transactionCount}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-[#9ca3af]">
                Trend
              </p>
              <div
                className={`mt-1 flex items-center gap-1 text-sm font-semibold ${
                  data.trendUp ? "text-[#16a34a]" : "text-[#ef4444]"
                }`}
              >
                <TrendingUp size={13} />
                {data.trendUp ? "+" : "-"}
                {data.trendPct}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 90-day sparkline */}
      <div className="px-5 pb-4">
        <p className="mb-2 text-xs font-medium text-[#6b7280]">
          90-Day Price Trend
        </p>
        <svg viewBox="0 0 280 60" className="w-full" style={{ height: 60 }}>
          <defs>
            <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0,40 Q20,45 40,38 T80,35 T120,30 T160,28 T200,22 T240,18 T280,15"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
          />
          <path
            d="M0,40 Q20,45 40,38 T80,35 T120,30 T160,28 T200,22 T240,18 T280,15 V60 H0 Z"
            fill="url(#trendGrad)"
          />
        </svg>
        <div className="mt-1 flex justify-between text-[10px] text-[#9ca3af]">
          <span>Dec</span>
          <span>Jan</span>
          <span>Feb</span>
          <span>Mar</span>
        </div>
      </div>

      {/* Seasonality note */}
      {data.seasonalityNote && (
        <div className="px-5 pb-4">
          <div className="flex gap-2.5 rounded-lg border border-[#f59e0b]/20 bg-[#fffbeb] p-3">
            <AlertCircle
              size={15}
              className="mt-0.5 shrink-0 text-[#d97706]"
            />
            <p className="text-[12px] leading-relaxed text-[#4b5563]">
              {data.seasonalityNote}
            </p>
          </div>
        </div>
      )}

      {/* Recent comparable loads */}
      <div className="px-5 pb-4">
        <p className="mb-2 text-xs font-medium text-[#6b7280]">
          Recent Comparable Loads
        </p>
        {data.recentTransactions.map((txn, i) => (
          <PricingTxnRow key={i} {...txn} />
        ))}
      </div>

      {/* Data source footer */}
      <div className="border-t border-[#f3f4f6] bg-[#f9fafb] px-5 py-3 text-center">
        <p className="text-[11px] text-[#9ca3af]">
          Based on {data.transactionCount} transactions · Last 90 days
        </p>
      </div>
    </div>
  );
}
