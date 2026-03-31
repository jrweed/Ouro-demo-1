/**
 * Notification system — sessionStorage-backed for the demo.
 *
 * TODO: Replace sessionStorage with Supabase:
 *   Table: notifications (id, user_id, type, title, body, read, created_at, href, metadata jsonb)
 *
 *   Write:  INSERT INTO notifications (...) VALUES (...)
 *   Read:   SELECT * FROM notifications WHERE user_id = auth.uid() ORDER BY created_at DESC
 *   Update: UPDATE notifications SET read = true WHERE id = $id
 *
 *   Realtime (new notifications pushed to client):
 *     supabase.channel('notifications')
 *       .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications',
 *           filter: `user_id=eq.${userId}` }, (payload) => addToLocalState(payload.new))
 *       .subscribe()
 */

export type NotificationType =
  | "offer_sent"       // broker sent a price offer to a carrier
  | "offer_received"   // carrier received a price offer  [carrier-side]
  | "carrier_notified" // broker notified a carrier about a load
  | "quote_received"   // broker received a quote from a carrier
  | "offer_accepted"   // carrier accepted an offer
  | "offer_declined"   // carrier declined an offer
  | "system";          // system / admin messages

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  createdAt: string; // ISO timestamp
  href?: string;     // URL to navigate to when clicked
  /** Which role sees this notification. "both" used for system messages. */
  role: "3pl" | "carrier" | "both";
  metadata?: {
    loadId?: string;
    carrierId?: string;
    carrierName?: string;
    driverName?: string;
    offeredRate?: number;
    quotedRate?: number;
    origin?: string;
    destination?: string;
  };
}

const STORAGE_KEY = "ch_notifications";
/** Custom event name — dispatched whenever a notification is added so subscribers can re-render. */
export const NOTIFICATION_EVENT = "ch:notification";

export function getNotifications(): AppNotification[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function addNotification(
  notif: Omit<AppNotification, "id" | "createdAt" | "read">
): AppNotification {
  const newNotif: AppNotification = {
    ...notif,
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    read: false,
  };
  const existing = getNotifications();
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify([newNotif, ...existing]));
  // Notify any listeners (e.g. NotificationDropdown) in the same tab
  window.dispatchEvent(new CustomEvent(NOTIFICATION_EVENT));
  return newNotif;
}

export function markNotificationRead(id: string): void {
  const updated = getNotifications().map((n) =>
    n.id === id ? { ...n, read: true } : n
  );
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent(NOTIFICATION_EVENT));
}

export function markAllNotificationsRead(): void {
  const updated = getNotifications().map((n) => ({ ...n, read: true }));
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent(NOTIFICATION_EVENT));
}

export function getUnreadCount(role?: "3pl" | "carrier"): number {
  const notifs = getNotifications();
  return notifs.filter(
    (n) => !n.read && (role ? n.role === role || n.role === "both" : true)
  ).length;
}
