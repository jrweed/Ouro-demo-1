"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Truck, ChevronDown, LogOut } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { NotificationDropdown } from "./NotificationDropdown";
import { UserRole } from "@/lib/utils/constants";

interface TopBarProps {
  role: UserRole;
  companyName: string;
  companyCity?: string;
  companyState?: string;
  mcNumber?: string; // carriers only
  initials: string;
}

export function TopBar({
  role,
  companyName,
  companyCity,
  companyState,
  mcNumber,
  initials,
}: TopBarProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const subtitle =
    role === "carrier" && mcNumber
      ? `Carrier · ${mcNumber}`
      : role === "3pl"
      ? `3PL · ${companyCity ?? ""}${companyState ? `, ${companyState}` : ""}`
      : "Admin";

  function handleSignOut() {
    // TODO: Replace with Supabase signOut when wiring real auth:
    // await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-[#e5e7eb] bg-white px-6">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#3b82f6] to-[#1d4ed8]">
          <Truck size={17} className="text-white" />
        </div>
        <span className="text-[18px] font-bold tracking-tight text-[#111827]">
          ColdHaul
        </span>
      </Link>

      {/* Right side */}
      <div className="flex items-center gap-3">
        <NotificationDropdown />

        {/* User avatar dropdown */}
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 hover:bg-[#f3f4f6] transition-colors"
          >
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-semibold text-white ${
                role === "carrier"
                  ? "bg-gradient-to-br from-[#f0fdf4] to-[#22c55e]"
                  : "bg-gradient-to-br from-[#dbeafe] to-[#3b82f6]"
              }`}
            >
              {initials}
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-[#1f2937] leading-tight">
                {companyName}
              </p>
              <p className="text-[11px] text-[#6b7280] leading-tight">{subtitle}</p>
            </div>
            <ChevronDown size={14} className="text-[#9ca3af]" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-12 z-50 w-48 overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-lg">
              <Link
                href="/dashboard/settings"
                className="block px-4 py-2.5 text-sm text-[#374151] hover:bg-[#f9fafb] transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                Settings
              </Link>
              <div className="border-t border-[#f3f4f6]" />
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-[#ef4444] hover:bg-[#fef2f2] transition-colors"
              >
                <LogOut size={14} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
