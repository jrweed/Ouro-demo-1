"use client";

/**
 * Supabase → sessionStorage sync layer.
 *
 * On dashboard mount, fetches all business data from Supabase and writes
 * it to sessionStorage so existing pages just work.
 *
 * Defensive: if a Supabase fetch fails or returns empty, we do NOT
 * overwrite existing sessionStorage data (to avoid data loss).
 */

import { createClient } from "./client";

function supabase() {
  return createClient();
}

/** Only write to sessionStorage if we got real data from Supabase. */
function syncToSession(key: string, data: unknown[] | null, error: unknown) {
  if (error) {
    console.error(`[sync] ${key} fetch error:`, error);
    return;
  }
  if (data && data.length > 0) {
    sessionStorage.setItem(key, JSON.stringify(data));
  }
  // If data is empty array [], don't overwrite — existing sessionStorage may have local data
}

// ─── LOADS ────────────────────────────────────────────────────────────────────

export async function syncLoadsFromSupabase(): Promise<void> {
  const { data, error } = await supabase()
    .from("app_loads")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) { console.error("[sync] loads:", error.message); return; }
  if (!data || data.length === 0) return;

  const loads = data.map((r: Record<string, unknown>) => ({
    id: r.id,
    status: r.status || "open",
    origin: r.origin || "",
    destination: r.destination || "",
    pickupDate: r.pickup_date || "",
    commodity: r.commodity || "",
    temperature: r.temperature || "",
    equipmentType: r.equipment_type || "",
    weightLbs: r.weight_lbs || "",
    distanceMiles: r.distance_miles || 0,
    transitMinutes: r.transit_minutes || 0,
    targetRate: r.target_rate || "",
    pricingRateMin: r.pricing_rate_min || 0,
    pricingRateMax: r.pricing_rate_max || 0,
    createdAt: r.created_at || new Date().toISOString(),
  }));
  sessionStorage.setItem("ch_loads", JSON.stringify(loads));
}

// ─── CONVERSATIONS ────────────────────────────────────────────────────────────

export async function syncConversationsFromSupabase(): Promise<void> {
  const { data, error } = await supabase()
    .from("conversations")
    .select("*")
    .order("last_activity", { ascending: false });

  if (error) { console.error("[sync] conversations:", error.message); return; }
  if (!data || data.length === 0) return;

  const convs = data.map((r: Record<string, unknown>) => ({
    id: r.id,
    loadId: r.load_id,
    carrierId: r.carrier_id,
    carrierName: r.carrier_name,
    driverName: r.driver_name,
    truckNum: r.truck_num,
    origin: r.origin,
    destination: r.destination,
    offer: r.offer,
    lastMessage: r.last_message,
    lastActivity: r.last_activity,
    unreadBroker: r.unread_broker || 0,
    unreadCarrier: r.unread_carrier || 0,
  }));
  sessionStorage.setItem("ch_conversations", JSON.stringify(convs));
}

// ─── MESSAGES ─────────────────────────────────────────────────────────────────

export async function syncMessagesFromSupabase(convId: string): Promise<void> {
  const { data, error } = await supabase()
    .from("messages")
    .select("*")
    .eq("conversation_id", convId)
    .order("timestamp", { ascending: true });

  if (error) { console.error("[sync] messages:", error.message); return; }
  if (!data || data.length === 0) return;

  const msgs = data.map((r: Record<string, unknown>) => ({
    id: r.id,
    sender: r.sender,
    body: r.body,
    timestamp: r.timestamp,
    offerEvent: r.offer_event,
  }));
  sessionStorage.setItem(`ch_msgs_${convId}`, JSON.stringify(msgs));
}

// ─── BOOKINGS ─────────────────────────────────────────────────────────────────

export async function syncBookingsFromSupabase(): Promise<void> {
  const { data, error } = await supabase()
    .from("bookings")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) { console.error("[sync] bookings:", error.message); return; }
  if (!data || data.length === 0) return;

  const bookings = data.map((r: Record<string, unknown>) => ({
    id: r.id,
    convId: r.conv_id,
    loadId: r.load_id,
    carrierId: r.carrier_id,
    carrierName: r.carrier_name,
    driverName: r.driver_name,
    truckNum: r.truck_num,
    origin: r.origin,
    destination: r.destination,
    acceptedRate: r.accepted_rate,
    pickupDate: r.pickup_date,
    commodity: r.commodity,
    temperature: r.temperature,
    equipmentType: r.equipment_type,
    distanceMiles: r.distance_miles,
    shipmentStatus: r.shipment_status,
    createdAt: r.created_at,
  }));
  sessionStorage.setItem("ch_bookings", JSON.stringify(bookings));
}

// ─── INVOICES ─────────────────────────────────────────────────────────────────

export async function syncInvoicesFromSupabase(): Promise<void> {
  const { data, error } = await supabase()
    .from("invoices")
    .select("*")
    .order("issued_at", { ascending: false });

  if (error) { console.error("[sync] invoices:", error.message); return; }
  if (!data || data.length === 0) return;

  const invoices = data.map((r: Record<string, unknown>) => ({
    id: r.id,
    invoiceNumber: r.invoice_number,
    bookingId: r.booking_id,
    loadId: r.load_id,
    convId: r.conv_id,
    brokerCompany: r.broker_company,
    carrierName: r.carrier_name,
    origin: r.origin,
    destination: r.destination,
    pickupDate: r.pickup_date,
    commodity: r.commodity,
    temperature: r.temperature,
    equipmentType: r.equipment_type,
    distanceMiles: r.distance_miles,
    driverName: r.driver_name,
    truckNum: r.truck_num,
    freightCharge: r.freight_charge,
    total: r.total,
    status: r.status,
    issuedAt: r.issued_at,
  }));
  sessionStorage.setItem("ch_invoices", JSON.stringify(invoices));
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

export async function syncNotificationsFromSupabase(): Promise<void> {
  const { data, error } = await supabase()
    .from("app_notifications")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) { console.error("[sync] notifications:", error.message); return; }
  if (!data || data.length === 0) return;

  const notifs = data.map((r: Record<string, unknown>) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    body: r.body,
    read: r.read,
    role: r.role,
    href: r.href,
    metadata: r.metadata,
    createdAt: r.created_at,
  }));
  sessionStorage.setItem("ch_notifications", JSON.stringify(notifs));
}

// ─── CARRIERS & TRUCKS ───────────────────────────────────────────────────────

export async function syncCarriersFromSupabase(): Promise<void> {
  const { data: carriers, error: e1 } = await supabase().from("carriers").select("*");
  if (!e1 && carriers && carriers.length > 0) {
    sessionStorage.setItem("ch_carrier_profiles", JSON.stringify(carriers));
  }

  const { data: trucks, error: e2 } = await supabase().from("trucks").select("*");
  if (!e2 && trucks && trucks.length > 0) {
    sessionStorage.setItem("ch_carrier_trucks", JSON.stringify(trucks));
  }

  const { data: repeat, error: e3 } = await supabase().from("repeat_booking_history").select("*");
  if (!e3 && repeat && repeat.length > 0) {
    sessionStorage.setItem("ch_repeat_booking", JSON.stringify(repeat));
  }

  const { data: lanes, error: e4 } = await supabase().from("lane_history").select("*");
  if (!e4 && lanes && lanes.length > 0) {
    sessionStorage.setItem("ch_lane_history", JSON.stringify(lanes));
  }
}

// ─── FLEET (carrier trucks & drivers) ─────────────────────────────────────────

export async function syncFleetFromSupabase(): Promise<void> {
  const { data: trucks, error: e1 } = await supabase().from("fleet_trucks").select("*").order("truck_num");
  if (!e1 && trucks && trucks.length > 0) {
    const mapped = trucks.map((r: Record<string, unknown>) => ({
      id: r.id,
      truckNum: r.truck_num || "",
      year: r.year,
      make: r.make || "",
      model: r.model || "",
      equipmentType: r.equipment_type || "",
      status: r.status || "available",
      city: r.city || "",
      state: r.state || "",
      notes: r.notes || "",
      createdAt: r.created_at || "",
    }));
    sessionStorage.setItem("ch_trucks", JSON.stringify(mapped));
  }

  const { data: drivers, error: e2 } = await supabase().from("fleet_drivers").select("*").order("name");
  if (!e2 && drivers && drivers.length > 0) {
    const mapped = drivers.map((r: Record<string, unknown>) => ({
      id: r.id,
      name: r.name || "",
      phone: r.phone || "",
      cdlNumber: r.cdl_number || "",
      cdlExpiry: r.cdl_expiry || "",
      status: r.status || "active",
      assignedTruckId: r.assigned_truck_id || null,
      homeCity: r.home_city || "",
      homeState: r.home_state || "",
      createdAt: r.created_at || "",
    }));
    sessionStorage.setItem("ch_drivers", JSON.stringify(mapped));
  }
}

// ─── MASTER SYNC — call once on app load ──────────────────────────────────────

export async function syncAllFromSupabase(): Promise<void> {
  console.log("[sync] Starting Supabase → sessionStorage sync...");
  await Promise.all([
    syncLoadsFromSupabase(),
    syncConversationsFromSupabase(),
    syncBookingsFromSupabase(),
    syncInvoicesFromSupabase(),
    syncNotificationsFromSupabase(),
    syncCarriersFromSupabase(),
    syncFleetFromSupabase(),
  ]);
  console.log("[sync] Complete.");
}
