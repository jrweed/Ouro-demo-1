"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Truck,
  Plus,
  MapPin,
  X,
  Trash2,
  Wrench,
  AlertTriangle,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";
import {
  getTrucks,
  getDrivers,
  createTruck,
  updateTruck,
  updateDriver,
  deleteTruck,
  getDriverForTruck,
  type Truck as TruckType,
  type TruckStatus,
  type Driver,
} from "@/lib/fleet";
import { EQUIPMENT_TYPES, STATUS_CONFIG } from "@/lib/utils/constants";

// ─── Constants ────────────────────────────────────────────────────────────────

const TRUCK_STATUS_OPTIONS: { value: TruckStatus; label: string }[] = [
  { value: "available",   label: "Available" },
  { value: "loaded",      label: "Loaded" },
  { value: "in_transit",  label: "In Transit" },
  { value: "maintenance", label: "Maintenance" },
  { value: "inactive",    label: "Inactive" },
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
];

const BLANK_ADD_FORM = {
  truckNum: "",
  year: "",
  make: "",
  model: "",
  equipmentType: "reefer_single" as TruckType["equipmentType"],
};

type FilterKey = "all" | TruckStatus;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function equipLabel(val: string) {
  return EQUIPMENT_TYPES.find((e) => e.value === val)?.label ?? val;
}

// ─── Add Truck panel ──────────────────────────────────────────────────────────
// Only collects permanent truck data. Mutable fields (driver, location, status)
// are managed inline in the table row after the truck is created.

function AddTruckPanel({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (data: typeof BLANK_ADD_FORM) => void;
}) {
  const [form, setForm] = useState(BLANK_ADD_FORM);

  function field(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const isValid = form.truckNum.trim();

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/20" onClick={onClose} />
      <div className="fixed right-0 top-0 z-40 flex h-full w-[400px] flex-col border-l border-[#e5e7eb] bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e5e7eb] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eff6ff]">
              <Truck size={16} className="text-[#3b82f6]" />
            </div>
            <h2 className="text-[15px] font-semibold text-[#111827]">Add Truck</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#9ca3af] hover:bg-[#f3f4f6] hover:text-[#374151] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div className="rounded-xl border border-[#e5e7eb] bg-[#f9fafb] px-4 py-3 text-[13px] text-[#6b7280]">
            Enter the truck&apos;s permanent details. Status, driver, and location can be updated directly in the fleet table after adding.
          </div>

          {/* Truck number */}
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wider text-[#6b7280]">
              Truck Number <span className="text-[#ef4444]">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. #207"
              value={form.truckNum}
              onChange={(e) => field("truckNum", e.target.value)}
              className="w-full rounded-lg border border-[#d1d5db] px-3 py-2.5 text-sm text-[#111827] outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/10"
            />
          </div>

          {/* Year / Make / Model */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wider text-[#6b7280]">Year</label>
              <input
                type="number"
                placeholder="2022"
                min={1990}
                max={new Date().getFullYear() + 1}
                value={form.year}
                onChange={(e) => field("year", e.target.value)}
                className="w-full rounded-lg border border-[#d1d5db] px-3 py-2.5 text-sm text-[#111827] outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/10"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wider text-[#6b7280]">Make</label>
              <input
                type="text"
                placeholder="Freightliner"
                value={form.make}
                onChange={(e) => field("make", e.target.value)}
                className="w-full rounded-lg border border-[#d1d5db] px-3 py-2.5 text-sm text-[#111827] outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/10"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wider text-[#6b7280]">Model</label>
              <input
                type="text"
                placeholder="Cascadia"
                value={form.model}
                onChange={(e) => field("model", e.target.value)}
                className="w-full rounded-lg border border-[#d1d5db] px-3 py-2.5 text-sm text-[#111827] outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/10"
              />
            </div>
          </div>

          {/* Equipment type */}
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wider text-[#6b7280]">Equipment Type</label>
            <select
              value={form.equipmentType}
              onChange={(e) => field("equipmentType", e.target.value)}
              className="w-full rounded-lg border border-[#d1d5db] px-3 py-2.5 text-sm text-[#111827] outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/10"
            >
              {EQUIPMENT_TYPES.map((eq) => (
                <option key={eq.value} value={eq.value}>{eq.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[#e5e7eb] px-6 py-4">
          <button
            onClick={() => onSave(form)}
            disabled={!isValid}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#3b82f6] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2563eb] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add Truck
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Truck row (inline editing for mutable fields) ────────────────────────────

function TruckRow({
  truck,
  drivers,
  onUpdate,
  onDelete,
}: {
  truck: TruckType;
  drivers: Driver[];
  onUpdate: (id: string, patch: Partial<Pick<TruckType, "status" | "city" | "state">>, driverIdOverride?: string | null) => void;
  onDelete: (id: string) => void;
}) {
  const assignedDriver = getDriverForTruck(truck.id);

  const [city, setCity] = useState(truck.city);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Keep city in sync if parent refresh changes the truck
  useEffect(() => { setCity(truck.city); }, [truck.city]);

  function handleDriverChange(driverId: string) {
    onUpdate(truck.id, {}, driverId === "" ? null : driverId);
  }

  function handleStatusChange(status: string) {
    onUpdate(truck.id, { status: status as TruckStatus });
  }

  function handleStateChange(state: string) {
    onUpdate(truck.id, { state });
  }

  function handleCityBlur() {
    if (city.trim() !== truck.city) {
      onUpdate(truck.id, { city: city.trim() || truck.city });
    }
  }

  // Ghost style — no border at rest, border appears on hover/focus
  const ghostSelect = "rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-[13px] text-[#1f2937] outline-none focus:border-[#3b82f6] focus:bg-white focus:ring-2 focus:ring-[#3b82f6]/10 cursor-pointer hover:bg-[#f3f4f6] transition-colors";
  const ghostInput  = "min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-[13px] text-[#1f2937] outline-none focus:border-[#3b82f6] focus:bg-white focus:ring-2 focus:ring-[#3b82f6]/10 hover:bg-[#f3f4f6] transition-colors placeholder:text-[#d1d5db]";

  const statusCfg = STATUS_CONFIG[truck.status] ?? { bg: "#f3f4f6", color: "#4b5563", dot: "#9ca3af" };

  if (confirmDelete) {
    return (
      <div className="flex items-center justify-between border-b border-[#f3f4f6] bg-[#fef2f2] px-5 py-3.5 last:border-none">
        <div className="flex items-center gap-2.5">
          <AlertTriangle size={15} className="shrink-0 text-[#ef4444]" />
          <span className="text-[13px] font-medium text-[#1f2937]">
            Delete <span className="font-bold">{truck.truckNum}</span>? This will unassign its driver and cannot be undone.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onDelete(truck.id)}
            className="rounded-lg bg-[#ef4444] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#dc2626] transition-colors"
          >
            Delete
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            className="rounded-lg border border-[#d1d5db] bg-white px-3 py-1.5 text-[12px] font-medium text-[#374151] hover:bg-[#f9fafb] transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`grid items-center border-b border-[#f3f4f6] px-5 py-2.5 text-sm last:border-none ${
        truck.status === "maintenance" ? "bg-[#fef2f2]/30" : "bg-white"
      }`}
      style={{ gridTemplateColumns: "80px 1fr 1fr 1.2fr 1.4fr 140px 44px" }}
    >
      {/* ── Static cols ── */}
      <Link
        href={`/dashboard/carrier/trucks/${truck.id}`}
        className="font-semibold text-[#1f2937] hover:text-[#3b82f6] transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {truck.truckNum}
      </Link>
      <span className="text-[13px] text-[#4b5563]">
        {[truck.year, truck.make, truck.model].filter(Boolean).join(" ") || "—"}
      </span>
      <span className="text-[13px] text-[#4b5563]">{equipLabel(truck.equipmentType)}</span>

      {/* ── Driver dropdown ── */}
      <div>
        <select
          value={assignedDriver?.id ?? ""}
          onChange={(e) => handleDriverChange(e.target.value)}
          className={ghostSelect + " w-full"}
        >
          <option value="">— Unassigned —</option>
          {drivers.filter((d) => d.status === "active").map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      {/* ── Location (city + state) ── */}
      <div className="flex items-center gap-0.5">
        <MapPin size={11} className="shrink-0 text-[#d1d5db] ml-1" />
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          onBlur={handleCityBlur}
          onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
          placeholder="City"
          className={ghostInput}
        />
        <select
          value={truck.state}
          onChange={(e) => handleStateChange(e.target.value)}
          className={ghostSelect + " w-[52px] shrink-0"}
        >
          {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* ── Status — colored pill select ── */}
      <div>
        <div
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-opacity hover:opacity-80"
          style={{ backgroundColor: statusCfg.bg }}
        >
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: statusCfg.dot }}
          />
          <select
            value={truck.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="border-none bg-transparent text-[12px] font-semibold outline-none cursor-pointer appearance-none pr-1"
            style={{ color: statusCfg.color }}
          >
            {TRUCK_STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Delete ── */}
      <button
        onClick={() => setConfirmDelete(true)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-[#d1d5db] hover:bg-[#fef2f2] hover:text-[#ef4444] transition-colors"
        title="Delete truck"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TrucksPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [trucks, setTrucks] = useState<TruckType[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [showAddPanel, setShowAddPanel] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (!loading && user && user.role !== "carrier") router.push("/dashboard/3pl");
  }, [user, loading, router]);

  useEffect(() => {
    refresh();
  }, []);

  function refresh() {
    setTrucks(getTrucks().sort((a, b) => a.truckNum.localeCompare(b.truckNum)));
    setDrivers(getDrivers());
  }

  function handleAdd(form: typeof BLANK_ADD_FORM) {
    createTruck({
      truckNum: form.truckNum.trim(),
      year: form.year ? parseInt(form.year) : null,
      make: form.make.trim(),
      model: form.model.trim(),
      equipmentType: form.equipmentType,
      status: "available",
      city: "",
      state: "SC",
      notes: "",
    });
    refresh();
    setShowAddPanel(false);
  }

  function handleUpdate(
    id: string,
    patch: Partial<Pick<TruckType, "status" | "city" | "state">>,
    driverIdOverride?: string | null
  ) {
    if (driverIdOverride !== undefined) {
      // Unassign any driver currently on this truck
      drivers
        .filter((d) => d.assignedTruckId === id)
        .forEach((d) => updateDriver(d.id, { assignedTruckId: null }));
      // Assign the new driver if specified
      if (driverIdOverride) {
        updateDriver(driverIdOverride, { assignedTruckId: id });
      }
    }
    if (Object.keys(patch).length > 0) {
      updateTruck(id, patch);
    }
    refresh();
  }

  function handleDelete(id: string) {
    deleteTruck(id);
    refresh();
  }

  const filtered = filter === "all" ? trucks : trucks.filter((t) => t.status === filter);

  const counts = {
    all: trucks.length,
    available: trucks.filter((t) => t.status === "available").length,
    loaded: trucks.filter((t) => t.status === "loaded").length,
    in_transit: trucks.filter((t) => t.status === "in_transit").length,
    maintenance: trucks.filter((t) => t.status === "maintenance").length,
    inactive: trucks.filter((t) => t.status === "inactive").length,
  };

  const maintenanceTrucks = trucks.filter((t) => t.status === "maintenance");

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
            My Fleet
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#eff6ff] px-1.5 text-sm font-semibold text-[#2563eb]">
              {trucks.length}
            </span>
          </h1>
          <p className="mt-1 text-sm text-[#6b7280]">Update driver, location, and status directly in the table</p>
        </div>
        <button
          onClick={() => setShowAddPanel(true)}
          className="flex items-center gap-1.5 rounded-lg bg-[#3b82f6] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#2563eb] transition-colors"
        >
          <Plus size={17} /> Add Truck
        </button>
      </div>

      {/* Maintenance alert */}
      {maintenanceTrucks.length > 0 && (
        <div className="mb-6 flex items-start gap-3 rounded-[10px] border border-[#ef4444]/20 bg-[#fef2f2] px-5 py-3.5">
          <Wrench size={17} className="mt-0.5 shrink-0 text-[#ef4444]" />
          <div>
            <p className="text-sm font-semibold text-[#1f2937]">
              {maintenanceTrucks.length} truck{maintenanceTrucks.length > 1 ? "s" : ""} in maintenance
            </p>
            <p className="mt-0.5 text-[13px] text-[#4b5563]">
              {maintenanceTrucks.map((t) => t.truckNum).join(", ")} —{" "}
              {maintenanceTrucks.map((t) => t.notes || "Update status when resolved").join(" · ")}
            </p>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="mb-5 grid grid-cols-5 gap-3">
        {[
          { label: "Available",   count: counts.available,   color: "#22c55e", bg: "#f0fdf4" },
          { label: "Loaded",      count: counts.loaded,      color: "#3b82f6", bg: "#eff6ff" },
          { label: "In Transit",  count: counts.in_transit,  color: "#7c3aed", bg: "#f5f3ff" },
          { label: "Maintenance", count: counts.maintenance, color: "#ef4444", bg: "#fef2f2" },
          { label: "Inactive",    count: counts.inactive,    color: "#9ca3af", bg: "#f9fafb" },
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
          { key: "all" as const,         label: "All" },
          { key: "available" as const,   label: "Available" },
          { key: "loaded" as const,      label: "Loaded" },
          { key: "in_transit" as const,  label: "In Transit" },
          { key: "maintenance" as const, label: "Maintenance" },
          { key: "inactive" as const,    label: "Inactive" },
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

      {/* Fleet table */}
      <div className="overflow-hidden rounded-xl border border-[#e5e7eb]">
        {/* Header */}
        <div
          className="grid border-b border-[#e5e7eb] bg-[#f9fafb] px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#6b7280]"
          style={{ gridTemplateColumns: "80px 1fr 1fr 1.2fr 1.4fr 140px 44px" }}
        >
          <span>Truck</span>
          <span>Year / Make / Model</span>
          <span>Equipment</span>
          <span>Driver</span>
          <span>Location</span>
          <span>Status</span>
          <span />
        </div>

        {/* Hint row */}
        <div className="border-b border-[#f3f4f6] bg-[#fafafa] px-5 py-2 text-[11px] text-[#9ca3af]">
          Truck #, year/make/model, and equipment are permanent — delete and re-add to change them.
          Driver, location, and status update immediately when changed.
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f3f4f6]">
              <Truck size={22} className="text-[#9ca3af]" />
            </div>
            <p className="text-sm font-medium text-[#374151]">No trucks in this category</p>
          </div>
        ) : (
          filtered.map((truck) => (
            <TruckRow
              key={truck.id}
              truck={truck}
              drivers={drivers}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      {/* Add Truck panel */}
      {showAddPanel && (
        <AddTruckPanel
          onClose={() => setShowAddPanel(false)}
          onSave={handleAdd}
        />
      )}
    </AppShell>
  );
}
