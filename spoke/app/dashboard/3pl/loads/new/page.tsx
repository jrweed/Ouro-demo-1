"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { InputLoadForm } from "@/components/loads/InputLoadForm";
import { useAuth } from "@/hooks/useAuth";

export default function InputLoadPage() {
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
      role="3pl"
      companyName={user.companyName}
      companyCity={user.companyCity}
      companyState={user.companyState}
      initials={user.initials}
    >
      <div className="mb-6">
        <h1 className="text-[26px] font-bold tracking-tight text-[#111827]">
          Input a Load
        </h1>
        <p className="mt-1 text-sm text-[#6b7280]">
          Fill in load details to get market rate estimates and find nearby carriers
        </p>
      </div>

      <InputLoadForm />
    </AppShell>
  );
}
