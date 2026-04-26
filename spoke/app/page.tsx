import { redirect } from "next/navigation";

// Root route — redirect to login.
// TODO: When Supabase auth is wired, check session server-side and redirect
// directly to the appropriate dashboard if already authenticated:
//   const supabase = await createClient();
//   const { data: { user } } = await supabase.auth.getUser();
//   if (user) redirect(role === "carrier" ? "/dashboard/carrier" : "/dashboard/3pl");
export default function RootPage() {
  redirect("/login");
}
