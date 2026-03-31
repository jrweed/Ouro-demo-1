"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Plus,
  X,
  Save,
  Trash2,
  ChevronRight,
  Phone,
  Truck,
  AlertTriangle,
  MapPin,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useAuth } from "@/hooks/useAuth";
import {
  getDrivers,
  getTrucks,
  createDriver,
  getTruckForDriver,
  type Driver,
  type DriverStatus,
} from "@/lib/fleet";

// ─── Constants ────────────────────────────────────────────────────────────────

const DRIVER_STATUS_OPTIONS: { value: DriverStatus; label: string }[] = [
  { value: "active",   label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "on_leave", label: "On Leave" },
];

const DRIVER_STATUS_CONFIG: Record<DriverStatus, { label: string; bg: string; color: string; dot: string }> = {
  active:   { label: "Active",   bg: "#f0fdf4", color: "#16a34a", dot: "#22c55e" },
  inactive: { label: "Inactive", bg: "#f3f4f6", color: "#4b5563", dot: "#9ca3af" },
  on_leave: { label: "On Leave", bg: "#fffbeb", color: "#d97706", dot: "#f59e0b" },
};

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
];

const BLANK_FORM = {
  name: "",
  phone: "",
  cdlNumber: "",
  cdlExpiry: "",
  status: "active" as DriverStatus,
  assignedTruckId: "" as string | null,
  homeCity: "",
  homeState: "SC",
};

type FilterKey = "all" | DriverStatus;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cdlExpiryStatus(dateStr: string): "ok" | "soon" | "expired" {
  if (!dateStr) return "ok";
  const expiry = new Date(dateStr + "T00:00:00");
  const now = new Date();
  const daysUntil = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
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

// ─── Slide-over panel ─────────────────────────────────────────────────────────

function DriverPanel({
  driver,
  onClose,
  onSave,
  onDelete,
}: {
  driver: Driver | null;
  onClose: () => void;
  onSave: (data: typeof BLANK_FORM) => void;
  onDelete?: (id: string) => void;
}) {
  const trucks = getTrucks();
  const [form, setForm] = useState(
    driver
      ? {
          name: driver.name,
          phone: driver.phone,
          cdlNumber: driver.cdlNumber,
          cdlExpiry: driver.cdlExpiry,
          status: driver.status,
          assignedTruckId: driver.assignedTruckId ?? "",
          homeCity: driver.homeCity,
          homeState: driver.homeState,
        }
      : BLANK_FORM
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  function field(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const isValid = form.name.trim() && form.homeCity.trim();

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/20" onClick={onClose} />
      <div className="fixed right-0 top-0 z-40 flex h-full w-[420px] flex-col border-l border-[#e5e7eb] bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e5e7eb] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f0fdf4]">
              <Users size={16} className="text-[#16a34a]" />
            </div>
            <h2 className="text-[15px] font-semibold text-[#111827]">
              {driver ? `Edit ${driver.name}` : "Add Driver"}
            </h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[#9ca3af] hover:bg-[#f3f4f6] hover:text-[#374151] transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Name */}
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wider text-[#6b7280]">
              Full Name <span className="text-[#ef4444]">*</span>
            </label>
            <input
              type="text"
              placeholder="Joe Martinez"
              value={form.name}
              onChange={(e) => field("name", e.target.value)}
              className="w-full rounded-lg border border-[#d1d5db] px-3 py-2.5 text-sm text-[#111827] outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/10"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wider text-[#6b7280]">Phone</label>
            <input
              type="tel"
              placeholder="(843) 555-0142"
              value={form.phone}
              onChange={(e) => field("phone", e.target.value)}
              className="w-full rounded-lg border border-[#d1d5db] px-3 py-2.5 text-sm text-[#111827] outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/10"
            />
          </div>

          {/* CDL */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wider text-[#6b7280]">CDL Number</label>
              <input
                type="text"
                placeholder="SC-CDL-4421"
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

          {/* Status */}
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

          {/* Assigned truck */}
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wider text-[#6b7280]">Assigned Truck</label>
            <select
              value={form.assignedTruckId ?? ""}
              onChange={(e) => field("assignedTruckId", e.target.value)}
              className="w-full rounded-lg border border-[#d1d5db] px-3 py-2.5 text-sm text-[#111827] outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/10"
            >
              <option value="">— Unassigned —</option>
              {trucks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.truckNum} ({t.equipmentType === "reefer_single" ? "Reefer Single" : "Reefer Multi"})
                </option>
              ))}
            </select>
          </div>

          {/* Home base */}
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

        {/* Footer */}
        <div className="border-t border-[#e5e7eb] px-6 py-4">
          {confirmDelete ? (
            <div className="rounded-xl border border-[#ef4444]/30 bg-[#fef2f2] p-4">
              <p className="mb-3 text-[13px] font-semibold text-[#991b1b]">Remove this driver?</p>
              <p className="mb-4 text-[12px] text-[#4b5563]">This will permanently remove the driver from your roster.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => onDelete && driver && onDelete(driver.id)}
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
                onClick={() => onSave(form)}
                disabled={!isValid}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#3b82f6] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2563eb] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Save size={15} /> Save Driver
              </button>
              {driver && onDelete && (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-[#d1d5db] px-3 py-2.5 text-sm font-medium text-[#6b7280] hover:border-[#ef4444] hover:text-[#ef4444] transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Driver row ───────────────────────────────────────────────────────────────

function DriverRow({
  driver,
  truckNum,
  onClick,
}: {
  driver: Driver;
  truckNum: string | null;
  onClick: () => void;
}) {
  const sc = DRIVER_STATUS_CONFIG[driver.status];
  const cdlStatus = cdlExpiryStatus(driver.cdlExpiry);

  return (
    <div
      onClick={onClick}
      className="grid cursor-pointer items-center border-b border-[#f3f4f6] px-5 py-3.5 text-sm last:border-none hover:bg-[#fafafa] transition-colors bg-white"
      style={{ gridTemplateColumns: "180px 140px 160px 160px 130px 100px 32px" }}
    >
      <span className="font-semibold text-[#1f2937]">{driver.name}</span>
      <span className="flex items-center gap-1 text-[13px] text-[#4b5563]">
        <Phone size={11} className="text-[#d1d5db]" />
        {driver.phone || "—"}
      </span>
      <div>
        <span className="text-[13px] text-[#4b5563]">{driver.cdlNumber || "—"}</span>
        {driver.cdlExpiry && (
          <div className="flex items-center gap-1 mt-0.5">
            {cdlStatus !== "ok" && (
              <AlertTriangle size={10} className={cdlStatus === "expired" ? "text-[#ef4444]" : "text-[#f59e0b]"} />
            )}
            <span className={`text-[11px] ${cdlStatus === "expired" ? "text-[#ef4444]" : cdlStatus === "soon" ? "text-[#d97706]" : "text-[#9ca3af]"}`}>
              Exp {formatDate(driver.cdlExpiry)}
            </span>
          </div>
        )}
      </div>
      <span className="flex items-center gap-1 text-[13px] text-[#4b5563]">
        <Truck size={12} className="text-[#d1d5db]" />
        {truckNum ?? <span className="text-[#9ca3af]">Unassigned</span>}
      </span>
      <span className="flex items-center gap-1 text-[13px] text-[#4b5563]">
        <MapPin size={11} className="text-[#d1d5db]" />
        {driver.homeCity}, {driver.homeState}
      </span>
      <span
        className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
        style={{ backgroundColor: sc.bg, color: sc.color }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: sc.dot }} />
        {sc.label}
      </span>
      <ChevronRight size={14} className="text-[#d1d5db]" />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DriversPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [showAddPanel, setShowAddPanel] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (!loading && user && user.role !== "carrier") router.push("/dashboard/3pl");
  }, [user, loading, router]);

  useEffect(() => {
    setDrivers(getDrivers().sort((a, b) => a.name.localeCompare(b.name)));
  }, []);

  function refresh() {
    setDrivers(getDrivers().sort((a, b) => a.name.localeCompare(b.name)));
  }

  function handleAdd(form: typeof BLANK_FORM) {
    createDriver({
      name: form.name.trim(),
      phone: form.phone.trim(),
      cdlNumber: form.cdlNumber.trim(),
      cdlExpiry: form.cdlExpiry,
      status: form.status,
      assignedTruckId: form.assignedTruckId || null,
      homeCity: form.homeCity.trim(),
      homeState: form.homeState,
    });
    refresh();
    setShowAddPanel(false);
  }

  const filtered = filter === "all" ? drivers : drivers.filter((d) => d.status === filter);

  const counts = {
    all: drivers.length,
    active: drivers.filter((d) => d.status === "active").length,
    inactive: drivers.filter((d) => d.status === "inactive").length,
    on_leave: drivers.filter((d) => d.status === "on_leave").length,
  };

  const unassigned = drivers.filter((d) => !d.assignedTruckId && d.status === "active").length;
  const expiringCdl = drivers.filter((d) => cdlExpiryStatus(d.cdlExpiry) !== "ok").length;

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f9fafb]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#3b82f6] border-t-transparent" />
      </div>
    );
  }

  return (
    <AppShell role="carrier" companyName={user.companyName} companyCity={user.companyCity} companyState={user.companyState} mcNumber={user.mcNumber} initials={user.initials}>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-2.5 text-[26px] font-bold tracking-tight text-[#111827]">
            Drivers
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#f0fdf4] px-1.5 text-sm font-semibold text-[#16a34a]">
              {drivers.length}
            </span>
          </h1>
          <p className="mt-1 text-sm text-[#6b7280]">Manage your driver roster and CDL records</p>
        </div>
        <button
          onClick={() => setShowAddPanel(true)}
          className="flex items-center gap-1.5 rounded-lg bg-[#3b82f6] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#2563eb] transition-colors"
        >
          <Plus size={17} /> Add Driver
        </button>
      </div>

      {/* Alerts */}
      {(unassigned > 0 || expiringCdl > 0) && (
        <div className="mb-6 flex flex-col gap-2">
          {unassigned > 0 && (
            <div className="flex items-center gap-3 rounded-[10px] border border-[#f59e0b]/30 bg-[#fffbeb] px-5 py-3">
              <AlertTriangle size={15} className="shrink-0 text-[#d97706]" />
              <p className="text-[13px] text-[#4b5563]">
                <span className="font-semibold text-[#1f2937]">{unassigned} active driver{unassigned > 1 ? "s" : ""}</span>{" "}
                {unassigned > 1 ? "are" : "is"} not assigned to a truck
              </p>
            </div>
          )}
          {expiringCdl > 0 && (
            <div className="flex items-center gap-3 rounded-[10px] border border-[#ef4444]/20 bg-[#fef2f2] px-5 py-3">
              <AlertTriangle size={15} className="shrink-0 text-[#ef4444]" />
              <p className="text-[13px] text-[#4b5563]">
                <span className="font-semibold text-[#1f2937]">{expiringCdl} CDL{expiringCdl > 1 ? "s" : ""}</span>{" "}
                expiring or expired — review and update
              </p>
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="mb-5 grid grid-cols-3 gap-3">
        {[
          { label: "Active",   count: counts.active,   color: "#16a34a", bg: "#f0fdf4" },
          { label: "On Leave", count: counts.on_leave, color: "#d97706", bg: "#fffbeb" },
          { label: "Inactive", count: counts.inactive, color: "#9ca3af", bg: "#f9fafb" },
        ].map(({ label, count, color, bg }) => (
          <div key={label} className="rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 text-center">
            <p className="text-[22px] font-bold" style={{ color }}>{count}</p>
            <p className="mt-0.5 text-[11px] font-medium text-[#6b7280]">{label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="mb-5 flex gap-1 rounded-xl border border-[#e5e7eb] bg-[#f9fafb] p-1 w-fit">
        {([
          { key: "all" as const,      label: "All" },
          { key: "active" as const,   label: "Active" },
          { key: "on_leave" as const, label: "On Leave" },
          { key: "inactive" as const, label: "Inactive" },
        ] as { key: FilterKey; label: string }[]).map(({ key, label }) => {
          const count = counts[key] ?? 0;
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === key ? "bg-white text-[#111827] shadow-sm" : "text-[#6b7280] hover:text-[#374151]"
              }`}
            >
              {label}
              {count > 0 && (
                <span className={`text-[11px] font-semibold ${filter === key ? "text-[#6b7280]" : "text-[#9ca3af]"}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Driver table */}
      <div className="overflow-hidden rounded-xl border border-[#e5e7eb]">
        <div
          className="grid border-b border-[#e5e7eb] bg-[#f9fafb] px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#6b7280]"
          style={{ gridTemplateColumns: "180px 140px 160px 160px 130px 100px 32px" }}
        >
          <span>Name</span>
          <span>Phone</span>
          <span>CDL</span>
          <span>Assigned Truck</span>
          <span>Home Base</span>
          <span>Status</span>
          <span />
        </div>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f3f4f6]">
              <Users size={22} className="text-[#9ca3af]" />
            </div>
            <p className="text-sm font-medium text-[#374151]">No drivers in this category</p>
          </div>
        ) : (
          filtered.map((driver) => {
            const truck = getTruckForDriver(driver.id);
            return (
              <DriverRow
                key={driver.id}
                driver={driver}
                truckNum={truck?.truckNum ?? null}
                onClick={() => router.push(`/dashboard/carrier/drivers/${driver.id}`)}
              />
            );
          })
        )}
      </div>

      {/* Add driver panel */}
      {showAddPanel && (
        <DriverPanel
          driver={null}
          onClose={() => setShowAddPanel(false)}
          onSave={handleAdd}
        />
      )}
    </AppShell>
  );
}
