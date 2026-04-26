"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  Phone,
  MapPin,
  Truck,
  AlertTriangle,
  Edit3,
  Save,
  X,
  Trash2,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { equipmentLabel as equipLabel } from "@/lib/utils/constants";
import { useAuth } from "@/hooks/useAuth";
import {
  getDriver,
  getTruckForDriver,
  getTrucks,
  updateDriver,
  deleteDriver,
  type Driver,
  type DriverStatus,
} from "@/lib/fleet";

// ─── Constants ────────────────────────────────────────────────────────────────

const DRIVER_STATUS_CONFIG: Record<DriverStatus, { label: string; bg: string; color: string; dot: string }> = {
  active:   { label: "Active",   bg: "#f0fdf4", color: "#16a34a", dot: "#22c55e" },
  inactive: { label: "Inactive", bg: "#f3f4f6", color: "#4b5563", dot: "#9ca3af" },
  on_leave: { label: "On Leave", bg: "#fffbeb", color: "#d97706", dot: "#f59e0b" },
};

const DRIVER_STATUS_OPTIONS: { value: DriverStatus; label: string }[] = [
  { value: "active",   label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "on_leave", label: "On Leave" },
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cdlExpiryStatus(dateStr: string): "ok" | "soon" | "expired" {
  if (!dateStr) return "ok";
  const expiry = new Date(dateStr + "T00:00:00");
  const daysUntil = (expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (daysUntil < 0) return "expired";
  if (daysUntil < 90) return "soon";
  return "ok";
}

function formatDate(dateStr: string) {
  if (!dateStr) return "—";
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

// ─── Edit panel ───────────────────────────────────────────────────────────────

function EditDriverPanel({
  driver,
  onClose,
  onSave,
  onDelete,
}: {
  driver: Driver;
  onClose: () => void;
  onSave: (data: Omit<Driver, "id" | "createdAt">) => void;
  onDelete: () => void;
}) {
  const trucks = getTrucks();
  const [form, setForm] = useState({
    name: driver.name,
    phone: driver.phone,
    cdlNumber: driver.cdlNumber,
    cdlExpiry: driver.cdlExpiry,
    status: driver.status,
    assignedTruckId: driver.assignedTruckId ?? "",
    homeCity: driver.homeCity,
    homeState: driver.homeState,
  });
  const [confirmDelete, setConfirmDelete] = useState(false);

  function field(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const isValid = form.name.trim() && form.homeCity.trim();

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/20" onClick={onClose} />
      <div className="fixed right-0 top-0 z-40 flex h-full w-[420px] flex-col border-l border-[#e5e7eb] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#e5e7eb] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f0fdf4]">
              <Users size={16} className="text-[#16a34a]" />
            </div>
            <h2 className="text-[15px] font-semibold text-[#111827]">Edit {driver.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#9ca3af] hover:bg-[#f3f4f6] hover:text-[#374151] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wider text-[#6b7280]">
              Full Name <span className="text-[#ef4444]">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => field("name", e.target.value)}
              className="w-full rounded-lg border border-[#d1d5db] px-3 py-2.5 text-sm text-[#111827] outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/10"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wider text-[#6b7280]">Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => field("phone", e.target.value)}
              className="w-full rounded-lg border border-[#d1d5db] px-3 py-2.5 text-sm text-[#111827] outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/10"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wider text-[#6b7280]">CDL Number</label>
              <input
                type="text"
                value={form.cdlNumber}
                onChange={(e) => field("cdlNumber", e.target.value)}
                className="w-full rounded-lg border border-[#d1d5db] px-3 py-2.5 text-sm text-[#111827] outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/10"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wider text-[#6b7280]">CDL Expiry</label>
              <input
                type="date"
                value={form.cdlExpiry}
                onChange={(e) => field("cdlExpiry", e.target.value)}
                className="w-full rounded-lg border border-[#d1d5db] px-3 py-2.5 text-sm text-[#111827] outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/10"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wider text-[#6b7280]">Status</label>
            <select
              value={form.status}
              onChange={(e) => field("status", e.target.value)}
              className="w-full rounded-lg border border-[#d1d5db] px-3 py-2.5 text-sm text-[#111827] outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/10"
            >
              {DRIVER_STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wider text-[#6b7280]">Assigned Truck</label>
            <select
              value={form.assignedTruckId}
              onChange={(e) => field("assignedTruckId", e.target.value)}
              className="w-full rounded-lg border border-[#d1d5db] px-3 py-2.5 text-sm text-[#111827] outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/10"
            >
              <option value="">— Unassigned —</option>
              {trucks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.truckNum} ({equipLabel(t.equipmentType)})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wider text-[#6b7280]">
              Home Base <span className="text-[#ef4444]">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="City"
                value={form.homeCity}
                onChange={(e) => field("homeCity", e.target.value)}
                className="flex-1 rounded-lg border border-[#d1d5db] px-3 py-2.5 text-sm text-[#111827] outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/10"
              />
              <select
                value={form.homeState}
                onChange={(e) => field("homeState", e.target.value)}
                className="w-20 rounded-lg border border-[#d1d5db] px-2 py-2.5 text-sm text-[#111827] outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/10"
              >
                {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="border-t border-[#e5e7eb] px-6 py-4">
          {confirmDelete ? (
            <div className="rounded-xl border border-[#ef4444]/30 bg-[#fef2f2] p-4">
              <p className="mb-3 text-[13px] font-semibold text-[#991b1b]">Remove this driver?</p>
              <p className="mb-4 text-[12px] text-[#4b5563]">This will permanently remove the driver from your roster.</p>
              <div className="flex gap-2">
                <button
                  onClick={onDelete}
                  className="flex-1 rounded-lg bg-[#ef4444] px-4 py-2 text-sm font-semibold text-white hover:bg-[#dc2626] transition-colors"
                >
                  Yes, Remove
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 rounded-lg border border-[#d1d5db] bg-white px-4 py-2 text-sm font-medium text-[#374151] hover:bg-[#f9fafb] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onSave({ ...form, assignedTruckId: form.assignedTruckId || null })}
                disabled={!isValid}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#3b82f6] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2563eb] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Save size={15} /> Save Changes
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center justify-center rounded-lg border border-[#d1d5db] px-3 py-2.5 text-sm font-medium text-[#6b7280] hover:border-[#ef4444] hover:text-[#ef4444] transition-colors"
              >
                <Trash2 size={15} />
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DriverDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading } = useAuth();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (!loading && user && user.role !== "carrier") router.push("/dashboard/3pl");
  }, [user, loading, router]);

  useEffect(() => {
    const id = params.id as string;
    const found = getDriver(id);
    if (found) setDriver(found);
    else router.push("/dashboard/carrier/drivers");
  }, [params.id]);

  function handleSave(data: Omit<Driver, "id" | "createdAt">) {
    if (!driver) return;
    const updated = updateDriver(driver.id, data);
    if (updated) setDriver(updated);
    setIsEditing(false);
  }

  function handleDelete() {
    if (!driver) return;
    deleteDriver(driver.id);
    router.push("/dashboard/carrier/drivers");
  }

  if (loading || !user || !driver) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f9fafb]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#3b82f6] border-t-transparent" />
      </div>
    );
  }

  const sc = DRIVER_STATUS_CONFIG[driver.status];
  const cdlStatus = cdlExpiryStatus(driver.cdlExpiry);
  const assignedTruck = getTruckForDriver(driver.id);

  return (
    <AppShell
      role="carrier"
      companyName={user.companyName}
      companyCity={user.companyCity}
      companyState={user.companyState}
      mcNumber={user.mcNumber}
      initials={user.initials}
    >
      {/* Back nav */}
      <Link
        href="/dashboard/carrier/drivers"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-[#6b7280] hover:text-[#374151] transition-colors"
      >
        <ArrowLeft size={15} /> Back to Drivers
      </Link>

      {/* Page header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f0fdf4]">
            <Users size={22} className="text-[#16a34a]" />
          </div>
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-[#111827]">{driver.name}</h1>
            <p className="mt-0.5 flex items-center gap-1 text-sm text-[#6b7280]">
              <MapPin size={13} className="text-[#9ca3af]" />
              {driver.homeCity}, {driver.homeState}
            </p>
          </div>
          <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold"
            style={{ backgroundColor: sc.bg, color: sc.color }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: sc.dot }} />
            {sc.label}
          </span>
        </div>
        <button
          onClick={() => setIsEditing(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[#d1d5db] bg-white px-4 py-2.5 text-sm font-semibold text-[#374151] hover:border-[#3b82f6] hover:text-[#2563eb] transition-colors"
        >
          <Edit3 size={15} /> Edit Driver
        </button>
      </div>

      {/* CDL alert if expiring/expired */}
      {cdlStatus !== "ok" && (
        <div className={`mb-5 flex items-center gap-3 rounded-[10px] border px-5 py-3 ${
          cdlStatus === "expired"
            ? "border-[#ef4444]/20 bg-[#fef2f2]"
            : "border-[#f59e0b]/30 bg-[#fffbeb]"
        }`}>
          <AlertTriangle
            size={15}
            className={`shrink-0 ${cdlStatus === "expired" ? "text-[#ef4444]" : "text-[#d97706]"}`}
          />
          <p className="text-[13px] text-[#4b5563]">
            {cdlStatus === "expired"
              ? <><span className="font-semibold text-[#991b1b]">CDL has expired</span> — update and renew before scheduling routes</>
              : <><span className="font-semibold text-[#1f2937]">CDL expiring soon</span> — expires {formatDate(driver.cdlExpiry)}</>
            }
          </p>
        </div>
      )}

      {/* Info cards */}
      <div className="grid grid-cols-2 gap-5">
        {/* Contact info */}
        <div className="rounded-xl border border-[#e5e7eb] bg-white p-5">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-[#6b7280]">Contact Information</p>
          <div className="space-y-3.5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Phone</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-[#1f2937]">
                <Phone size={13} className="text-[#9ca3af]" />
                {driver.phone || <span className="font-normal text-[#9ca3af]">Not provided</span>}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Home Base</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-[#1f2937]">
                <MapPin size={13} className="text-[#9ca3af]" />
                {driver.homeCity}, {driver.homeState}
              </p>
            </div>
          </div>
        </div>

        {/* CDL info */}
        <div className="rounded-xl border border-[#e5e7eb] bg-white p-5">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-[#6b7280]">CDL Information</p>
          <div className="space-y-3.5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">CDL Number</p>
              <p className="mt-0.5 text-sm font-medium text-[#1f2937]">
                {driver.cdlNumber || <span className="font-normal text-[#9ca3af]">Not provided</span>}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Expiry Date</p>
              <div className="mt-0.5 flex items-center gap-1.5">
                {cdlStatus !== "ok" && (
                  <AlertTriangle size={13} className={cdlStatus === "expired" ? "text-[#ef4444]" : "text-[#f59e0b]"} />
                )}
                <span
                  className={`text-sm font-medium ${
                    cdlStatus === "expired" ? "text-[#ef4444]" :
                    cdlStatus === "soon" ? "text-[#d97706]" :
                    "text-[#1f2937]"
                  }`}
                >
                  {driver.cdlExpiry ? formatDate(driver.cdlExpiry) : <span className="font-normal text-[#9ca3af]">Not set</span>}
                </span>
                {cdlStatus === "expired" && (
                  <span className="rounded-full bg-[#fef2f2] px-1.5 py-0.5 text-[10px] font-semibold text-[#ef4444]">EXPIRED</span>
                )}
                {cdlStatus === "soon" && (
                  <span className="rounded-full bg-[#fffbeb] px-1.5 py-0.5 text-[10px] font-semibold text-[#d97706]">Expiring Soon</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Assigned truck — full width */}
        <div className="col-span-2 rounded-xl border border-[#e5e7eb] bg-white p-5">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-[#6b7280]">Assigned Truck</p>
          {assignedTruck ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eff6ff]">
                  <Truck size={18} className="text-[#3b82f6]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1f2937]">
                    Truck {assignedTruck.truckNum}
                    {[assignedTruck.year, assignedTruck.make, assignedTruck.model].filter(Boolean).length > 0 && (
                      <span className="ml-2 font-normal text-[#6b7280]">
                        {[assignedTruck.year, assignedTruck.make, assignedTruck.model].filter(Boolean).join(" ")}
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-[#6b7280]">
                    <MapPin size={11} className="text-[#d1d5db]" />
                    {assignedTruck.city && assignedTruck.state
                      ? `${assignedTruck.city}, ${assignedTruck.state}`
                      : "Location not set"}
                  </p>
                </div>
              </div>
              <Link
                href={`/dashboard/carrier/trucks/${assignedTruck.id}`}
                className="text-[13px] font-medium text-[#3b82f6] hover:text-[#2563eb] transition-colors"
              >
                View Truck →
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f3f4f6]">
                <Truck size={18} className="text-[#d1d5db]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#4b5563]">No truck assigned</p>
                <p className="text-[13px] text-[#9ca3af]">Click Edit Driver to assign a truck</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit slide-over */}
      {isEditing && (
        <EditDriverPanel
          driver={driver}
          onClose={() => setIsEditing(false)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </AppShell>
  );
}
