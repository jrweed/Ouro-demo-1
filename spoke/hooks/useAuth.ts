"use client";

/**
 * useAuth — current user session hook
 *
 * Demo mode: reads from localStorage (set by the demo Supabase client stub).
 *
 * TODO: Replace with real Supabase auth when ready:
 * import { createClient } from "@/lib/supabase/client";
 * const supabase = createClient();
 * const { data: { user } } = await supabase.auth.getUser();
 * // Then fetch profile from `profiles` table for role, company name, etc.
 */

import { useState, useEffect } from "react";
import { DemoUser } from "@/lib/supabase/demo-users";

interface AuthState {
  user: DemoUser | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  useEffect(() => {
    const stored = localStorage.getItem("ch_demo_user");
    if (stored) {
      try {
        setState({ user: JSON.parse(stored), loading: false });
      } catch {
        setState({ user: null, loading: false });
      }
    } else {
      setState({ user: null, loading: false });
    }
  }, []);

  return state;
}
