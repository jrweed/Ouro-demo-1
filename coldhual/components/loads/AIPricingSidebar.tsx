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

// Demo mock data returned when origin + destination are filled.
// TODO: Replace with live call to FastAPI /api/pricing/estimate
// (debounced 500ms after user finishes typing both fields).
export const MOCK_PRICING_DATA: AIPricingData = {
  rateMin: 1850,
  rateMax: 2050,
  confidence: "high",
  avgRate: 1940,
  perMile: 6.58,
  transactionCount: 47,
  trendPct: 2.3,
  trendUp: true,
  seasonalityNote:
    "Strawberry season peak starts mid-March. Expect rates to increase 5–8% through April.",
  recentTransactions: [
    { rate: 1900, date: "Mar 10, 2026", lane: "Charleston → Atlanta" },
    { rate: 2010, date: "Mar 8, 2026", lane: "Charleston → Atlanta" },
    { rate: 1875, date: "Mar 5, 2026", lane: "Savannah → Atlanta" },
    { rate: 1940, date: "Mar 2, 2026", lane: "Charleston → Macon" },
  ],
  origin: "Charleston, SC",
  destination: "Atlanta, GA",
  distanceMiles: 295,
};

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
          Based on {data.transactionCount} reefer transactions · Last 90 days
        </p>
      </div>
    </div>
  );
}
