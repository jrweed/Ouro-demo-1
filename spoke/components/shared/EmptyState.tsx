import { LucideIcon } from "lucide-react";
import Link from "next/link";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#eff6ff]">
        <Icon size={28} className="text-[#3b82f6]" />
      </div>
      <h3 className="mb-1 text-lg font-semibold text-[#111827]">{title}</h3>
      <p className="max-w-sm text-sm text-[#6b7280]">{description}</p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-[#3b82f6] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#2563eb] transition-colors"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
