/**
 * Supabase Server Client (for Server Components / Route Handlers)
 *
 * TODO: Wire up real Supabase server client when ready:
 * 1. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.local
 * 2. Uncomment the real implementation below
 * 3. Remove the stub
 *
 * import { createServerClient } from "@supabase/ssr";
 * import { cookies } from "next/headers";
 *
 * export async function createClient() {
 *   const cookieStore = await cookies();
 *   return createServerClient(
 *     process.env.NEXT_PUBLIC_SUPABASE_URL!,
 *     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
 *     {
 *       cookies: {
 *         getAll() { return cookieStore.getAll(); },
 *         setAll(cookiesToSet) {
 *           cookiesToSet.forEach(({ name, value, options }) =>
 *             cookieStore.set(name, value, options)
 *           );
 *         },
 *       },
 *     }
 *   );
 * }
 */

// ─── DEMO STUB ────────────────────────────────────────────────────────────────
// Returns a minimal server-side stub. Route protection middleware should be
// added here when wiring real Supabase (see middleware.ts).
export async function createClient() {
  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
    },
  };
}
