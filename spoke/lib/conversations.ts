/**
 * Conversation / messaging system — sessionStorage + Supabase write-through.
 *
 * All writes persist to both sessionStorage (instant local reads)
 * and Supabase (persistence across sessions).
 */

import {
  upsertConversation as dbUpsertConv,
  updateConversation as dbUpdateConv,
  insertMessage as dbInsertMsg,
  type DbConversation,
  type DbMessage,
} from "./supabase/db";

export interface Message {
  id: string;
  sender: "3pl" | "carrier";
  body: string;
  timestamp: string;
  /** Present on offer-event messages */
  offerEvent?: {
    action: "sent" | "accepted" | "declined" | "countered";
    amount: number;
    previousAmount?: number;
  };
}

export interface Offer {
  amount: number;
  from: "3pl" | "carrier";
  /** pending = awaiting response; accepted/declined = resolved */
  status: "pending" | "accepted" | "declined";
  timestamp: string;
  /** Which load this offer is for */
  loadId?: string;
  loadOrigin?: string;
  loadDestination?: string;
}

export interface Conversation {
  id: string; // `conv-${loadId}-${carrierId}`
  loadId: string;
  carrierId: string;
  carrierName: string;
  driverName: string;
  truckNum: string;
  origin: string;
  destination: string;
  offer: Offer | null;
  lastMessage: string;
  lastActivity: string; // ISO
  /** Unread message count for the 3PL broker */
  unreadBroker: number;
  /** Unread message count for the carrier */
  unreadCarrier: number;
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

const CONVS_KEY = "ch_conversations";

export function getConversations(): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(sessionStorage.getItem(CONVS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveConversations(convs: Conversation[]): void {
  sessionStorage.setItem(CONVS_KEY, JSON.stringify(convs));
}

function persistConvToSupabase(c: Conversation): void {
  const row: DbConversation = {
    id: c.id, loadId: c.loadId, carrierId: c.carrierId,
    carrierName: c.carrierName, driverName: c.driverName, truckNum: c.truckNum,
    origin: c.origin, destination: c.destination, offer: c.offer,
    lastMessage: c.lastMessage, lastActivity: c.lastActivity,
    unreadBroker: c.unreadBroker, unreadCarrier: c.unreadCarrier,
  };
  dbUpsertConv(row).catch(console.error);
}

export function getMessages(convId: string): Message[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(sessionStorage.getItem(`ch_msgs_${convId}`) || "[]");
  } catch {
    return [];
  }
}

function saveMessages(convId: string, msgs: Message[]): void {
  sessionStorage.setItem(`ch_msgs_${convId}`, JSON.stringify(msgs));
}

function persistMsgToSupabase(convId: string, m: Message): void {
  const row: DbMessage = {
    id: m.id, conversationId: convId, sender: m.sender,
    body: m.body, offerEvent: m.offerEvent, timestamp: m.timestamp,
  };
  dbInsertMsg(row).catch(console.error);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Creates the conversation if it doesn't exist yet; returns it either way. */
export function ensureConversation(data: {
  loadId: string;
  carrierId: string;
  carrierName: string;
  driverName: string;
  truckNum: string;
  origin: string;
  destination: string;
}): Conversation {
  const id = `conv-${data.loadId}-${data.carrierId}`;
  const existing = getConversations().find((c) => c.id === id);
  if (existing) return existing;

  const conv: Conversation = {
    ...data,
    id,
    offer: null,
    lastMessage: "",
    lastActivity: new Date().toISOString(),
    unreadBroker: 0,
    unreadCarrier: 0,
  };
  saveConversations([conv, ...getConversations()]);
  persistConvToSupabase(conv);
  return conv;
}

/** Returns all conversations for a given carrier ID.
 *  TODO: In production, filter server-side: WHERE carrier_id = auth.uid() */
export function getConversationsByCarrier(carrierId?: string): Conversation[] {
  const all = getConversations();
  // For the demo we have only one carrier so return all. With real auth, filter by carrierId.
  if (!carrierId) return all;
  return all.filter((c) => c.carrierId === carrierId || true); // always true in demo
}

/** Append a plain message and update the conversation's last-activity. */
export function addMessage(
  convId: string,
  msg: Omit<Message, "id" | "timestamp">
): Message {
  const newMsg: Message = {
    ...msg,
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
  };
  saveMessages(convId, [...getMessages(convId), newMsg]);
  persistMsgToSupabase(convId, newMsg);

  const convs = getConversations();
  const updatedConvs = convs.map((c) =>
    c.id === convId
      ? {
          ...c,
          lastMessage: msg.body,
          lastActivity: newMsg.timestamp,
          unreadBroker:
            msg.sender === "carrier" ? c.unreadBroker + 1 : c.unreadBroker,
          unreadCarrier:
            msg.sender === "3pl" ? (c.unreadCarrier ?? 0) + 1 : (c.unreadCarrier ?? 0),
        }
      : c
  );
  saveConversations(updatedConvs);
  const updatedConv = updatedConvs.find((c) => c.id === convId);
  if (updatedConv) persistConvToSupabase(updatedConv);
  return newMsg;
}

/** Send an offer from either side and add an offer-event message. */
export function sendOffer(
  convId: string,
  amount: number,
  from: "3pl" | "carrier",
  loadContext?: { loadId: string; origin: string; destination: string }
): void {
  const convs = getConversations();
  const updatedConvs = convs.map((c) =>
    c.id === convId
      ? {
          ...c,
          offer: {
            amount,
            from,
            status: "pending" as const,
            timestamp: new Date().toISOString(),
            loadId: loadContext?.loadId,
            loadOrigin: loadContext?.origin,
            loadDestination: loadContext?.destination,
          },
          lastMessage: `${from === "3pl" ? "Broker" : "Carrier"} offered $${amount.toLocaleString()}`,
          lastActivity: new Date().toISOString(),
        }
      : c
  );
  saveConversations(updatedConvs);
  const updatedConv = updatedConvs.find((c) => c.id === convId);
  if (updatedConv) persistConvToSupabase(updatedConv);
  addMessage(convId, {
    sender: from,
    body: `Offer: $${amount.toLocaleString()}`,
    offerEvent: { action: "sent", amount },
  });
}

/** Respond to the current pending offer — accept, decline, or counter.
 *  @param by  Which role is responding ("3pl" or "carrier"). */
export function respondToOffer(
  convId: string,
  action: "accepted" | "declined" | "countered",
  counterAmount?: number,
  by: "3pl" | "carrier" = "3pl"
): void {
  const convs = getConversations();
  const conv = convs.find((c) => c.id === convId);
  if (!conv?.offer) return;
  const prevAmount = conv.offer.amount;

  const updatedConvs = convs.map((c) => {
    if (c.id !== convId) return c;
    if (action === "countered" && counterAmount) {
      return {
        ...c,
        offer: {
          amount: counterAmount,
          from: by,
          status: "pending" as const,
          timestamp: new Date().toISOString(),
          loadId: c.offer?.loadId,
          loadOrigin: c.offer?.loadOrigin,
          loadDestination: c.offer?.loadDestination,
        },
        lastMessage: `Counter offer: $${counterAmount.toLocaleString()}`,
        lastActivity: new Date().toISOString(),
      };
    }
    return {
      ...c,
      offer: { ...c.offer!, status: action as "accepted" | "declined" },
      lastMessage:
        action === "accepted"
          ? `Offer accepted · $${prevAmount.toLocaleString()}`
          : "Offer declined",
      lastActivity: new Date().toISOString(),
    };
  });
  saveConversations(updatedConvs);
  const updatedConv = updatedConvs.find((c) => c.id === convId);
  if (updatedConv) persistConvToSupabase(updatedConv);

  if (action === "countered" && counterAmount) {
    addMessage(convId, {
      sender: by,
      body: `Counter offer: $${counterAmount.toLocaleString()}`,
      offerEvent: { action: "countered", amount: counterAmount, previousAmount: prevAmount },
    });
  } else {
    const loadRoute = conv.offer?.loadOrigin && conv.offer?.loadDestination
      ? ` · ${conv.offer.loadOrigin} → ${conv.offer.loadDestination}`
      : conv.origin && conv.destination
      ? ` · ${conv.origin} → ${conv.destination}`
      : "";
    addMessage(convId, {
      sender: by,
      body:
        action === "accepted"
          ? `Accepted offer of $${prevAmount.toLocaleString()}${loadRoute}`
          : "Declined offer",
      offerEvent: { action, amount: prevAmount },
    });
  }
}

/** Update the truck and driver associated with a conversation. */
export function updateConversationTruck(
  convId: string,
  truckNum: string,
  driverName: string
): void {
  saveConversations(
    getConversations().map((c) =>
      c.id === convId ? { ...c, truckNum, driverName } : c
    )
  );
  dbUpdateConv(convId, { truck_num: truckNum, driver_name: driverName }).catch(console.error);
}

/** Mark a conversation as read for the given role. */
export function markConversationRead(
  convId: string,
  role: "3pl" | "carrier" = "3pl"
): void {
  saveConversations(
    getConversations().map((c) =>
      c.id === convId
        ? {
            ...c,
            unreadBroker: role === "3pl" ? 0 : c.unreadBroker,
            unreadCarrier: role === "carrier" ? 0 : (c.unreadCarrier ?? 0),
          }
        : c
    )
  );
  const update = role === "3pl" ? { unread_broker: 0 } : { unread_carrier: 0 };
  dbUpdateConv(convId, update).catch(console.error);
}

/** Delete all conversations and their messages for a given load. */
export function deleteConversationsByLoadId(loadId: string): void {
  const convs = getConversations();
  const toDelete = convs.filter((c) => c.loadId === loadId);
  // Remove messages from sessionStorage
  toDelete.forEach((c) => {
    try { sessionStorage.removeItem(`ch_msgs_${c.id}`); } catch {}
  });
  // Remove conversations
  saveConversations(convs.filter((c) => c.loadId !== loadId));
}

export function getTotalUnread(role: "3pl" | "carrier" = "3pl"): number {
  return getConversations().reduce(
    (sum, c) =>
      sum + (role === "3pl" ? c.unreadBroker : (c.unreadCarrier ?? 0)),
    0
  );
}
