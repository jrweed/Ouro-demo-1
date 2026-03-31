/**
 * Booking system — sessionStorage-backed for the demo.
 *
 * A booking is created when either party accepts an offer in the inbox.
 *
 * TODO: Replace sessionStorage with Supabase:
 *   Table: bookings (id, load_id, carrier_id, broker_id, accepted_rate,
 *                    shipment_status, pickup_date, commodity, temperature,
 *                    equipment_type, driver_name, truck_num, created_at)
 *
 *   Write:  INSERT INTO bookings (...) VALUES (...)
 *   Read:   SELECT * FROM bookings WHERE broker_id = auth.uid() ORDER BY created_at DESC
 *           SELECT * FROM bookings WHERE carrier_id = auth.uid() ORDER BY created_at DESC
 *   Update: UPDATE bookings SET shipment_status = $status WHERE id = $id
 */

export type ShipmentStatus =
  | "confirmed"
  | "pickup_scheduled"
  | "in_transit"
  | "delivered";

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
  const id = `booking-${data.convId}`;

  // Idempotent — don't create a duplicate booking for the same conversation
  const existing = getBookings().find((b) => b.id === id);
  if (existing) return existing;

  const booking: Booking = {
    ...data,
    id,
    createdAt: new Date().toISOString(),
    shipmentStatus: "confirmed",
  };
  saveBookings([booking, ...getBookings()]);

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

  return booking;
}

/** Advance the shipment status to the next step. */
export function advanceBookingStatus(bookingId: string): Booking | null {
  const bookings = getBookings();
  const booking = bookings.find((b) => b.id === bookingId);
  if (!booking) return null;

  const idx = SHIPMENT_STATUS_ORDER.indexOf(booking.shipmentStatus);
  if (idx === SHIPMENT_STATUS_ORDER.length - 1) return booking; // already delivered

  const nextStatus = SHIPMENT_STATUS_ORDER[idx + 1];
  const updated = { ...booking, shipmentStatus: nextStatus };
  saveBookings(bookings.map((b) => (b.id === bookingId ? updated : b)));
  return updated;
}

/** Directly set a booking's shipment status. */
export function setBookingStatus(
  bookingId: string,
  status: ShipmentStatus
): void {
  saveBookings(
    getBookings().map((b) =>
      b.id === bookingId ? { ...b, shipmentStatus: status } : b
    )
  );
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
}

/** Returns bookings for a specific carrier (demo: all bookings). */
export function getBookingsByCarrier(carrierId?: string): Booking[] {
  // TODO: Filter by carrier_id = auth.uid() in production
  return getBookings();
}
