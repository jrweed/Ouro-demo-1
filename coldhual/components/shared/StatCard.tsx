import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  sub?: string;
  accentClass?: string; // e.g. "bg-ch-primary-50"
}

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  trendUp,
  sub,
  accentClass = "bg-[#eff6ff]",
}: StatCardProps) {
  return (
    <div className="flex-1 min-w-[160px] rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-[10px] ${accentClass}`}
        >
          <Icon size={20} className="text-[#2563eb]" />
        </div>
        {trend && (
          <span
            className={`flex items-center gap-1 text-xs font-medium ${
              trendUp ? "text-[#16a34a]" : "text-[#ef4444]"
            }`}
          >
            {trendUp ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {trend}
          </span>
        )}
      </div>
      <div className="mt-4 text-[30px] font-bold tracking-tight text-[#111827]">
        {value}
      </div>
      <div className="mt-0.5 text-sm text-[#6b7280]">{label}</div>
      {sub && <div className="mt-1 text-xs text-[#9ca3af]">{sub}</div>}
    </div>
  );
}
