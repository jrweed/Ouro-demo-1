type ConfidenceLevel = "high" | "medium" | "low";

interface ConfidenceBadgeProps {
  level: ConfidenceLevel;
}

const CONFIG: Record<
  ConfidenceLevel,
  { label: string; bg: string; color: string; dot: string }
> = {
  high: { label: "High Confidence", bg: "#f0fdf4", color: "#16a34a", dot: "#22c55e" },
  medium: { label: "Medium Confidence", bg: "#fffbeb", color: "#d97706", dot: "#f59e0b" },
  low: { label: "Low Confidence", bg: "#fef2f2", color: "#dc2626", dot: "#ef4444" },
};

export function ConfidenceBadge({ level }: ConfidenceBadgeProps) {
  const c = CONFIG[level];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: c.bg, color: c.color }}
    >
      <span
        className="rounded-full"
        style={{ width: 6, height: 6, backgroundColor: c.dot, flexShrink: 0 }}
      />
      {c.label}
    </span>
  );
}
