/**
 * Booking system — sessionStorage + Supabase write-through.
 *
 * A booking is created when either party accepts an offer in the inbox.
 * All writes persist to both sessionStorage (for instant local reads)
 * and Supabase (for persistence across sessions).
 */

import { insertBooking as dbInsertBooking, updateBooking as dbUpdateBooking, type DbBooking } from "./supabase/db";
import { updateLoad as dbUpdateLoad } from "./supabase/db";

export type ShipmentStatus =
  | "confirmed"
  | "pickup_scheduled"
  | "in_transit"
  | "delivered";

export interface StatusEvent {
  status: ShipmentStatus;
  timestamp: string;
  note?: string;
}

export interface Booking {
  id: string; // `booking-${convId}`
  convId: string;
  loadId: string;
  carrierId: string;
  carrierName: string;
  driverName: string;
  truckNum: string;
  origin: string;
  destination: string;
  acceptedRate: number;
  /** Pulled from the load record if available */
  pickupDate?: string;
  commodity?: string;
  temperature?: string;
  equipmentType?: string;
  distanceMiles?: number;
  createdAt: string;
  shipmentStatus: ShipmentStatus;
  statusHistory?: StatusEvent[];
}

const BOOKINGS_KEY = "ch_bookings";

// ─── Status display config ────────────────────────────────────────────────────

export const SHIPMENT_STATUS_CONFIG: Record<
  ShipmentStatus,
  { label: string; color: string; bg: string; dot: string }
> = {
  confirmed:        { label: "Confirmed",        color: "#2563eb", bg: "#eff6ff", dot: "#3b82f6" },
  pickup_scheduled: { label: "Pickup Scheduled", color: "#d97706", bg: "#fffbeb", dot: "#f59e0b" },
  in_transit:       { label: "In Transit",       color: "#7c3aed", bg: "#f5f3ff", dot: "#8b5cf6" },
  delivered:        { label: "Delivered",        color: "#16a34a", bg: "#f0fdf4", dot: "#22c55e" },
};

export const SHIPMENT_STATUS_ORDER: ShipmentStatus[] = [
  "confirmed",
  "pickup_scheduled",
  "in_transit",
  "delivered",
];

// ─── Storage helpers ──────────────────────────────────────────────────────────

export function getBookings(): Booking[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(sessionStorage.getItem(BOOKINGS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveBookings(bookings: Booking[]): void {
  sessionStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
}

async function persistBookingToSupabase(b: Booking): Promise<void> {
  const dbRow: DbBooking = {
    id: b.id, convId: b.convId, loadId: b.loadId, carrierId: b.carrierId,
    carrierName: b.carrierName, driverName: b.driverName, truckNum: b.truckNum,
    origin: b.origin, destination: b.destination, acceptedRate: b.acceptedRate,
    pickupDate: b.pickupDate, commodity: b.commodity, temperature: b.temperature,
    equipmentType: b.equipmentType, distanceMiles: b.distanceMiles,
    shipmentStatus: b.shipmentStatus, createdAt: b.createdAt,
  };
  try {
    await dbInsertBooking(dbRow);
  } catch (err) {
    console.error("[bookings] Failed to persist to Supabase:", b.id, err);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Create a booking from a conversation + accepted offer amount. */
export function createBooking(data: {
  convId: string;
  loadId: string;
  carrierId: string;
  carrierName: string;
  driverName: string;
  truckNum: string;
  origin: string;
  destination: string;
  acceptedRate: number;
  pickupDate?: string;
  commodity?: string;
  temperature?: string;
  equipmentType?: string;
  distanceMiles?: number;
}): Booking {
  const id = `booking-${data.convId}-${data.loadId}`;

  // Idempotent — don't create a duplicate booking for the same conversation+load
  const existing = getBookings().find((b) => b.id === id);
  if (existing) {
    // Already in sessionStorage — still ensure it's persisted to Supabase
    persistBookingToSupabase(existing);
    return existing;
  }

  const now = new Date().toISOString();
  const booking: Booking = {
    ...data,
    id,
    createdAt: now,
    shipmentStatus: "confirmed",
    statusHistory: [{ status: "confirmed", timestamp: now, note: "Booking confirmed" }],
  };
  saveBookings([booking, ...getBookings()]);
  persistBookingToSupabase(booking);

  // Also update the load status to "booked" in ch_loads
  try {
    const loads = JSON.parse(sessionStorage.getItem("ch_loads") || "[]");
    const updated = loads.map((l: { id: string; status: string }) =>
      l.id === data.loadId ? { ...l, status: "booked" } : l
    );
    sessionStorage.setItem("ch_loads", JSON.stringify(updated));
  } catch {
    // Ignore if ch_loads isn't available
  }
  dbUpdateLoad(data.loadId, { status: "booked" }).catch(console.error);

  return booking;
}

const STATUS_NOTES: Record<ShipmentStatus, string> = {
  confirmed: "Booking confirmed",
  pickup_scheduled: "Pickup scheduled",
  in_transit: "Shipment picked up — in transit",
  delivered: "Shipment delivered",
};

/** Advance the shipment status to the next step. */
export function advanceBookingStatus(bookingId: string, note?: string): Booking | null {
  const bookings = getBookings();
  const booking = bookings.find((b) => b.id === bookingId);
  if (!booking) return null;

  const idx = SHIPMENT_STATUS_ORDER.indexOf(booking.shipmentStatus);
  if (idx === SHIPMENT_STATUS_ORDER.length - 1) return booking; // already delivered

  const nextStatus = SHIPMENT_STATUS_ORDER[idx + 1];
  const now = new Date().toISOString();
  const event: StatusEvent = {
    status: nextStatus,
    timestamp: now,
    note: note || STATUS_NOTES[nextStatus],
  };
  const updated = {
    ...booking,
    shipmentStatus: nextStatus,
    statusHistory: [...(booking.statusHistory || []), event],
  };
  saveBookings(bookings.map((b) => (b.id === bookingId ? updated : b)));
  dbUpdateBooking(bookingId, {
    shipment_status: nextStatus,
  }).catch(console.error);
  return updated;
}

/** Directly set a booking's shipment status. */
export function setBookingStatus(
  bookingId: string,
  status: ShipmentStatus,
  note?: string
): void {
  const now = new Date().toISOString();
  const event: StatusEvent = { status, timestamp: now, note: note || STATUS_NOTES[status] };
  saveBookings(
    getBookings().map((b) =>
      b.id === bookingId
        ? { ...b, shipmentStatus: status, statusHistory: [...(b.statusHistory || []), event] }
        : b
    )
  );
  const booking = getBookings().find((b) => b.id === bookingId);
  dbUpdateBooking(bookingId, {
    shipment_status: status,
  }).catch(console.error);
}

/** Get the status history for a booking. */
export function getBookingHistory(bookingId: string): StatusEvent[] {
  const booking = getBookings().find((b) => b.id === bookingId);
  return booking?.statusHistory || [];
}

/** Update the truck and driver assigned to a booking. */
export function updateBookingTruck(
  bookingId: string,
  truckNum: string,
  driverName: string
): void {
  saveBookings(
    getBookings().map((b) =>
      b.id === bookingId ? { ...b, truckNum, driverName } : b
    )
  );
  dbUpdateBooking(bookingId, { truck_num: truckNum, driver_name: driverName }).catch(console.error);
}

/** Returns bookings for a specific carrier (demo: all bookings). */
export function getBookingsByCarrier(carrierId?: string): Booking[] {
  // TODO: Filter by carrier_id = auth.uid() in production
  return getBookings();
}
