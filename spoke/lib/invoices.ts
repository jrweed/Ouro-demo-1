/**
 * Invoice system — sessionStorage + Supabase write-through.
 *
 * Invoices are auto-generated when a booking is created.
 * All writes persist to both sessionStorage and Supabase.
 */

import { insertInvoice as dbInsertInvoice, updateInvoice as dbUpdateInvoice, type DbInvoice } from "./supabase/db";

export type InvoiceStatus = "pending" | "paid";

export interface Invoice {
  id: string;            // `inv-${bookingId}`
  invoiceNumber: string; // e.g. "CH-2026-0001"
  bookingId: string;
  loadId: string;
  convId: string;
  issuedAt: string;      // ISO timestamp
  status: InvoiceStatus;

  // Parties
  brokerCompany: string;
  carrierName: string;

  // Shipment
  origin: string;
  destination: string;
  pickupDate?: string;
  commodity?: string;
  temperature?: string;
  equipmentType?: string;
  distanceMiles?: number;
  driverName: string;
  truckNum: string;

  // Financials
  freightCharge: number;
  total: number; // freightCharge (extensible for surcharges later)
}

export const INVOICE_STATUS_CONFIG: Record<
  InvoiceStatus,
  { label: string; bg: string; color: string; dot: string }
> = {
  pending: { label: "Pending",  bg: "#fffbeb", color: "#d97706", dot: "#f59e0b" },
  paid:    { label: "Paid",     bg: "#f0fdf4", color: "#16a34a", dot: "#22c55e" },
};

const INVOICES_KEY = "ch_invoices";

// ─── Storage helpers ──────────────────────────────────────────────────────────

export function getInvoices(): Invoice[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(sessionStorage.getItem(INVOICES_KEY) || "[]");
  } catch {
    return [];
  }
}

export function getInvoice(id: string): Invoice | null {
  return getInvoices().find((inv) => inv.id === id) ?? null;
}

function saveInvoices(invoices: Invoice[]): void {
  sessionStorage.setItem(INVOICES_KEY, JSON.stringify(invoices));
}

function persistInvoiceToSupabase(inv: Invoice): void {
  const row: DbInvoice = {
    id: inv.id, invoiceNumber: inv.invoiceNumber, bookingId: inv.bookingId,
    loadId: inv.loadId, convId: inv.convId, brokerCompany: inv.brokerCompany,
    carrierName: inv.carrierName, origin: inv.origin, destination: inv.destination,
    pickupDate: inv.pickupDate, commodity: inv.commodity, temperature: inv.temperature,
    equipmentType: inv.equipmentType, distanceMiles: inv.distanceMiles,
    driverName: inv.driverName, truckNum: inv.truckNum,
    freightCharge: inv.freightCharge, total: inv.total,
    status: inv.status, issuedAt: inv.issuedAt,
  };
  dbInsertInvoice(row).catch(console.error);
}

function getNextInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const invoices = getInvoices();
  const thisYear = invoices.filter((inv) =>
    inv.invoiceNumber.startsWith(`CH-${year}-`)
  );
  const seq = String(thisYear.length + 1).padStart(4, "0");
  return `CH-${year}-${seq}`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Create an invoice from a booking. Idempotent — safe to call multiple times. */
export function createInvoice(data: {
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
}): Invoice {
  const id = `inv-${data.bookingId}`;

  // Idempotent — update brokerCompany if it was created blank
  const existing = getInvoices().find((inv) => inv.id === id);
  if (existing) {
    if (!existing.brokerCompany && data.brokerCompany) {
      saveInvoices(
        getInvoices().map((inv) =>
          inv.id === id ? { ...inv, brokerCompany: data.brokerCompany } : inv
        )
      );
      dbUpdateInvoice(id, { broker_company: data.brokerCompany }).catch(console.error);
      return { ...existing, brokerCompany: data.brokerCompany };
    }
    return existing;
  }

  const invoice: Invoice = {
    ...data,
    id,
    invoiceNumber: getNextInvoiceNumber(),
    issuedAt: new Date().toISOString(),
    status: "pending",
    total: data.freightCharge,
  };

  saveInvoices([invoice, ...getInvoices()]);
  persistInvoiceToSupabase(invoice);
  return invoice;
}

/** Mark an invoice as paid. */
export function markInvoicePaid(id: string): void {
  saveInvoices(
    getInvoices().map((inv) =>
      inv.id === id ? { ...inv, status: "paid" as InvoiceStatus } : inv
    )
  );
  dbUpdateInvoice(id, { status: "paid" }).catch(console.error);
}
