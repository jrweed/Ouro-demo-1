"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Truck,
  MapPin,
  Users,
  Wrench,
  Phone,
  Calendar,
  Settings,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";
import {
  getTruck,
  getDriverForTruck,
  type Truck as TruckType,
} from "@/lib/fleet";
import { STATUS_CONFIG, EQUIPMENT_TYPES } from "@/lib/utils/constants";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TruckDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading } = useAuth();
  const [truck, setTruck] = useState<TruckType | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (!loading && user && user.role !== "carrier") router.push("/dashboard/3pl");
  }, [user, loading, router]);

  useEffect(() => {
    const id = params.id as string;
    const found = getTruck(id);
    if (found) setTruck(found);
    else router.push("/dashboard/carrier/trucks");
  }, [params.id]);

  if (loading || !user || !truck) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f9fafb]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#3b82f6] border-t-transparent" />
      </div>
    );
  }

  const sc = STATUS_CONFIG[truck.status] ?? { label: truck.status, bg: "#f3f4f6", color: "#4b5563", dot: "#9ca3af" };
  const assignedDriver = getDriverForTruck(truck.id);
  const equipLabel = EQUIPMENT_TYPES.find((e) => e.value === truck.equipmentType)?.label ?? truck.equipmentType;
  const vehicleDesc = [truck.year, truck.make, truck.model].filter(Boolean).join(" ");

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
        href="/dashboard/carrier/trucks"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-[#6b7280] hover:text-[#374151] transition-colors"
      >
        <ArrowLeft size={15} /> Back to Fleet
      </Link>

      {/* Page header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#eff6ff]">
            <Truck size={22} className="text-[#3b82f6]" />
          </div>
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-[#111827]">
              Truck {truck.truckNum}
            </h1>
            <p className="mt-0.5 text-sm text-[#6b7280]">
              {vehicleDesc || "Vehicle info not set"}
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
        <Link
          href="/dashboard/carrier/trucks"
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[#d1d5db] bg-white px-4 py-2.5 text-sm font-semibold text-[#374151] hover:border-[#3b82f6] hover:text-[#2563eb] transition-colors"
        >
          <Settings size={15} /> Manage in Fleet
        </Link>
      </div>

      {/* Maintenance alert */}
      {truck.status === "maintenance" && truck.notes && (
        <div className="mb-5 flex items-start gap-3 rounded-[10px] border border-[#ef4444]/20 bg-[#fef2f2] px-5 py-3.5">
          <Wrench size={15} className="mt-0.5 shrink-0 text-[#ef4444]" />
          <div>
            <p className="text-[13px] font-semibold text-[#1f2937]">In Maintenance</p>
            <p className="mt-0.5 text-[13px] text-[#4b5563]">{truck.notes}</p>
          </div>
        </div>
      )}

      {/* Info cards */}
      <div className="grid grid-cols-2 gap-5">
        {/* Vehicle info */}
        <div className="rounded-xl border border-[#e5e7eb] bg-white p-5">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-[#6b7280]">Vehicle Information</p>
          <div className="space-y-3.5">
            {truck.year && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Year</p>
                <p className="mt-0.5 text-sm font-medium text-[#1f2937]">{truck.year}</p>
              </div>
            )}
            {(truck.make || truck.model) && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Make / Model</p>
                <p className="mt-0.5 text-sm font-medium text-[#1f2937]">
                  {[truck.make, truck.model].filter(Boolean).join(" ") || "—"}
                </p>
              </div>
            )}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Equipment Type</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-[#1f2937]">
                <Truck size={13} className="text-[#9ca3af]" />
                {equipLabel}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Added</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-[#1f2937]">
                <Calendar size={13} className="text-[#9ca3af]" />
                {formatDate(truck.createdAt)}
              </p>
            </div>
          </div>
        </div>

        {/* Location & status */}
        <div className="rounded-xl border border-[#e5e7eb] bg-white p-5">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-[#6b7280]">Current Status</p>
          <div className="space-y-3.5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Status</p>
              <div className="mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ backgroundColor: sc.bg }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: sc.dot }} />
                <span className="text-[12px] font-semibold" style={{ color: sc.color }}>{sc.label}</span>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Location</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-[#1f2937]">
                <MapPin size={13} className="text-[#9ca3af]" />
                {truck.city && truck.state
                  ? `${truck.city}, ${truck.state}`
                  : <span className="font-normal text-[#9ca3af]">Not set</span>
                }
              </p>
            </div>
            {truck.notes && truck.status !== "maintenance" && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Notes</p>
                <p className="mt-0.5 text-[13px] text-[#374151]">{truck.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Assigned driver — full width */}
        <div className="col-span-2 rounded-xl border border-[#e5e7eb] bg-white p-5">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-[#6b7280]">Assigned Driver</p>
          {assignedDriver ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f0fdf4]">
                  <Users size={18} className="text-[#16a34a]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1f2937]">{assignedDriver.name}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-[#6b7280]">
                    <Phone size={11} className="text-[#d1d5db]" />
                    {assignedDriver.phone || "No phone on file"}
                  </p>
                </div>
              </div>
              <Link
                href={`/dashboard/carrier/drivers/${assignedDriver.id}`}
                className="text-[13px] font-medium text-[#3b82f6] hover:text-[#2563eb] transition-colors"
              >
                View Driver →
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f3f4f6]">
                <Users size={18} className="text-[#d1d5db]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#4b5563]">No driver assigned</p>
                <p className="text-[13px] text-[#9ca3af]">
                  Go to{" "}
                  <Link href="/dashboard/carrier/trucks" className="text-[#3b82f6] hover:underline">
                    Fleet
                  </Link>{" "}
                  to assign a driver
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
