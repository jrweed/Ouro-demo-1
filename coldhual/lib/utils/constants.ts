// ColdHaul Design System Constants

export const CH_COLORS = {
  primary50: "#eff6ff",
  primary100: "#dbeafe",
  primary500: "#3b82f6",
  primary600: "#2563eb",
  primary700: "#1d4ed8",
  success50: "#f0fdf4",
  success500: "#22c55e",
  success600: "#16a34a",
  warning50: "#fffbeb",
  warning500: "#f59e0b",
  warning600: "#d97706",
  danger50: "#fef2f2",
  danger500: "#ef4444",
  danger600: "#dc2626",
  neutral50: "#f9fafb",
  neutral100: "#f3f4f6",
  neutral200: "#e5e7eb",
  neutral300: "#d1d5db",
  neutral400: "#9ca3af",
  neutral500: "#6b7280",
  neutral600: "#4b5563",
  neutral700: "#374151",
  neutral800: "#1f2937",
  neutral900: "#111827",
} as const;

export type UserRole = "3pl" | "carrier" | "admin";

export const EQUIPMENT_TYPES = [
  { value: "reefer_single", label: "Reefer Single-Temp" },
  { value: "reefer_multi", label: "Reefer Multi-Temp" },
] as const;

export const COVERAGE_STATES = ["SC", "GA", "NC", "FL"] as const;

export const LOAD_STATUSES = [
  "draft",
  "posted",
  "quoting",
  "booked",
  "picked_up",
  "in_transit",
  "delivered",
  "cancelled",
] as const;

export const TRUCK_STATUSES = [
  "available",
  "loaded",
  "in_transit",
  "maintenance",
  "inactive",
] as const;

export const QUOTE_STATUSES = [
  "pending",
  "accepted",
  "declined",
  "expired",
  "withdrawn",
] as const;

// Status → display config mapping
export const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; color: string; dot: string }
> = {
  // Load statuses
  active: { label: "Active", bg: "#dcfce7", color: "#15803d", dot: "#22c55e" },
  posted: { label: "Posted", bg: "#dbeafe", color: "#1d4ed8", dot: "#3b82f6" },
  quoting: { label: "Quoting", bg: "#dbeafe", color: "#1d4ed8", dot: "#3b82f6" },
  booked: { label: "Booked", bg: "#dbeafe", color: "#1d4ed8", dot: "#3b82f6" },
  picked_up: { label: "Picked Up", bg: "#dbeafe", color: "#1d4ed8", dot: "#3b82f6" },
  in_transit: { label: "In Transit", bg: "#dbeafe", color: "#1d4ed8", dot: "#3b82f6" },
  delivered: { label: "Delivered", bg: "#dcfce7", color: "#15803d", dot: "#22c55e" },
  cancelled: { label: "Cancelled", bg: "#fef2f2", color: "#dc2626", dot: "#ef4444" },
  draft: { label: "Draft", bg: "#f3f4f6", color: "#4b5563", dot: "#9ca3af" },
  pending: { label: "Pending", bg: "#fef3c7", color: "#92400e", dot: "#f59e0b" },
  expiring: { label: "Expiring", bg: "#fef2f2", color: "#dc2626", dot: "#ef4444" },
  // Truck statuses
  available: { label: "Available", bg: "#dcfce7", color: "#15803d", dot: "#22c55e" },
  loaded: { label: "Loaded", bg: "#dbeafe", color: "#1d4ed8", dot: "#3b82f6" },
  maintenance: { label: "Maintenance", bg: "#fef2f2", color: "#dc2626", dot: "#ef4444" },
  inactive: { label: "Inactive", bg: "#f3f4f6", color: "#4b5563", dot: "#9ca3af" },
  // Quote statuses
  accepted: { label: "Accepted", bg: "#dcfce7", color: "#15803d", dot: "#22c55e" },
  declined: { label: "Declined", bg: "#fef2f2", color: "#dc2626", dot: "#ef4444" },
  expired: { label: "Expired", bg: "#f3f4f6", color: "#4b5563", dot: "#9ca3af" },
  withdrawn: { label: "Withdrawn", bg: "#f3f4f6", color: "#4b5563", dot: "#9ca3af" },
};
