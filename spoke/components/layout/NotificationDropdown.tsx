"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCircle2,
  XCircle,
  Inbox,
  Truck,
  Package,
  DollarSign,
} from "lucide-react";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  NOTIFICATION_EVENT,
  type AppNotification,
  type NotificationType,
} from "@/lib/notifications";

// ─── Icon / colour mapping per notification type ──────────────────────────────

type IconComponent = typeof Bell;

const TYPE_CONFIG: Record<
  NotificationType,
  { icon: IconComponent; iconBg: string; iconColor: string }
> = {
  offer_sent:       { icon: DollarSign,   iconBg: "#f0fdf4", iconColor: "#16a34a" },
  offer_received:   { icon: DollarSign,   iconBg: "#eff6ff", iconColor: "#3b82f6" },
  carrier_notified: { icon: Bell,         iconBg: "#fffbeb", iconColor: "#d97706" },
  quote_received:   { icon: Inbox,        iconBg: "#eff6ff", iconColor: "#3b82f6" },
  offer_accepted:   { icon: CheckCircle2, iconBg: "#f0fdf4", iconColor: "#16a34a" },
  offer_declined:   { icon: XCircle,      iconBg: "#fef2f2", iconColor: "#dc2626" },
  system:           { icon: Package,      iconBg: "#f9fafb", iconColor: "#6b7280" },
};

// Demo fallback shown when sessionStorage is empty (e.g. first load of demo)
const DEMO_NOTIFICATIONS: AppNotification[] = [
  {
    id: "demo-1",
    type: "offer_accepted",
    title: "Quote accepted — Coastal Freight",
    body: "$1,920 for Charleston → Atlanta",
    read: false,
    createdAt: new Date(Date.now() - 5 * 60_000).toISOString(),
    role: "3pl",
    href: "/dashboard/3pl/bookings",
  },
  {
    id: "demo-2",
    type: "quote_received",
    title: "3 new quotes received",
    body: "Savannah, GA → Miami, FL · Lowest: $2,340",
    read: false,
    createdAt: new Date(Date.now() - 60 * 60_000).toISOString(),
    role: "3pl",
    href: "/dashboard/3pl/quotes",
  },
  {
    id: "demo-3",
    type: "carrier_notified",
    title: "Load delivered",
    body: "Jacksonville, FL → Charlotte, NC",
    read: true,
    createdAt: new Date(Date.now() - 3 * 60 * 60_000).toISOString(),
    role: "3pl",
    href: "/dashboard/3pl/bookings",
  },
];

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

function loadNotifs(): AppNotification[] {
  const stored = getNotifications();
  return stored.length > 0 ? stored : DEMO_NOTIFICATIONS;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  // Initial read
  useEffect(() => {
    setNotifications(loadNotifs());
  }, []);

  // Re-read whenever a notification is added anywhere in the app
  useEffect(() => {
    function handleUpdate() {
      setNotifications(loadNotifs());
    }
    window.addEventListener(NOTIFICATION_EVENT, handleUpdate);
    return () => window.removeEventListener(NOTIFICATION_EVENT, handleUpdate);
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  function handleMarkAllRead() {
    markAllNotificationsRead();
    setNotifications(loadNotifs());
  }

  function handleMarkRead(id: string) {
    markNotificationRead(id);
    setNotifications(loadNotifs());
  }

  // Show only the 5 most recent in the dropdown
  const recent = notifications.slice(0, 5);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center justify-center rounded-lg p-2 text-[#4b5563] hover:bg-[#f3f4f6] transition-colors"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#ef4444] text-[11px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-[360px] overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#f3f4f6] px-4 py-3.5">
            <span className="text-sm font-semibold text-[#111827]">Notifications</span>
            <button
              onClick={handleMarkAllRead}
              className="text-xs font-medium text-[#3b82f6] hover:text-[#2563eb] transition-colors"
            >
              Mark all read
            </button>
          </div>

          {/* Notification list */}
          <div className="divide-y divide-[#f3f4f6]">
            {recent.length === 0 ? (
              <div className="py-10 text-center text-sm text-[#9ca3af]">
                No notifications yet
              </div>
            ) : (
              recent.map((n) => {
                const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.system;
                const Icon = cfg.icon;
                return (
                  <div
                    key={n.id}
                    className={`flex gap-3 px-4 py-3 cursor-pointer hover:bg-[#f9fafb] transition-colors ${
                      !n.read ? "bg-[#eff6ff]" : "bg-white"
                    }`}
                    onClick={() => {
                      handleMarkRead(n.id);
                      if (n.href) window.location.href = n.href;
                    }}
                  >
                    <div
                      className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: cfg.iconBg }}
                    >
                      <Icon size={15} style={{ color: cfg.iconColor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium text-[#1f2937] leading-tight">
                          {n.title}
                        </span>
                        {!n.read && (
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#3b82f6]" />
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-[#6b7280] truncate">{n.body}</p>
                      <p className="mt-1 text-[11px] text-[#9ca3af]">
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-[#f3f4f6] px-4 py-3 text-center">
            <Link
              href="/dashboard/notifications"
              className="text-sm font-medium text-[#3b82f6] hover:text-[#2563eb] transition-colors"
              onClick={() => setOpen(false)}
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
