/**
 * Invoice system — sessionStorage-backed for the demo.
 *
 * Invoices are auto-generated when a booking is created.
 *
 * TODO: Replace sessionStorage with Supabase:
 *   Table: invoices (id, invoice_number, booking_id, load_id, conv_id,
 *                    broker_company, carrier_name, origin, destination,
 *                    pickup_date, commodity, temperature, equipment_type,
 *                    distance_miles, driver_name, truck_num,
 *                    freight_charge, total, status, issued_at)
 *
 *   Email delivery: Trigger Resend/SendGrid on INSERT to invoices table,
 *                   attaching a PDF rendered from a React Email template.
 */

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
  return invoice;
}

/** Mark an invoice as paid. */
export function markInvoicePaid(id: string): void {
  saveInvoices(
    getInvoices().map((inv) =>
      inv.id === id ? { ...inv, status: "paid" as InvoiceStatus } : inv
    )
  );
}
