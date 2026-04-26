"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, FileText, BookOpen } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";
import {
  getInvoices,
  INVOICE_STATUS_CONFIG,
  type Invoice,
  type InvoiceStatus,
} from "@/lib/invoices";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(isoStr: string) {
  return new Date(isoStr).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

// ─── Invoice row ──────────────────────────────────────────────────────────────

function InvoiceRow({ invoice }: { invoice: Invoice }) {
  const sc = INVOICE_STATUS_CONFIG[invoice.status];

  return (
    <div
      className="grid items-center border-b border-[#f3f4f6] px-5 py-4 last:border-none hover:bg-[#fafafa] transition-colors"
      style={{ gridTemplateColumns: "120px 1fr 160px 100px 90px 80px" }}
    >
      <span className="font-mono text-[13px] font-semibold text-[#374151]">
        {invoice.invoiceNumber}
      </span>

      <div className="min-w-0 pr-4">
        <div className="flex items-center gap-1.5 text-[13px] font-medium text-[#1f2937]">
          <span className="truncate">{invoice.origin}</span>
          <ArrowRight size={12} className="shrink-0 text-[#9ca3af]" />
          <span className="truncate">{invoice.destination}</span>
        </div>
        <p className="mt-0.5 text-[12px] text-[#9ca3af]">
          Truck {invoice.truckNum} · {invoice.driverName}
        </p>
      </div>

      <span className="text-[13px] text-[#4b5563]">{formatDate(invoice.issuedAt)}</span>

      <span className="text-[14px] font-semibold text-[#111827]">
        ${invoice.total.toLocaleString()}
      </span>

      <span
        className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold w-fit"
        style={{ backgroundColor: sc.bg, color: sc.color }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: sc.dot }} />
        {sc.label}
      </span>

      <Link
        href={`/dashboard/invoices/${invoice.id}`}
        className="flex items-center gap-1 text-[13px] font-medium text-[#3b82f6] hover:text-[#2563eb] transition-colors"
      >
        View <ArrowRight size={12} />
      </Link>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type FilterKey = "all" | InvoiceStatus;

export default function CarrierInvoicesPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filter, setFilter] = useState<FilterKey>("all");

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (!loading && user && user.role !== "carrier") router.push("/dashboard/3pl");
  }, [user, loading, router]);

  useEffect(() => {
    setInvoices(
      getInvoices().sort(
        (a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()
      )
    );
  }, []);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f9fafb]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#3b82f6] border-t-transparent" />
      </div>
    );
  }

  const filtered =
    filter === "all" ? invoices : invoices.filter((inv) => inv.status === filter);

  const counts = {
    all:     invoices.length,
    pending: invoices.filter((inv) => inv.status === "pending").length,
    paid:    invoices.filter((inv) => inv.status === "paid").length,
  };

  const earnedTotal = invoices
    .filter((inv) => inv.status === "paid")
    .reduce((s, inv) => s + inv.total, 0);

  const outstandingTotal = invoices
    .filter((inv) => inv.status === "pending")
    .reduce((s, inv) => s + inv.total, 0);

  return (
    <AppShell
      role="carrier"
      companyName={user.companyName}
      companyCity={user.companyCity}
      companyState={user.companyState}
      mcNumber={user.mcNumber}
      initials={user.initials}
    >
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[26px] font-bold tracking-tight text-[#111827]">Invoices</h1>
        <p className="mt-1 text-sm text-[#6b7280]">Payment records for your completed loads</p>
      </div>

      {/* Summary cards */}
      {invoices.length > 0 && (
        <div className="mb-7 grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-[#e5e7eb] bg-white p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9ca3af]">Total Billed</p>
            <p className="mt-2 text-[26px] font-bold tracking-tight text-[#111827]">
              ${(earnedTotal + outstandingTotal).toLocaleString()}
            </p>
            <p className="mt-0.5 text-[12px] text-[#9ca3af]">{invoices.length} invoice{invoices.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="rounded-xl border border-[#f0fdf4] bg-[#f0fdf4]/50 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#16a34a]">Collected</p>
            <p className="mt-2 text-[26px] font-bold tracking-tight text-[#111827]">
              ${earnedTotal.toLocaleString()}
            </p>
            <p className="mt-0.5 text-[12px] text-[#9ca3af]">{counts.paid} paid</p>
          </div>
          <div className="rounded-xl border border-[#fffbeb] bg-[#fffbeb]/50 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#d97706]">Outstanding</p>
            <p className="mt-2 text-[26px] font-bold tracking-tight text-[#111827]">
              ${outstandingTotal.toLocaleString()}
            </p>
            <p className="mt-0.5 text-[12px] text-[#9ca3af]">{counts.pending} pending</p>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="mb-5 flex gap-1 rounded-xl border border-[#e5e7eb] bg-[#f9fafb] p-1 w-fit">
        {([
          { key: "all" as FilterKey,     label: "All" },
          { key: "pending" as FilterKey, label: "Pending" },
          { key: "paid" as FilterKey,    label: "Paid" },
        ]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === key ? "bg-white text-[#111827] shadow-sm" : "text-[#6b7280] hover:text-[#374151]"
            }`}
          >
            {label}
            {counts[key] > 0 && (
              <span className={`text-[11px] font-semibold ${filter === key ? "text-[#6b7280]" : "text-[#9ca3af]"}`}>
                {counts[key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Invoice table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-[#e5e7eb] bg-white py-20 text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f3f4f6]">
            <FileText size={24} className="text-[#9ca3af]" />
          </div>
          <p className="text-sm font-medium text-[#374151]">No invoices yet</p>
          <p className="mt-1 text-xs text-[#9ca3af]">
            Invoices appear here once a broker confirms a booking with you.
          </p>
          <Link
            href="/dashboard/carrier/loads"
            className="mt-4 flex items-center gap-1.5 rounded-lg bg-[#3b82f6] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2563eb] transition-colors"
          >
            <BookOpen size={15} /> View Active Loads
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white">
          <div
            className="grid border-b border-[#e5e7eb] bg-[#f9fafb] px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#6b7280]"
            style={{ gridTemplateColumns: "120px 1fr 160px 100px 90px 80px" }}
          >
            <span>Invoice #</span>
            <span>Route / Truck</span>
            <span>Date Issued</span>
            <span>Amount</span>
            <span>Status</span>
            <span />
          </div>
          {filtered.map((inv) => (
            <InvoiceRow key={inv.id} invoice={inv} />
          ))}
        </div>
      )}
    </AppShell>
  );
}
