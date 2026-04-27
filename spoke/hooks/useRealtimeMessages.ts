"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { syncMessagesFromSupabase, syncConversationsFromSupabase } from "@/lib/supabase/sync";
import { getMessages, getConversations, type Message, type Conversation } from "@/lib/conversations";

/**
 * Hook that:
 * 1. Fetches messages from Supabase when convId changes (replaces sessionStorage-only reads)
 * 2. Subscribes to Supabase Realtime for live message + conversation updates
 * 3. Returns current messages and conversations, auto-updating on changes
 */
export function useRealtimeMessages(activeConvId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [convs, setConvs] = useState<Conversation[]>([]);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  const refreshConvs = useCallback(async () => {
    await syncConversationsFromSupabase();
    const stored = getConversations().sort(
      (a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
    );
    setConvs(stored);
    return stored;
  }, []);

  const refreshMessages = useCallback(async (convId: string) => {
    await syncMessagesFromSupabase(convId);
    setMessages(getMessages(convId));
  }, []);

  // Fetch messages from Supabase when active conversation changes
  useEffect(() => {
    if (!activeConvId) return;
    refreshMessages(activeConvId);
  }, [activeConvId, refreshMessages]);

  // Subscribe to Supabase Realtime
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("chat-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          if (activeConvId && row.conversation_id === activeConvId) {
            // New message in current conversation — refresh from Supabase
            refreshMessages(activeConvId);
          }
          // Also refresh conversation list (last_message, unread counts)
          refreshConvs();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => {
          refreshConvs();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConvId, refreshMessages, refreshConvs]);

  // Initial conversation load
  useEffect(() => {
    refreshConvs();
  }, [refreshConvs]);

  return { messages, setMessages, convs, setConvs, refreshConvs, refreshMessages };
}
