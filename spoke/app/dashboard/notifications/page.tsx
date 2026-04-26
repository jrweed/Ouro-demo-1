"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCircle2,
  XCircle,
  Inbox,
  Package,
  DollarSign,
  Check,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  NOTIFICATION_EVENT,
  type AppNotification,
  type NotificationType,
} from "@/lib/notifications";

// ─── Icon / colour mapping ─────────────────────────────────────────────────────

type IconComponent = typeof Bell;

const TYPE_CONFIG: Record<
  NotificationType,
  { icon: IconComponent; iconBg: string; iconColor: string; label: string }
> = {
  offer_sent:       { icon: DollarSign,   iconBg: "#f0fdf4", iconColor: "#16a34a", label: "Offer" },
  offer_received:   { icon: DollarSign,   iconBg: "#eff6ff", iconColor: "#3b82f6", label: "Offer" },
  carrier_notified: { icon: Bell,         iconBg: "#fffbeb", iconColor: "#d97706", label: "Notification" },
  quote_received:   { icon: Inbox,        iconBg: "#eff6ff", iconColor: "#3b82f6", label: "Quote" },
  offer_accepted:   { icon: CheckCircle2, iconBg: "#f0fdf4", iconColor: "#16a34a", label: "Offer" },
  offer_declined:   { icon: XCircle,      iconBg: "#fef2f2", iconColor: "#dc2626", label: "Offer" },
  system:           { icon: Package,      iconBg: "#f9fafb", iconColor: "#6b7280", label: "System" },
};

// ─── Filter tabs ──────────────────────────────────────────────────────────────

type FilterKey = "all" | "offers" | "quotes" | "system";

const FILTER_TABS: { key: FilterKey; label: string }[] = [
  { key: "all",    label: "All" },
  { key: "offers", label: "Offers" },
  { key: "quotes", label: "Quotes" },
  { key: "system", label: "System" },
];

function matchesFilter(n: AppNotification, filter: FilterKey): boolean {
  if (filter === "all") return true;
  if (filter === "offers") return n.type === "offer_sent" || n.type === "offer_received" || n.type === "offer_accepted" || n.type === "offer_declined";
  if (filter === "quotes") return n.type === "quote_received" || n.type === "carrier_notified";
  if (filter === "system") return n.type === "system";
  return true;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(isoString: string) {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function isToday(isoString: string): boolean {
  const d = new Date(isoString);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
}

// ─── Notification row ─────────────────────────────────────────────────────────

function NotificationRow({
  notif,
  onRead,
}: {
  notif: AppNotification;
  onRead: (id: string) => void;
}) {
  const cfg = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.system;
  const Icon = cfg.icon;

  function handleClick() {
    onRead(notif.id);
    if (notif.href) window.location.href = notif.href;
  }

  return (
    <div
      onClick={handleClick}
      className={`flex cursor-pointer items-start gap-4 rounded-xl border px-5 py-4 transition-all hover:shadow-sm ${
        !notif.read
          ? "border-[#bfdbfe] bg-[#eff6ff]"
          : "border-[#e5e7eb] bg-white"
      }`}
    >
      {/* Icon */}
      <div
        className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]"
        style={{ backgroundColor: cfg.iconBg }}
      >
        <Icon size={18} style={{ color: cfg.iconColor }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-semibold text-[#111827] leading-tight">
            {notif.title}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            {!notif.read && (
              <span className="h-2 w-2 rounded-full bg-[#3b82f6]" />
            )}
            <span className="text-[11px] text-[#9ca3af]">{timeAgo(notif.createdAt)}</span>
          </div>
        </div>
        <p className="mt-1 text-sm text-[#6b7280]">{notif.body}</p>
        {notif.href && (
          <p className="mt-1 text-[12px] font-medium text-[#3b82f6]">
            View details →
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [filter, setFilter] = useState<FilterKey>("all");

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  function refresh() {
    setNotifications(getNotifications());
  }

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    window.addEventListener(NOTIFICATION_EVENT, refresh);
    return () => window.removeEventListener(NOTIFICATION_EVENT, refresh);
  }, []);

  function handleMarkRead(id: string) {
    markNotificationRead(id);
    refresh();
  }

  function handleMarkAllRead() {
    markAllNotificationsRead();
    refresh();
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f9fafb]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#3b82f6] border-t-transparent" />
      </div>
    );
  }

  const dashHref = user.role === "3pl" ? "/dashboard/3pl" : "/dashboard/carrier";

  const filtered = notifications.filter((n) => matchesFilter(n, filter));
  const todayNotifs = filtered.filter((n) => isToday(n.createdAt));
  const olderNotifs = filtered.filter((n) => !isToday(n.createdAt));
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Tab counts
  const counts: Record<FilterKey, number> = {
    all:    notifications.length,
    offers: notifications.filter((n) => matchesFilter(n, "offers")).length,
    quotes: notifications.filter((n) => matchesFilter(n, "quotes")).length,
    system: notifications.filter((n) => matchesFilter(n, "system")).length,
  };

  return (
    <AppShell
      role={user.role}
      companyName={user.companyName}
      companyCity={user.companyCity}
      companyState={user.companyState}
      initials={user.initials}
    >
      {/* Back nav */}
      <Link
        href={dashHref}
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-[#6b7280] hover:text-[#374151] transition-colors"
      >
        <ArrowLeft size={15} /> Back to Dashboard
      </Link>

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[#111827]">
            Notifications
          </h1>
          <p className="mt-1 text-sm text-[#6b7280]">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
              : "All caught up"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 rounded-lg border border-[#e5e7eb] bg-white px-4 py-2 text-sm font-medium text-[#374151] hover:bg-[#f9fafb] transition-colors"
          >
            <Check size={14} /> Mark all read
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="mb-5 flex gap-1 rounded-xl border border-[#e5e7eb] bg-[#f9fafb] p-1 w-fit">
        {FILTER_TABS.map(({ key, label }) => (
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
            {counts[key] > 0 && (
              <span
                className={`text-[11px] font-semibold ${
                  filter === key ? "text-[#6b7280]" : "text-[#9ca3af]"
                }`}
              >
                {counts[key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notification groups */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f3f4f6]">
            <Bell size={24} className="text-[#9ca3af]" />
          </div>
          <p className="text-sm font-medium text-[#374151]">No notifications</p>
          <p className="mt-1 text-xs text-[#9ca3af]">
            {filter === "all"
              ? "Activity from loads, offers, and quotes will appear here."
              : "No notifications in this category yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {todayNotifs.length > 0 && (
            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#9ca3af]">
                Today
              </p>
              <div className="flex flex-col gap-2.5">
                {todayNotifs.map((n) => (
                  <NotificationRow key={n.id} notif={n} onRead={handleMarkRead} />
                ))}
              </div>
            </div>
          )}

          {olderNotifs.length > 0 && (
            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#9ca3af]">
                Older
              </p>
              <div className="flex flex-col gap-2.5">
                {olderNotifs.map((n) => (
                  <NotificationRow key={n.id} notif={n} onRead={handleMarkRead} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}
