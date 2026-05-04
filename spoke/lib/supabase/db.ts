/**
 * Supabase data access layer — replaces all sessionStorage calls.
 *
 * Each module (loads, carriers, bookings, etc.) exports async functions
 * that mirror the old synchronous sessionStorage API but hit Supabase.
 */

import { createClient } from "./client";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function supabase() {
  return createClient();
}

/** Check Supabase response and log errors. Returns true if OK. */
function check(result: { error: { message: string; code?: string; details?: string; hint?: string } | null }, label: string): boolean {
  if (result.error) {
    console.error(`[supabase] ✗ ${label}:`, result.error.message, result.error.code, result.error.details, result.error.hint);
    return false;
  }
  return true;
}

// ─── LOADS ────────────────────────────────────────────────────────────────────

export interface StoredLoad {
  id: string;
  status: string;
  origin: string;
  destination: string;
  pickupDate: string;
  commodity: string;
  temperature: string;
  equipmentType: string;
  weightLbs: string;
  distanceMiles: number;
  transitMinutes: number;
  targetRate: string;
  pricingRateMin: number;
  pricingRateMax: number;
  createdAt: string;
  [key: string]: unknown;
}

export async function getLoads(): Promise<StoredLoad[]> {
  const { data } = await supabase()
    .from("app_loads")
    .select("*")
    .order("created_at", { ascending: false });
  return (data || []).map(rowToLoad);
}

export async function getLoad(id: string): Promise<StoredLoad | null> {
  const { data } = await supabase()
    .from("app_loads")
    .select("*")
    .eq("id", id)
    .single();
  return data ? rowToLoad(data) : null;
}

export async function createLoad(load: StoredLoad): Promise<void> {
  const result = await supabase().from("app_loads").insert(loadToRow(load));
  check(result, "createLoad");
}

export async function updateLoad(id: string, updates: Partial<StoredLoad>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (updates.status !== undefined) row.status = updates.status;
  if (updates.origin !== undefined) row.origin = updates.origin;
  if (updates.destination !== undefined) row.destination = updates.destination;
  if (updates.pickupDate !== undefined) row.pickup_date = updates.pickupDate;
  if (updates.commodity !== undefined) row.commodity = updates.commodity;
  if (updates.temperature !== undefined) row.temperature = updates.temperature;
  if (updates.equipmentType !== undefined) row.equipment_type = updates.equipmentType;
  if (updates.weightLbs !== undefined) row.weight_lbs = updates.weightLbs;
  if (updates.distanceMiles !== undefined) row.distance_miles = updates.distanceMiles;
  if (updates.transitMinutes !== undefined) row.transit_minutes = updates.transitMinutes;
  if (updates.targetRate !== undefined) row.target_rate = updates.targetRate;
  if (updates.pricingRateMin !== undefined) row.pricing_rate_min = updates.pricingRateMin;
  if (updates.pricingRateMax !== undefined) row.pricing_rate_max = updates.pricingRateMax;
  const result = await supabase().from("app_loads").update(row).eq("id", id);
  check(result, "updateLoad");
}

export async function deleteLoad(id: string): Promise<void> {
  const result = await supabase().from("app_loads").delete().eq("id", id);
  check(result, "deleteLoad");
}

// snake_case DB row → camelCase frontend
function rowToLoad(r: Record<string, unknown>): StoredLoad {
  return {
    id: r.id as string,
    status: (r.status as string) || "open",
    origin: (r.origin as string) || "",
    destination: (r.destination as string) || "",
    pickupDate: (r.pickup_date as string) || "",
    commodity: (r.commodity as string) || "",
    temperature: (r.temperature as string) || "",
    equipmentType: (r.equipment_type as string) || "",
    weightLbs: (r.weight_lbs as string) || "",
    distanceMiles: (r.distance_miles as number) || 0,
    transitMinutes: (r.transit_minutes as number) || 0,
    targetRate: (r.target_rate as string) || "",
    pricingRateMin: (r.pricing_rate_min as number) || 0,
    pricingRateMax: (r.pricing_rate_max as number) || 0,
    createdAt: (r.created_at as string) || new Date().toISOString(),
  };
}

// camelCase frontend → snake_case DB row
function loadToRow(l: StoredLoad): Record<string, unknown> {
  return {
    id: l.id,
    status: l.status || "open",
    origin: l.origin,
    destination: l.destination,
    pickup_date: l.pickupDate,
    commodity: l.commodity,
    temperature: l.temperature,
    equipment_type: l.equipmentType,
    weight_lbs: l.weightLbs,
    distance_miles: l.distanceMiles,
    transit_minutes: l.transitMinutes,
    target_rate: l.targetRate,
    pricing_rate_min: l.pricingRateMin,
    pricing_rate_max: l.pricingRateMax,
    created_at: l.createdAt,
  };
}

// ─── CONVERSATIONS ────────────────────────────────────────────────────────────

export interface DbConversation {
  id: string;
  loadId: string;
  carrierId: string;
  carrierName: string;
  driverName: string;
  truckNum: string;
  origin: string;
  destination: string;
  offer: { amount: number; from: string; status: string; timestamp: string; loadId?: string; loadOrigin?: string; loadDestination?: string } | null;
  lastMessage: string;
  lastActivity: string;
  unreadBroker: number;
  unreadCarrier: number;
}

export async function getConversations(): Promise<DbConversation[]> {
  const { data } = await supabase()
    .from("conversations")
    .select("*")
    .order("last_activity", { ascending: false });
  return (data || []).map(rowToConversation);
}

export async function upsertConversation(conv: DbConversation): Promise<void> {
  const result = await supabase().from("conversations").upsert(conversationToRow(conv));
  check(result, "upsertConversation");
}

export async function updateConversation(id: string, updates: Record<string, unknown>): Promise<void> {
  const result = await supabase().from("conversations").update(updates).eq("id", id);
  check(result, "updateConversation");
}

export async function deleteConversationsByLoad(loadId: string): Promise<void> {
  // Delete messages for all conversations linked to this load
  const { data: convs } = await supabase().from("conversations").select("id").eq("load_id", loadId);
  if (convs && convs.length > 0) {
    const convIds = convs.map((c: { id: string }) => c.id);
    await supabase().from("messages").delete().in("conversation_id", convIds);
  }
  // Delete the conversations themselves
  await supabase().from("conversations").delete().eq("load_id", loadId);
}

function rowToConversation(r: Record<string, unknown>): DbConversation {
  return {
    id: r.id as string,
    loadId: (r.load_id as string) || "",
    carrierId: (r.carrier_id as string) || "",
    carrierName: (r.carrier_name as string) || "",
    driverName: (r.driver_name as string) || "",
    truckNum: (r.truck_num as string) || "",
    origin: (r.origin as string) || "",
    destination: (r.destination as string) || "",
    offer: r.offer as DbConversation["offer"],
    lastMessage: (r.last_message as string) || "",
    lastActivity: (r.last_activity as string) || "",
    unreadBroker: (r.unread_broker as number) || 0,
    unreadCarrier: (r.unread_carrier as number) || 0,
  };
}

function conversationToRow(c: DbConversation): Record<string, unknown> {
  return {
    id: c.id,
    load_id: c.loadId,
    carrier_id: c.carrierId,
    carrier_name: c.carrierName,
    driver_name: c.driverName,
    truck_num: c.truckNum,
    origin: c.origin,
    destination: c.destination,
    offer: c.offer,
    last_message: c.lastMessage,
    last_activity: c.lastActivity,
    unread_broker: c.unreadBroker,
    unread_carrier: c.unreadCarrier,
  };
}

// ─── MESSAGES ─────────────────────────────────────────────────────────────────

export interface DbMessage {
  id: string;
  conversationId: string;
  sender: "3pl" | "carrier";
  body: string;
  offerEvent?: { action: string; amount: number; previousAmount?: number };
  timestamp: string;
}

export async function getMessages(convId: string): Promise<DbMessage[]> {
  const { data } = await supabase()
    .from("messages")
    .select("*")
    .eq("conversation_id", convId)
    .order("timestamp", { ascending: true });
  return (data || []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    conversationId: r.conversation_id as string,
    sender: r.sender as "3pl" | "carrier",
    body: (r.body as string) || "",
    offerEvent: r.offer_event as DbMessage["offerEvent"],
    timestamp: (r.timestamp as string) || "",
  }));
}

export async function insertMessage(msg: DbMessage): Promise<void> {
  const result = await supabase().from("messages").insert({
    id: msg.id,
    conversation_id: msg.conversationId,
    sender: msg.sender,
    body: msg.body,
    offer_event: msg.offerEvent || null,
    timestamp: msg.timestamp,
  });
  check(result, "insertMessage");
}

// ─── BOOKINGS ─────────────────────────────────────────────────────────────────

export interface DbBooking {
  id: string;
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
  shipmentStatus: string;
  createdAt: string;
}

export async function getBookings(): Promise<DbBooking[]> {
  const { data } = await supabase()
    .from("bookings")
    .select("*")
    .order("created_at", { ascending: false });
  return (data || []).map(rowToBooking);
}

export async function insertBooking(b: DbBooking): Promise<void> {
  const row = {
    id: b.id,
    conv_id: b.convId,
    load_id: b.loadId,
    carrier_id: b.carrierId,
    carrier_name: b.carrierName,
    driver_name: b.driverName,
    truck_num: b.truckNum,
    origin: b.origin,
    destination: b.destination,
    accepted_rate: b.acceptedRate,
    pickup_date: b.pickupDate,
    commodity: b.commodity,
    temperature: b.temperature,
    equipment_type: b.equipmentType,
    distance_miles: b.distanceMiles,
    shipment_status: b.shipmentStatus,
    created_at: b.createdAt,
  };
  const result = await supabase().from("bookings").upsert(row);
  check(result, "insertBooking");
}

export async function updateBooking(id: string, updates: Record<string, unknown>): Promise<void> {
  const result = await supabase().from("bookings").update(updates).eq("id", id);
  check(result, "updateBooking");
}

function rowToBooking(r: Record<string, unknown>): DbBooking {
  return {
    id: r.id as string,
    convId: (r.conv_id as string) || "",
    loadId: (r.load_id as string) || "",
    carrierId: (r.carrier_id as string) || "",
    carrierName: (r.carrier_name as string) || "",
    driverName: (r.driver_name as string) || "",
    truckNum: (r.truck_num as string) || "",
    origin: (r.origin as string) || "",
    destination: (r.destination as string) || "",
    acceptedRate: (r.accepted_rate as number) || 0,
    pickupDate: r.pickup_date as string | undefined,
    commodity: r.commodity as string | undefined,
    temperature: r.temperature as string | undefined,
    equipmentType: r.equipment_type as string | undefined,
    distanceMiles: r.distance_miles as number | undefined,
    shipmentStatus: (r.shipment_status as string) || "confirmed",
    createdAt: (r.created_at as string) || "",
  };
}

// ─── INVOICES ─────────────────────────────────────────────────────────────────

export interface DbInvoice {
  id: string;
  invoiceNumber: string;
  bookingId: string;
  loadId: string;
  convId: string;
  brokerCompany: string;
  carrierName: string;
  origin: string;
  destination: string;
  pickupDate?: string;
  commodity?: string;
  temperature?: string;
  equipmentType?: string;
  distanceMiles?: number;
  driverName: string;
  truckNum: string;
  freightCharge: number;
  total: number;
  status: string;
  issuedAt: string;
}

export async function getInvoices(): Promise<DbInvoice[]> {
  const { data } = await supabase()
    .from("invoices")
    .select("*")
    .order("issued_at", { ascending: false });
  return (data || []).map(rowToInvoice);
}

export async function getInvoice(id: string): Promise<DbInvoice | null> {
  const { data } = await supabase()
    .from("invoices")
    .select("*")
    .eq("id", id)
    .single();
  return data ? rowToInvoice(data) : null;
}

export async function insertInvoice(inv: DbInvoice): Promise<void> {
  const result = await supabase().from("invoices").upsert({
    id: inv.id,
    invoice_number: inv.invoiceNumber,
    booking_id: inv.bookingId,
    load_id: inv.loadId,
    conv_id: inv.convId,
    broker_company: inv.brokerCompany,
    carrier_name: inv.carrierName,
    origin: inv.origin,
    destination: inv.destination,
    pickup_date: inv.pickupDate,
    commodity: inv.commodity,
    temperature: inv.temperature,
    equipment_type: inv.equipmentType,
    distance_miles: inv.distanceMiles,
    driver_name: inv.driverName,
    truck_num: inv.truckNum,
    freight_charge: inv.freightCharge,
    total: inv.total,
    status: inv.status,
    issued_at: inv.issuedAt,
  });
  check(result, "insertInvoice");
}

export async function updateInvoice(id: string, updates: Record<string, unknown>): Promise<void> {
  const result = await supabase().from("invoices").update(updates).eq("id", id);
  check(result, "updateInvoice");
}

function rowToInvoice(r: Record<string, unknown>): DbInvoice {
  return {
    id: r.id as string,
    invoiceNumber: (r.invoice_number as string) || "",
    bookingId: (r.booking_id as string) || "",
    loadId: (r.load_id as string) || "",
    convId: (r.conv_id as string) || "",
    brokerCompany: (r.broker_company as string) || "",
    carrierName: (r.carrier_name as string) || "",
    origin: (r.origin as string) || "",
    destination: (r.destination as string) || "",
    pickupDate: r.pickup_date as string | undefined,
    commodity: r.commodity as string | undefined,
    temperature: r.temperature as string | undefined,
    equipmentType: r.equipment_type as string | undefined,
    distanceMiles: r.distance_miles as number | undefined,
    driverName: (r.driver_name as string) || "",
    truckNum: (r.truck_num as string) || "",
    freightCharge: (r.freight_charge as number) || 0,
    total: (r.total as number) || 0,
    status: (r.status as string) || "pending",
    issuedAt: (r.issued_at as string) || "",
  };
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

export interface DbNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  role: string;
  href?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export async function getNotifications(): Promise<DbNotification[]> {
  const { data } = await supabase()
    .from("app_notifications")
    .select("*")
    .order("created_at", { ascending: false });
  return (data || []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    type: (r.type as string) || "",
    title: (r.title as string) || "",
    body: (r.body as string) || "",
    read: (r.read as boolean) || false,
    role: (r.role as string) || "both",
    href: r.href as string | undefined,
    metadata: r.metadata as Record<string, unknown> | undefined,
    createdAt: (r.created_at as string) || "",
  }));
}

export async function insertNotification(n: Omit<DbNotification, "read" | "createdAt">): Promise<void> {
  const result = await supabase().from("app_notifications").insert({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    read: false,
    role: n.role,
    href: n.href,
    metadata: n.metadata,
    created_at: new Date().toISOString(),
  });
  check(result, "insertNotification");
}

export async function markNotificationRead(id: string): Promise<void> {
  const result = await supabase().from("app_notifications").update({ read: true }).eq("id", id);
  check(result, "markNotificationRead");
}

export async function markAllNotificationsRead(): Promise<void> {
  const result = await supabase().from("app_notifications").update({ read: true }).eq("read", false);
  check(result, "markAllNotificationsRead");
}

// ─── FLEET TRUCKS ────────────────────────────────────────────────────────────

export interface DbFleetTruck {
  id: string;
  truckNum: string;
  year: number | null;
  make: string;
  model: string;
  equipmentType: string;
  status: string;
  city: string;
  state: string;
  notes: string;
  createdAt: string;
}

function fleetTruckToRow(t: DbFleetTruck): Record<string, unknown> {
  return {
    id: t.id, truck_num: t.truckNum, year: t.year, make: t.make, model: t.model,
    equipment_type: t.equipmentType, status: t.status, city: t.city, state: t.state,
    notes: t.notes, created_at: t.createdAt,
  };
}

function rowToFleetTruck(r: Record<string, unknown>): DbFleetTruck {
  return {
    id: r.id as string,
    truckNum: (r.truck_num as string) || "",
    year: r.year as number | null,
    make: (r.make as string) || "",
    model: (r.model as string) || "",
    equipmentType: (r.equipment_type as string) || "",
    status: (r.status as string) || "available",
    city: (r.city as string) || "",
    state: (r.state as string) || "",
    notes: (r.notes as string) || "",
    createdAt: (r.created_at as string) || "",
  };
}

export async function getFleetTrucks(): Promise<DbFleetTruck[]> {
  const { data } = await supabase().from("fleet_trucks").select("*").order("truck_num");
  return (data || []).map(rowToFleetTruck);
}

export async function insertFleetTruck(t: DbFleetTruck): Promise<void> {
  const result = await supabase().from("fleet_trucks").insert(fleetTruckToRow(t));
  check(result, "insertFleetTruck");
}

export async function updateFleetTruck(id: string, updates: Partial<DbFleetTruck>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (updates.truckNum !== undefined) row.truck_num = updates.truckNum;
  if (updates.year !== undefined) row.year = updates.year;
  if (updates.make !== undefined) row.make = updates.make;
  if (updates.model !== undefined) row.model = updates.model;
  if (updates.equipmentType !== undefined) row.equipment_type = updates.equipmentType;
  if (updates.status !== undefined) row.status = updates.status;
  if (updates.city !== undefined) row.city = updates.city;
  if (updates.state !== undefined) row.state = updates.state;
  if (updates.notes !== undefined) row.notes = updates.notes;
  const result = await supabase().from("fleet_trucks").update(row).eq("id", id);
  check(result, "updateFleetTruck");
}

export async function deleteFleetTruck(id: string): Promise<void> {
  const result = await supabase().from("fleet_trucks").delete().eq("id", id);
  check(result, "deleteFleetTruck");
}

// ─── FLEET DRIVERS ───────────────────────────────────────────────────────────

export interface DbFleetDriver {
  id: string;
  name: string;
  phone: string;
  cdlNumber: string;
  cdlExpiry: string;
  status: string;
  assignedTruckId: string | null;
  homeCity: string;
  homeState: string;
  createdAt: string;
}

function fleetDriverToRow(d: DbFleetDriver): Record<string, unknown> {
  return {
    id: d.id, name: d.name, phone: d.phone, cdl_number: d.cdlNumber,
    cdl_expiry: d.cdlExpiry, status: d.status, assigned_truck_id: d.assignedTruckId,
    home_city: d.homeCity, home_state: d.homeState, created_at: d.createdAt,
  };
}

function rowToFleetDriver(r: Record<string, unknown>): DbFleetDriver {
  return {
    id: r.id as string,
    name: (r.name as string) || "",
    phone: (r.phone as string) || "",
    cdlNumber: (r.cdl_number as string) || "",
    cdlExpiry: (r.cdl_expiry as string) || "",
    status: (r.status as string) || "active",
    assignedTruckId: (r.assigned_truck_id as string) || null,
    homeCity: (r.home_city as string) || "",
    homeState: (r.home_state as string) || "",
    createdAt: (r.created_at as string) || "",
  };
}

export async function getFleetDrivers(): Promise<DbFleetDriver[]> {
  const { data } = await supabase().from("fleet_drivers").select("*").order("name");
  return (data || []).map(rowToFleetDriver);
}

export async function insertFleetDriver(d: DbFleetDriver): Promise<void> {
  const result = await supabase().from("fleet_drivers").insert(fleetDriverToRow(d));
  check(result, "insertFleetDriver");
}

export async function updateFleetDriver(id: string, updates: Partial<DbFleetDriver>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (updates.name !== undefined) row.name = updates.name;
  if (updates.phone !== undefined) row.phone = updates.phone;
  if (updates.cdlNumber !== undefined) row.cdl_number = updates.cdlNumber;
  if (updates.cdlExpiry !== undefined) row.cdl_expiry = updates.cdlExpiry;
  if (updates.status !== undefined) row.status = updates.status;
  if (updates.assignedTruckId !== undefined) row.assigned_truck_id = updates.assignedTruckId;
  if (updates.homeCity !== undefined) row.home_city = updates.homeCity;
  if (updates.homeState !== undefined) row.home_state = updates.homeState;
  const result = await supabase().from("fleet_drivers").update(row).eq("id", id);
  check(result, "updateFleetDriver");
}

export async function deleteFleetDriver(id: string): Promise<void> {
  const result = await supabase().from("fleet_drivers").delete().eq("id", id);
  check(result, "deleteFleetDriver");
}

// ─── CARRIERS (for matching) ──────────────────────────────────────────────────

export async function getCarriers(): Promise<Record<string, unknown>[]> {
  const { data } = await supabase().from("carriers").select("*");
  return data || [];
}

export async function getTrucks(): Promise<Record<string, unknown>[]> {
  const { data } = await supabase().from("trucks").select("*");
  return data || [];
}

export async function getRepeatBookings(): Promise<Record<string, unknown>[]> {
  const { data } = await supabase().from("repeat_booking_history").select("*");
  return data || [];
}

export async function getLaneHistoryRows(): Promise<Record<string, unknown>[]> {
  const { data } = await supabase().from("lane_history").select("*");
  return data || [];
}
