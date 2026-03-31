"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Truck,
  MapPin,
  Calendar,
  Package,
  Thermometer,
  Printer,
  CheckCircle2,
  FileText,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";
import {
  getInvoice,
  markInvoicePaid,
  INVOICE_STATUS_CONFIG,
  type Invoice,
} from "@/lib/invoices";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(isoStr: string) {
  return new Date(isoStr).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
}

function formatPickupDate(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function equipLabel(val?: string) {
  if (!val) return null;
  if (val === "reefer_single") return "Reefer Single-Temp";
  if (val === "reefer_multi") return "Reefer Multi-Temp";
  return val;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading } = useAuth();
  const [invoice, setInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    const id = params.id as string;
    const found = getInvoice(id);
    if (found) setInvoice(found);
    else if (!loading) router.back();
  }, [params.id, loading]);

  function handleMarkPaid() {
    if (!invoice) return;
    markInvoicePaid(invoice.id);
    setInvoice({ ...invoice, status: "paid" });
  }

  if (loading || !user || !invoice) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f9fafb]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#3b82f6] border-t-transparent" />
      </div>
    );
  }

  const sc = INVOICE_STATUS_CONFIG[invoice.status];
  const backHref =
    user.role === "3pl"
      ? "/dashboard/3pl/invoices"
      : "/dashboard/carrier/invoices";

  return (
    <AppShell
      role={user.role}
      companyName={user.companyName}
      companyCity={user.companyCity}
      companyState={user.companyState}
      mcNumber={user.mcNumber}
      initials={user.initials}
    >
      {/* Controls — hidden when printing */}
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm text-[#6b7280] hover:text-[#374151] transition-colors"
        >
          <ArrowLeft size={15} /> Back to Invoices
        </Link>

        <div className="flex items-center gap-3">
          {/* Status badge */}
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold"
            style={{ backgroundColor: sc.bg, color: sc.color }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: sc.dot }} />
            {sc.label}
          </span>

          {/* Mark as Paid — only 3PL can do this */}
          {user.role === "3pl" && invoice.status === "pending" && (
            <button
              onClick={handleMarkPaid}
              className="flex items-center gap-1.5 rounded-lg bg-[#f0fdf4] border border-[#22c55e]/30 px-4 py-2 text-[13px] font-semibold text-[#16a34a] hover:bg-[#dcfce7] transition-colors"
            >
              <CheckCircle2 size={14} /> Mark as Paid
            </button>
          )}

          {/* Print */}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-lg border border-[#d1d5db] bg-white px-4 py-2 text-[13px] font-semibold text-[#374151] hover:bg-[#f9fafb] transition-colors"
          >
            <Printer size={14} /> Print Invoice
          </button>
        </div>
      </div>

      {/* ── Invoice document ── */}
      <div className="mx-auto max-w-3xl rounded-xl border border-[#e5e7eb] bg-white shadow-sm print:shadow-none print:border-none print:rounded-none">

        {/* ── Header: logo + invoice number ── */}
        <div className="flex items-start justify-between border-b border-[#e5e7eb] px-10 pb-7 pt-10">
          {/* ColdHaul branding */}
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#3b82f6]">
              <Truck size={22} className="text-white" />
            </div>
            <div>
              <p className="text-[21px] font-bold tracking-tight text-[#111827]">ColdHaul</p>
              <p className="text-[12px] text-[#6b7280]">Freight Brokerage Platform</p>
            </div>
          </div>

          {/* Invoice meta */}
          <div className="text-right">
            <p className="text-[30px] font-bold tracking-tight text-[#111827]">INVOICE</p>
            <p className="text-[15px] font-semibold text-[#374151]">{invoice.invoiceNumber}</p>
            <p className="mt-1 text-[12px] text-[#6b7280]">Issued {formatDate(invoice.issuedAt)}</p>
            {invoice.status === "paid" && (
              <span className="mt-2 inline-block rounded-full bg-[#f0fdf4] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#16a34a]">
                PAID
              </span>
            )}
          </div>
        </div>

        {/* ── Bill To / Carrier ── */}
        <div className="grid grid-cols-2 gap-8 border-b border-[#f3f4f6] px-10 py-7">
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Bill To</p>
            <p className="text-[15px] font-semibold text-[#111827]">
              {invoice.brokerCompany || "Freight Broker"}
            </p>
          </div>
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Carrier</p>
            <p className="text-[15px] font-semibold text-[#111827]">{invoice.carrierName}</p>
            <p className="mt-0.5 text-[13px] text-[#6b7280]">
              Truck {invoice.truckNum} · {invoice.driverName}
            </p>
          </div>
        </div>

        {/* ── Shipment details ── */}
        <div className="border-b border-[#f3f4f6] px-10 py-7">
          <p className="mb-4 text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">
            Shipment Details
          </p>

          {/* Route */}
          <div className="mb-4 flex items-center gap-2">
            <MapPin size={15} className="shrink-0 text-[#9ca3af]" />
            <span className="text-[16px] font-bold text-[#111827]">{invoice.origin}</span>
            <ArrowRight size={15} className="shrink-0 text-[#9ca3af]" />
            <span className="text-[16px] font-bold text-[#111827]">{invoice.destination}</span>
          </div>

          {/* Detail chips */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-[#4b5563]">
            {invoice.pickupDate && (
              <span className="flex items-center gap-1.5">
                <Calendar size={13} className="text-[#9ca3af]" />
                Pickup: {formatPickupDate(invoice.pickupDate)}
              </span>
            )}
            {invoice.commodity && (
              <span className="flex items-center gap-1.5">
                <Package size={13} className="text-[#9ca3af]" />
                {invoice.commodity}
              </span>
            )}
            {invoice.temperature && (
              <span className="flex items-center gap-1.5">
                <Thermometer size={13} className="text-[#9ca3af]" />
                {invoice.temperature}°F
              </span>
            )}
            {equipLabel(invoice.equipmentType) && (
              <span className="flex items-center gap-1.5">
                <Truck size={13} className="text-[#9ca3af]" />
                {equipLabel(invoice.equipmentType)}
              </span>
            )}
            {invoice.distanceMiles && (
              <span className="flex items-center gap-1.5">
                <MapPin size={13} className="text-[#9ca3af]" />
                {invoice.distanceMiles} miles
              </span>
            )}
          </div>
        </div>

        {/* ── Line items ── */}
        <div className="px-10 py-7">
          {/* Column headers */}
          <div className="mb-3 grid grid-cols-[1fr_auto] border-b border-[#e5e7eb] pb-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Description</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Amount</p>
          </div>

          {/* Freight line item */}
          <div className="grid grid-cols-[1fr_auto] items-start border-b border-[#f9fafb] py-4">
            <div>
              <p className="text-[14px] font-semibold text-[#111827]">
                Freight Transportation Services
              </p>
              <p className="mt-0.5 text-[12px] text-[#6b7280]">
                {invoice.origin} → {invoice.destination}
                {invoice.commodity ? ` · ${invoice.commodity}` : ""}
              </p>
            </div>
            <p className="text-[14px] font-semibold text-[#111827]">
              ${invoice.freightCharge.toLocaleString()}
            </p>
          </div>

          {/* Total */}
          <div className="mt-4 flex items-center justify-end gap-10 border-t border-[#e5e7eb] pt-4">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-[#6b7280]">Total Due</p>
            <p className="text-[26px] font-bold tracking-tight text-[#111827]">
              ${invoice.total.toLocaleString()}
            </p>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="rounded-b-xl border-t border-[#e5e7eb] bg-[#f9fafb] px-10 py-5">
          <div className="flex items-center justify-between text-[11px] text-[#9ca3af]">
            <span>
              Payment Terms: Net 30 · Please reference invoice {invoice.invoiceNumber} on payment
            </span>
            <span>ColdHaul · coldhaul.com</span>
          </div>
        </div>
      </div>

      {/* Print-only note about email */}
      <p className="mt-5 text-center text-[12px] text-[#9ca3af] print:hidden">
        In production, this invoice would be automatically emailed to both parties as a PDF.
      </p>
    </AppShell>
  );
}
