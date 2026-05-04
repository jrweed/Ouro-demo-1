"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Plus,
  FileText,
  Inbox,
  BookOpen,
  DollarSign,
  Settings,
  Truck,
  Users,
  MessageSquare,
  BarChart3,
  Receipt,
} from "lucide-react";
import { UserRole } from "@/lib/utils/constants";

// ─── Nav definitions (no static badges — computed dynamically) ─────────────────

const NAV_3PL = [
  { icon: LayoutDashboard, label: "Dashboard",       href: "/dashboard/3pl" },
  { icon: Plus,            label: "Input Load",       href: "/dashboard/3pl/loads/new" },
  { icon: FileText,        label: "My Loads",         href: "/dashboard/3pl/loads" },
  { icon: MessageSquare,   label: "Messages",          href: "/dashboard/3pl/quotes",    badgeKey: "quotes" as const },
  { icon: BookOpen,        label: "Active Bookings",  href: "/dashboard/3pl/bookings" },
  { icon: Receipt,         label: "Invoices",         href: "/dashboard/3pl/invoices" },
  { icon: BarChart3,       label: "Analytics",        href: "/dashboard/3pl/analytics" },
  { icon: DollarSign,      label: "Pricing Tool",     href: "/dashboard/3pl/pricing" },
  { icon: Settings,        label: "Settings",         href: "/dashboard/settings" },
];

const NAV_CARRIER = [
  { icon: LayoutDashboard, label: "Dashboard",       href: "/dashboard/carrier" },
  { icon: Truck,           label: "My Trucks",        href: "/dashboard/carrier/trucks" },
  { icon: Users,           label: "Drivers",          href: "/dashboard/carrier/drivers" },
  { icon: FileText,        label: "Quote Requests",   href: "/dashboard/carrier/quote-requests", badgeKey: "quotes" as const },
  { icon: MessageSquare,   label: "Messages",         href: "/dashboard/carrier/inbox" },
  { icon: BookOpen,        label: "Active Bookings",  href: "/dashboard/carrier/loads" },
  { icon: Receipt,         label: "Invoices",         href: "/dashboard/carrier/invoices" },
  { icon: BarChart3,       label: "Analytics",        href: "/dashboard/carrier/analytics" },
  { icon: Settings,        label: "Settings",         href: "/dashboard/settings" },
];

interface SidebarProps {
  role: UserRole;
}

// ─── Fleet health bar ──────────────────────────────────────────────────────────

interface FleetHealth {
  available: number;
  active: number;    // loaded + in_transit
  maintenance: number;
  inactive: number;
  total: number;
}

function FleetHealthWidget({ health }: { health: FleetHealth }) {
  if (health.total === 0) return null;

  // Build proportional colored segments
  const segments: { color: string; count: number; label: string }[] = [];
  if (health.available > 0)   segments.push({ color: "#22c55e", count: health.available,   label: `${health.available} avail` });
  if (health.active > 0)      segments.push({ color: "#3b82f6", count: health.active,      label: `${health.active} active` });
  if (health.maintenance > 0) segments.push({ color: "#ef4444", count: health.maintenance, label: `${health.maintenance} maint` });
  if (health.inactive > 0)    segments.push({ color: "#9ca3af", count: health.inactive,    label: `${health.inactive} inactive` });

  return (
    <div className="mt-7 rounded-xl bg-[#f9fafb] p-4">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#4b5563]">
        Fleet Health
      </p>
      <div className="mb-2 flex gap-1">
        {segments.map((seg, i) =>
          Array.from({ length: seg.count }).map((_, j) => (
            <div
              key={`${i}-${j}`}
              className="h-1.5 flex-1 rounded-full"
              style={{ backgroundColor: seg.color }}
            />
          ))
        )}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-[#9ca3af]">
        {segments.map((seg) => (
          <span key={seg.label}>{seg.label}</span>
        ))}
      </div>
    </div>
  );
}

// ─── Sidebar ───────────────────────────────────────────────────────────────────

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const navItems = role === "carrier" ? NAV_CARRIER : NAV_3PL;

  const [pendingQuotes, setPendingQuotes] = useState(0);
  const [fleetHealth, setFleetHealth] = useState<FleetHealth>({
    available: 0, active: 0, maintenance: 0, inactive: 0, total: 0,
  });

  useEffect(() => {
    function loadData() {
      // ── Pending quote badge ────────────────────────────────────────────────
      try {
        type Offer = { from: "3pl" | "carrier"; status: string } | null;
        const convs: { offer: Offer }[] = JSON.parse(
          sessionStorage.getItem("ch_conversations") || "[]"
        );
        const count = convs.filter((c) => {
          if (!c.offer || c.offer.status !== "pending") return false;
          return role === "3pl" ? c.offer.from === "carrier" : c.offer.from === "3pl";
        }).length;
        setPendingQuotes(count);
      } catch { /* ignore */ }

      // ── Fleet health (carrier only) ──────────────────────────────────────
      if (role === "carrier") {
        try {
          type Truck = { status: string };
          const trucks: Truck[] = JSON.parse(
            sessionStorage.getItem("ch_trucks") || "[]"
          );
          setFleetHealth({
            available:   trucks.filter((t) => t.status === "available").length,
            active:      trucks.filter((t) => t.status === "loaded" || t.status === "in_transit").length,
            maintenance: trucks.filter((t) => t.status === "maintenance").length,
            inactive:    trucks.filter((t) => t.status === "inactive").length,
            total:       trucks.length,
          });
        } catch { /* ignore */ }
      }
    }

    loadData();
    window.addEventListener("ch_fleet_updated", loadData);
    return () => window.removeEventListener("ch_fleet_updated", loadData);
  }, [role]);

  return (
    <aside className="w-60 shrink-0 sticky top-16 h-[calc(100vh-64px)] overflow-y-auto border-r border-[#e5e7eb] bg-white px-3 py-6">
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
          // An item is active if:
          // 1. Exact match, OR
          // 2. The pathname is a child path — but only if no other nav item
          //    exactly matches the current pathname (prevents e.g. "My Loads"
          //    lighting up when you're on the "Input Load" page).
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard/3pl" &&
              item.href !== "/dashboard/carrier" &&
              pathname.startsWith(item.href + "/") &&
              !navItems.some((other) => other.href !== item.href && pathname === other.href));

          const badge = "badgeKey" in item && item.badgeKey === "quotes" && pendingQuotes > 0
            ? pendingQuotes
            : null;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                isActive
                  ? "border-l-[3px] border-[#3b82f6] bg-[#eff6ff] pl-[9px] font-medium text-[#2563eb]"
                  : "border-l-[3px] border-transparent font-normal text-[#4b5563] hover:bg-[#f9fafb]"
              }`}
            >
              <item.icon size={18} className="shrink-0" />
              <span className="flex-1">{item.label}</span>
              {badge !== null && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ef4444] px-1.5 text-[11px] font-semibold text-white">
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {role === "carrier" && <FleetHealthWidget health={fleetHealth} />}
    </aside>
  );
}
