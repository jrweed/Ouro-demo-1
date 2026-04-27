"use client";

import { useEffect, useRef, useState, createContext, useContext } from "react";
import { syncAllFromSupabase } from "@/lib/supabase/sync";

const SyncContext = createContext(false);

/** True once Supabase → sessionStorage sync has completed. */
export function useSyncReady() {
  return useContext(SyncContext);
}

/**
 * Syncs Supabase data → sessionStorage once on mount.
 * Children render immediately but can use `useSyncReady()` to know when data is available.
 * A brief loading overlay is shown until sync completes.
 */
export function SyncProvider({ children }: { children: React.ReactNode }) {
  const didSync = useRef(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (didSync.current) return;
    didSync.current = true;
    syncAllFromSupabase()
      .catch(console.error)
      .finally(() => setReady(true));
  }, []);

  return (
    <SyncContext.Provider value={ready}>
      {!ready && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#f9fafb]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#3b82f6] border-t-transparent" />
        </div>
      )}
      {ready && children}
    </SyncContext.Provider>
  );
}
