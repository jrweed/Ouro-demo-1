/**
 * Dashboard layout wrapper.
 *
 * TODO: When wiring real Supabase auth, add server-side route protection here:
 *
 * import { createClient } from "@/lib/supabase/server";
 * import { redirect } from "next/navigation";
 *
 * const supabase = await createClient();
 * const { data: { user } } = await supabase.auth.getUser();
 * if (!user) redirect("/login");
 *
 * Then fetch `profiles` row to get role, company name, etc. and pass as
 * props to AppShell.
 *
 * For now, auth state is read client-side from localStorage (demo mode).
 * Each dashboard page renders its own AppShell with the correct role/profile.
 */

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
