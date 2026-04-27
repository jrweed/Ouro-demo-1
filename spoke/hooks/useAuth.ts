"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/utils/constants";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  companyName: string;
  companyCity: string;
  companyState: string;
  contactName: string;
  mcNumber?: string;
  initials: string;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setState({ user: null, loading: false });
        return;
      }

      // Fetch profile data (role, company info)
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!profile) {
        setState({ user: null, loading: false });
        return;
      }

      const contactName = profile.contact_name || user.email?.split("@")[0] || "";
      const initials = contactName
        .split(" ")
        .map((w: string) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

      setState({
        user: {
          id: user.id,
          email: user.email || "",
          role: profile.role as UserRole,
          companyName: profile.company_name || "",
          companyCity: profile.city || "",
          companyState: profile.state || "",
          contactName,
          mcNumber: profile.mc_number,
          initials,
        },
        loading: false,
      });
    }

    loadUser();
  }, []);

  return state;
}
