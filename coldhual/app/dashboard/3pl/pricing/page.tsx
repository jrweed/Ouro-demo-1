"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DollarSign, TrendingUp, Map, BarChart3, Zap, Clock } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";

// ─── Planned feature card ─────────────────────────────────────────────────────

function FeatureCard({
  icon: Icon,
  title,
  description,
  color,
  bg,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
  bg: string;
}) {
  return (
    <div className="rounded-xl border border-[#e5e7eb] bg-white p-5">
      <div
        className="mb-3 flex h-10 w-10 items-center justify-center rounded-[10px]"
        style={{ backgroundColor: bg }}
      >
        <Icon size={20} style={{ color }} />
      </div>
      <h3 className="text-[14px] font-semibold text-[#111827]">{title}</h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-[#6b7280]">{description}</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PricingToolPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (!loading && user && user.role !== "3pl") router.push("/dashboard/carrier");
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f9fafb]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#3b82f6] border-t-transparent" />
      </div>
    );
  }

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
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-[26px] font-bold tracking-tight text-[#111827]">Pricing Tool</h1>
          <span className="flex items-center gap-1.5 rounded-full border border-[#fbbf24]/40 bg-[#fffbeb] px-3 py-1 text-[12px] font-semibold text-[#d97706]">
            <Clock size={12} /> Coming Soon
          </span>
        </div>
        <p className="mt-1.5 text-sm text-[#6b7280]">
          Intelligent rate estimation and lane analysis for reefer freight
        </p>
      </div>

      {/* Hero WIP banner */}
      <div className="mb-8 overflow-hidden rounded-2xl border border-[#3b82f6]/20 bg-gradient-to-br from-[#eff6ff] to-[#dbeafe] px-8 py-10 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm">
          <DollarSign size={32} className="text-[#3b82f6]" />
        </div>
        <h2 className="text-[20px] font-bold text-[#1e40af]">Work in Progress</h2>
        <p className="mx-auto mt-2 max-w-md text-[14px] text-[#3b82f6]">
          We&apos;re building a powerful pricing engine tailored to temperature-controlled freight in the Southeast. Check back soon.
        </p>
      </div>

      {/* Planned features */}
      <div className="mb-3">
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-[#9ca3af]">Planned Features</h2>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <FeatureCard
          icon={TrendingUp}
          title="Live Rate Estimates"
          description="Get real-time rate guidance based on origin, destination, equipment type, and current market conditions."
          color="#3b82f6"
          bg="#eff6ff"
        />
        <FeatureCard
          icon={Map}
          title="Lane Analysis"
          description="Understand historical rate trends and volume patterns across your key lanes in SC, GA, NC, and FL."
          color="#8b5cf6"
          bg="#f5f3ff"
        />
        <FeatureCard
          icon={BarChart3}
          title="Margin Calculator"
          description="Input your carrier rates and target margin to instantly calculate the ideal broker rate to quote shippers."
          color="#22c55e"
          bg="#f0fdf4"
        />
        <FeatureCard
          icon={Zap}
          title="Auto-Suggest on Load Entry"
          description="When you post a new load, the pricing tool will automatically suggest a competitive rate range."
          color="#f59e0b"
          bg="#fffbeb"
        />
        <FeatureCard
          icon={DollarSign}
          title="Carrier Rate Benchmarking"
          description="Compare carrier quote rates against market benchmarks to identify when you're getting a fair deal."
          color="#ef4444"
          bg="#fef2f2"
        />
        <FeatureCard
          icon={TrendingUp}
          title="Seasonal Trends"
          description="Visualize how produce season, holidays, and weather events historically affect reefer rates in your region."
          color="#0ea5e9"
          bg="#f0f9ff"
        />
      </div>
    </AppShell>
  );
}
