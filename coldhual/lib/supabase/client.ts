/**
 * Supabase Browser Client
 *
 * TODO: Wire up real Supabase auth when ready:
 * 1. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local
 * 2. Uncomment the createBrowserClient import and export below
 * 3. Remove the mock client
 *
 * import { createBrowserClient } from "@supabase/ssr";
 *
 * export function createClient() {
 *   return createBrowserClient(
 *     process.env.NEXT_PUBLIC_SUPABASE_URL!,
 *     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
 *   );
 * }
 */

// ─── DEMO STUB — remove when wiring real Supabase ───────────────────────────
// This mock mirrors the Supabase client interface used in this app
// so switching to real auth requires only un-commenting above.

import { DEMO_USERS } from "./demo-users";

export function createClient() {
  return {
    auth: {
      signInWithPassword: async ({
        email,
        password,
      }: {
        email: string;
        password: string;
      }) => {
        const user = DEMO_USERS.find(
          (u) => u.email === email && u.password === password
        );
        if (!user) {
          return { data: null, error: { message: "Invalid email or password" } };
        }
        // Persist demo session to localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem("ch_demo_user", JSON.stringify(user));
        }
        return { data: { user }, error: null };
      },

      signOut: async () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem("ch_demo_user");
        }
        return { error: null };
      },

      getUser: async () => {
        if (typeof window === "undefined") return { data: { user: null }, error: null };
        const stored = localStorage.getItem("ch_demo_user");
        if (!stored) return { data: { user: null }, error: null };
        return { data: { user: JSON.parse(stored) }, error: null };
      },
    },
  };
}
