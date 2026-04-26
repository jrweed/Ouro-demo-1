"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Building2,
  Bell,
  Shield,
  CreditCard,
  ChevronRight,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white">
      <div className="border-b border-[#e5e7eb] px-6 py-4">
        <h2 className="text-[14px] font-semibold text-[#111827]">{title}</h2>
      </div>
      <div className="divide-y divide-[#f3f4f6]">{children}</div>
    </div>
  );
}

// ─── Settings row ─────────────────────────────────────────────────────────────

function SettingRow({
  icon: Icon,
  label,
  value,
  badge,
}: {
  icon: React.ElementType;
  label: string;
  value?: string;
  badge?: string;
}) {
  return (
    <div className="flex items-center justify-between px-6 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f3f4f6]">
          <Icon size={15} className="text-[#6b7280]" />
        </div>
        <div>
          <p className="text-[13px] font-medium text-[#1f2937]">{label}</p>
          {value && <p className="mt-0.5 text-[12px] text-[#9ca3af]">{value}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {badge && (
          <span className="rounded-full bg-[#f3f4f6] px-2.5 py-0.5 text-[11px] font-medium text-[#6b7280]">
            {badge}
          </span>
        )}
        <ChevronRight size={15} className="text-[#d1d5db]" />
      </div>
    </div>
  );
}

// ─── Toggle row ───────────────────────────────────────────────────────────────

function ToggleRow({ label, description, defaultOn = false }: { label: string; description?: string; defaultOn?: boolean }) {
  return (
    <div className="flex items-center justify-between px-6 py-4">
      <div>
        <p className="text-[13px] font-medium text-[#1f2937]">{label}</p>
        {description && <p className="mt-0.5 text-[12px] text-[#9ca3af]">{description}</p>}
      </div>
      <div
        className={`relative h-5 w-9 cursor-not-allowed rounded-full transition-colors ${
          defaultOn ? "bg-[#3b82f6]" : "bg-[#e5e7eb]"
        }`}
        title="Settings locked in demo mode"
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${
            defaultOn ? "left-[18px]" : "left-0.5"
          }`}
        />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f9fafb]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#3b82f6] border-t-transparent" />
      </div>
    );
  }

  const isCarrier = user.role === "carrier";
  const locationStr = [user.companyCity, user.companyState].filter(Boolean).join(", ");

  return (
    <AppShell
      role={user.role}
      companyName={user.companyName}
      companyCity={user.companyCity}
      companyState={user.companyState}
      mcNumber={user.mcNumber}
      initials={user.initials}
    >
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[26px] font-bold tracking-tight text-[#111827]">Settings</h1>
        <p className="mt-1 text-sm text-[#6b7280]">Manage your account and preferences</p>
      </div>

      {/* Demo notice */}
      <div className="mb-6 flex items-center gap-3 rounded-[10px] border border-[#fbbf24]/30 bg-[#fffbeb] px-5 py-3.5">
        <Shield size={16} className="shrink-0 text-[#f59e0b]" />
        <p className="text-[13px] text-[#92400e]">
          Settings are read-only in demo mode. Full editing will be available after Supabase auth is connected.
        </p>
      </div>

      <div className="flex flex-col gap-5 max-w-2xl">

        {/* Profile */}
        <Section title="Profile">
          <div className="flex items-center gap-4 px-6 py-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eff6ff] text-[20px] font-bold text-[#3b82f6]">
              {user.initials}
            </div>
            <div>
              <p className="text-[15px] font-semibold text-[#111827]">{user.companyName}</p>
              <p className="mt-0.5 text-[13px] text-[#6b7280]">
                {isCarrier ? "Carrier" : "3PL Broker"}{user.mcNumber ? ` · MC# ${user.mcNumber}` : ""}
              </p>
              {locationStr && (
                <p className="mt-0.5 flex items-center gap-1 text-[12px] text-[#9ca3af]">
                  <MapPin size={11} /> {locationStr}
                </p>
              )}
            </div>
          </div>
          <SettingRow icon={User} label="Display Name" value={user.companyName} />
          <SettingRow icon={Mail} label="Email Address" value="demo@spoke.com" />
          <SettingRow icon={Phone} label="Phone Number" value="Not set" />
        </Section>

        {/* Company */}
        <Section title="Company">
          <SettingRow icon={Building2} label="Company Name" value={user.companyName} />
          {user.mcNumber && (
            <SettingRow icon={Shield} label="MC Number" value={`MC# ${user.mcNumber}`} badge="Verified" />
          )}
          <SettingRow icon={MapPin} label="Base Location" value={locationStr || "Not set"} />
        </Section>

        {/* Notifications */}
        <Section title="Notifications">
          <ToggleRow
            label="New quote requests"
            description={isCarrier ? "Alert when a broker sends you an offer" : "Alert when a carrier responds to your load"}
            defaultOn
          />
          <ToggleRow
            label="Booking confirmations"
            description="Alert when a load is booked and confirmed"
            defaultOn
          />
          <ToggleRow
            label="Load status updates"
            description="Alert when shipment status changes"
            defaultOn
          />
          <ToggleRow
            label="Email digest"
            description="Daily summary of activity"
          />
        </Section>

        {/* Billing */}
        <Section title="Billing &amp; Plan">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f3f4f6]">
                  <CreditCard size={15} className="text-[#6b7280]" />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-[#1f2937]">Current Plan</p>
                  <p className="mt-0.5 text-[12px] text-[#9ca3af]">Free demo — no billing active</p>
                </div>
              </div>
              <span className="rounded-full bg-[#dcfce7] px-3 py-1 text-[11px] font-semibold text-[#16a34a]">
                Demo
              </span>
            </div>
          </div>
        </Section>

        {/* Danger zone */}
        <Section title="Account">
          <SettingRow icon={Shield} label="Change Password" />
          <div className="px-6 py-4">
            <button
              disabled
              className="rounded-lg border border-[#fca5a5] px-4 py-2 text-[13px] font-medium text-[#ef4444] opacity-50 cursor-not-allowed"
              title="Not available in demo mode"
            >
              Delete Account
            </button>
          </div>
        </Section>

      </div>
    </AppShell>
  );
}
