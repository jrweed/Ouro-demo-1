"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ArrowRight, Sparkles } from "lucide-react";

function SpokeIcon({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="2" />
      <line x1="12" y1="2" x2="12" y2="10" /><line x1="12" y1="14" x2="12" y2="22" />
      <line x1="2" y1="12" x2="10" y2="12" /><line x1="14" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="4.93" x2="9.17" y2="9.17" /><line x1="14.83" y1="14.83" x2="19.07" y2="19.07" />
      <line x1="4.93" y1="19.07" x2="9.17" y2="14.83" /><line x1="14.83" y1="9.17" x2="19.07" y2="4.93" />
    </svg>
  );
}
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      // Fetch role from profiles table to determine dashboard
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .single();

      if (profile?.role === "carrier") {
        router.push("/dashboard/carrier");
      } else {
        router.push("/dashboard/3pl");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(type: "broker" | "carrier") {
    setEmail(type === "broker" ? "broker@test.com" : "carrier@test.com");
    setPassword("demo1234");
    setError(null);
  }

  return (
    <div className="flex min-h-screen bg-[#f9fafb] font-sans">
      {/* Left panel — branding */}
      <div className="hidden w-[480px] shrink-0 flex-col justify-between bg-gradient-to-br from-[#1d4ed8] to-[#2563eb] p-12 lg:flex">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
            <SpokeIcon size={20} className="text-white" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">Spoke</span>
        </div>

        {/* Hero copy */}
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5">
            <Sparkles size={14} className="text-white/80" />
            <span className="text-sm font-medium text-white/90">
              Freight Matching Platform
            </span>
          </div>
          <h1 className="mb-4 text-4xl font-bold leading-tight text-white">
            Smarter freight matching starts here.
          </h1>
          <p className="text-base leading-relaxed text-white/75">
            Spoke connects vetted carriers with trusted 3PLs — with
            network-wide pricing data built from real transactions
            across every lane.
          </p>
        </div>

        {/* Feature callouts */}
        <div className="space-y-3">
          {[
            "Live market rate estimates on every lane",
            "Real-time carrier availability from fleet tools",
            "Invite-only network of vetted partners",
          ].map((text) => (
            <div key={text} className="flex items-center gap-3">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20">
                <div className="h-1.5 w-1.5 rounded-full bg-white" />
              </div>
              <span className="text-sm text-white/80">{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#3b82f6] to-[#1d4ed8]">
              <SpokeIcon size={17} className="text-white" />
            </div>
            <span className="text-xl font-bold text-[#111827]">Spoke</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#111827]">Welcome back</h2>
            <p className="mt-1 text-sm text-[#6b7280]">
              Sign in to your Spoke account
            </p>
          </div>

          {/* Demo credential quick-fill buttons */}
          <div className="mb-6 rounded-xl border border-[#dbeafe] bg-[#eff6ff] p-4">
            <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-[#2563eb]">
              Demo access
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fillDemo("broker")}
                className="flex-1 rounded-lg border border-[#dbeafe] bg-white px-3 py-2 text-xs font-medium text-[#374151] hover:border-[#3b82f6] hover:text-[#2563eb] transition-colors"
              >
                3PL / Broker view
              </button>
              <button
                type="button"
                onClick={() => fillDemo("carrier")}
                className="flex-1 rounded-lg border border-[#dbeafe] bg-white px-3 py-2 text-xs font-medium text-[#374151] hover:border-[#3b82f6] hover:text-[#2563eb] transition-colors"
              >
                Carrier view
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-[#374151]"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full rounded-lg border border-[#d1d5db] bg-white px-3.5 py-2.5 text-sm text-[#111827] placeholder-[#9ca3af] outline-none transition-colors focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/20"
              />
            </div>

            {/* Password */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-[#374151]"
                >
                  Password
                </label>
                <button
                  type="button"
                  className="text-xs font-medium text-[#3b82f6] hover:text-[#2563eb] transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-[#d1d5db] bg-white px-3.5 py-2.5 pr-10 text-sm text-[#111827] placeholder-[#9ca3af] outline-none transition-colors focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#6b7280] transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="rounded-lg border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm text-[#dc2626]">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#3b82f6] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#2563eb] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                  Signing in…
                </>
              ) : (
                <>
                  Sign in <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Magic link option */}
          <div className="mt-4 text-center">
            <button
              type="button"
              className="text-sm text-[#6b7280] hover:text-[#374151] transition-colors"
            >
              {/* TODO: Wire Supabase magic link: supabase.auth.signInWithOtp({ email }) */}
              Sign in with magic link instead
            </button>
          </div>

          <p className="mt-6 text-center text-xs text-[#9ca3af]">
            Don&apos;t have an account?{" "}
            <span className="font-medium text-[#3b82f6]">
              Contact us for an invite
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
