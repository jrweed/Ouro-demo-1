"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Send,
  DollarSign,
  CheckCircle2,
  XCircle,
  RefreshCw,
  MessageSquare,
  ChevronRight,
  ChevronDown,
  Package,
  X,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeMessages } from "@/hooks/useRealtimeMessages";
import {
  getConversations,
  getMessages,
  ensureConversation,
  addMessage,
  sendOffer,
  respondToOffer,
  markConversationRead,
  type Conversation,
  type Message,
} from "@/lib/conversations";
import { createBooking } from "@/lib/bookings";
import { addNotification } from "@/lib/notifications";

// ─── Load type (mirrors ch_loads) ────────────────────────────────────────────

interface StoredLoad {
  id: string;
  origin: string;
  destination: string;
  pickupDate: string;
  commodity: string;
  status: "active" | "carriers_notified" | "booked";
  pricingRateMin?: number;
  pricingRateMax?: number;
  notifiedCarriers?: { id: string; carrierName: string; quoteStatus: string }[];
}

function getStoredLoads(): StoredLoad[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(sessionStorage.getItem("ch_loads") || "[]"); }
  catch { return []; }
}

/** Loads relevant to this conversation. */
function getRelevantLoads(conv: Conversation, allLoads: StoredLoad[]): StoredLoad[] {
  // Show loads where this carrier was notified, or all non-booked loads
  const notified = allLoads.filter((l) =>
    l.notifiedCarriers?.some((c) => c.id === conv.carrierId)
  );
  if (notified.length > 0) return notified;
  return allLoads.filter((l) => l.status !== "booked");
}

// ─── Demo seed (shared with 3PL inbox) ───────────────────────────────────────

function seedDemoConversations() {
  const id1 = "conv-demo-load-1-carrier-1";
  const id2 = "conv-demo-load-1-carrier-2";

  ensureConversation({
    loadId: "demo-load-1",
    carrierId: "carrier-1",
    carrierName: "Coastal Freight LLC",
    driverName: "James Tanner",
    truckNum: "CR-204",
    origin: "Charleston, SC",
    destination: "Atlanta, GA",
  });
  ensureConversation({
    loadId: "demo-load-1",
    carrierId: "carrier-2",
    carrierName: "Blue Ridge Cold",
    driverName: "Maria Santos",
    truckNum: "BR-118",
    origin: "Charleston, SC",
    destination: "Atlanta, GA",
  });

  if (getMessages(id1).length === 0) {
    const now = Date.now();
    const rawMsgs: Omit<Message, "id" | "timestamp">[] = [
      { sender: "carrier", body: "Hi, I saw the load posting. I'm 22 miles from your pickup — can do it." },
      { sender: "3pl",     body: "Great, what rate are you thinking for the Charleston → Atlanta run?" },
    ];
    rawMsgs.forEach((m, i) => {
      const msg: Message = { ...m, id: `demo-msg-${i}`, timestamp: new Date(now - (rawMsgs.length - i) * 15 * 60_000).toISOString() };
      const existing = getMessages(id1);
      sessionStorage.setItem(`ch_msgs_${id1}`, JSON.stringify([...existing, msg]));
    });
    sendOffer(id1, 1_850, "carrier", { loadId: "demo-load-1", origin: "Charleston, SC", destination: "Atlanta, GA" });

    const msg2: Message = { id: "demo-msg-c2-0", sender: "carrier", body: "Interested in the load. What's your target rate?", timestamp: new Date(now - 40 * 60_000).toISOString() };
    sessionStorage.setItem(`ch_msgs_${id2}`, JSON.stringify([msg2]));
    const convs = getConversations();
    sessionStorage.setItem("ch_conversations", JSON.stringify(
      convs.map((c) =>
        c.id === id2 ? { ...c, lastMessage: msg2.body, lastActivity: msg2.timestamp, unreadBroker: 1 }
        : c.id === id1 ? { ...c, unreadBroker: 0, unreadCarrier: 0 }
        : c
      )
    ));
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(isoString: string) {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const LOAD_STATUS_COLOR: Record<string, { color: string; dot: string }> = {
  active:            { color: "#2563eb", dot: "#3b82f6" },
  carriers_notified: { color: "#d97706", dot: "#f59e0b" },
  booked:            { color: "#16a34a", dot: "#22c55e" },
};

// ─── Relevant loads banner (mirrors broker view) ─────────────────────────────

function RelevantLoadsBanner({
  conv,
  allLoads,
}: {
  conv: Conversation;
  allLoads: StoredLoad[];
}) {
  const relevant = getRelevantLoads(conv, allLoads);
  if (relevant.length === 0) return null;

  return (
    <div className="border-b border-[#e5e7eb] bg-[#f9fafb] px-5 py-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#9ca3af]">
        Relevant Loads ({relevant.length})
      </p>
      <div className="flex flex-wrap gap-2">
        {relevant.map((load) => {
          const sc = LOAD_STATUS_COLOR[load.status] ?? LOAD_STATUS_COLOR.active;
          return (
            <div
              key={load.id}
              className="flex items-center gap-2 rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-[12px]"
            >
              <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: sc.dot }} />
              <span className="font-medium text-[#111827] truncate max-w-[120px]">{load.origin}</span>
              <ArrowRight size={10} className="shrink-0 text-[#9ca3af]" />
              <span className="font-medium text-[#111827] truncate max-w-[120px]">{load.destination}</span>
              {load.pickupDate && (
                <span className="text-[#9ca3af]">· {formatDate(load.pickupDate)}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Offer banner (carrier perspective) ──────────────────────────────────────

function OfferBanner({
  conv,
  onAccept,
  onDecline,
  onCounter,
}: {
  conv: Conversation;
  onAccept: () => void;
  onDecline: () => void;
  onCounter: (amount: number) => void;
}) {
  const [showCounter, setShowCounter] = useState(false);
  const [counterVal, setCounterVal] = useState("");

  if (!conv.offer) return null;
  const { offer } = conv;
  const isResolved = offer.status === "accepted" || offer.status === "declined";
  // Carrier can respond when broker sent the offer
  const canRespond = !isResolved && offer.from === "3pl";

  if (isResolved) {
    const content = (
      <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium ${
        offer.status === "accepted"
          ? "border-[#bbf7d0] bg-[#f0fdf4] text-[#16a34a] hover:bg-[#dcfce7] transition-colors"
          : "border-[#fecaca] bg-[#fef2f2] text-[#dc2626]"
      }`}>
        {offer.status === "accepted" ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
        <div className="flex-1">
          <span>{offer.status === "accepted" ? `Offer accepted · $${offer.amount.toLocaleString()}` : "Offer declined"}</span>
          {offer.loadOrigin && (
            <span className="ml-2 text-[12px] opacity-70">
              {offer.loadOrigin} → {offer.loadDestination}
            </span>
          )}
        </div>
        {offer.status === "accepted" && <ChevronRight size={16} className="shrink-0 opacity-50" />}
      </div>
    );
    if (offer.status === "accepted") {
      return <Link href="/dashboard/carrier/loads">{content}</Link>;
    }
    return content;
  }

  return (
    <div className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#16a34a]">
            {offer.from === "3pl" ? "Broker offer" : "Your offer — awaiting response"}
          </p>
          <p className="mt-0.5 text-[22px] font-bold tracking-tight text-[#111827]">
            ${offer.amount.toLocaleString()}
          </p>
          {offer.loadOrigin && (
            <p className="flex items-center gap-1 text-[12px] text-[#6b7280]">
              <Package size={11} />
              {offer.loadOrigin} <ArrowRight size={10} /> {offer.loadDestination}
            </p>
          )}
        </div>
        {canRespond && !showCounter && (
          <div className="flex items-center gap-2">
            <button onClick={onAccept} className="flex items-center gap-1.5 rounded-lg bg-[#16a34a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#15803d] transition-colors">
              <CheckCircle2 size={14} /> Accept
            </button>
            <button onClick={() => setShowCounter(true)} className="flex items-center gap-1.5 rounded-lg border border-[#16a34a] bg-white px-4 py-2 text-sm font-semibold text-[#15803d] hover:bg-[#f0fdf4] transition-colors">
              <RefreshCw size={14} /> Counter
            </button>
            <button onClick={onDecline} className="flex items-center gap-1.5 rounded-lg border border-[#fecaca] bg-white px-4 py-2 text-sm font-semibold text-[#dc2626] hover:bg-[#fef2f2] transition-colors">
              <XCircle size={14} /> Decline
            </button>
          </div>
        )}
        {!canRespond && !isResolved && !showCounter && (
          <span className="text-[12px] text-[#6b7280]">Awaiting broker response</span>
        )}
      </div>

      {showCounter && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-[13px] font-semibold text-[#374151]">$</span>
          <input
            type="number" min="0" placeholder="Your counter amount"
            value={counterVal}
            onChange={(e) => setCounterVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const v = parseFloat(counterVal);
                if (v > 0) { onCounter(v); setShowCounter(false); setCounterVal(""); }
              }
            }}
            autoFocus
            className="flex-1 rounded-lg border border-[#16a34a] bg-white px-3 py-2 text-[13px] font-semibold text-[#111827] placeholder:font-normal placeholder:text-[#9ca3af] outline-none"
          />
          <button
            onClick={() => {
              const v = parseFloat(counterVal);
              if (v > 0) { onCounter(v); setShowCounter(false); setCounterVal(""); }
            }}
            className="rounded-lg bg-[#16a34a] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#15803d] transition-colors"
          >
            Send Counter
          </button>
          <button onClick={() => { setShowCounter(false); setCounterVal(""); }} className="rounded-lg p-2 text-[#9ca3af] hover:text-[#374151] transition-colors">
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Message bubble (carrier perspective: carrier = right/blue) ──────────────

function MessageBubble({ msg }: { msg: Message }) {
  const isMe = msg.sender === "carrier"; // carrier is "you"

  if (msg.offerEvent) {
    const { action, amount, previousAmount } = msg.offerEvent;
    let text = "";
    let color = "text-[#6b7280]";
    if (action === "sent") {
      text = `${isMe ? "You" : "Broker"} sent an offer · $${amount.toLocaleString()}`;
      color = "text-[#3b82f6]";
    } else if (action === "countered") {
      text = `${isMe ? "You" : "Broker"} countered $${previousAmount?.toLocaleString()} → $${amount.toLocaleString()}`;
      color = "text-[#d97706]";
    } else if (action === "accepted") {
      text = msg.body || `Offer accepted · $${amount.toLocaleString()}`;
      color = "text-[#16a34a]";
    } else if (action === "declined") {
      text = "Offer declined";
      color = "text-[#dc2626]";
    }
    const isAccepted = action === "accepted";
    return (
      <div className="flex items-center gap-3 py-1">
        <div className="h-px flex-1 bg-[#e5e7eb]" />
        {isAccepted ? (
          <Link
            href="/dashboard/carrier/loads"
            className={`shrink-0 text-[12px] font-medium ${color} hover:underline cursor-pointer`}
          >
            {text} →
          </Link>
        ) : (
          <span className={`shrink-0 text-[12px] font-medium ${color}`}>{text}</span>
        )}
        <div className="h-px flex-1 bg-[#e5e7eb]" />
      </div>
    );
  }

  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[72%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed ${
        isMe
          ? "rounded-br-sm bg-[#3b82f6] text-white"
          : "rounded-bl-sm bg-[#f3f4f6] text-[#111827]"
      }`}>
        {msg.body}
        <p className={`mt-1 text-[11px] ${isMe ? "text-[#bfdbfe]" : "text-[#9ca3af]"}`}>
          {timeAgo(msg.timestamp)}
        </p>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function CarrierInboxPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [allLoads, setAllLoads] = useState<StoredLoad[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [showQuoteInput, setShowQuoteInput] = useState(false);
  const [quoteAmount, setQuoteAmount] = useState("");
  const [selectedLoadId, setSelectedLoadId] = useState<string>("");
  const { messages, setMessages, convs, refreshConvs, refreshMessages } = useRealtimeMessages(activeConvId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (!loading && user && user.role !== "carrier") router.push("/dashboard/3pl");
  }, [user, loading, router]);

  useEffect(() => {
    if (getConversations().length === 0) seedDemoConversations();
    refreshConvs();
    setAllLoads(getStoredLoads());
  }, []);

  // Read conv from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const convId = params.get("conv");
    if (convId) setActiveConvId(convId);
  }, []);

  // Auto-select first conv if none (prefer active negotiations over completed)
  useEffect(() => {
    if (!activeConvId && convs.length > 0) {
      const active = convs.find((c) => !c.offer || c.offer.status !== "accepted");
      setActiveConvId(active?.id ?? convs[0].id);
    }
  }, [convs, activeConvId]);

  // When active conv changes, default the load selector to the conv's own load
  useEffect(() => {
    if (!activeConvId) return;
    const conv = getConversations().find((c) => c.id === activeConvId);
    if (conv && !selectedLoadId) setSelectedLoadId(conv.loadId);
  }, [activeConvId]);

  useEffect(() => {
    if (!activeConvId) return;
    markConversationRead(activeConvId, "carrier");
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
  }, [activeConvId, messages]);

  function selectConv(id: string) {
    setActiveConvId(id);
    setShowQuoteInput(false);
    setMessageText("");
    setQuoteAmount("");
    // Update load selector to this conversation's load
    const conv = getConversations().find((c) => c.id === id);
    if (conv) setSelectedLoadId(conv.loadId);
    window.history.replaceState(null, "", `/dashboard/carrier/inbox?conv=${id}`);
  }

  function handleSendMessage() {
    if (!activeConvId || !messageText.trim()) return;
    addMessage(activeConvId, { sender: "carrier", body: messageText.trim() });
    setMessageText("");
    if (activeConvId) refreshMessages(activeConvId);
    refreshConvs();
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
  }

  function handleSendQuote() {
    const amount = parseFloat(quoteAmount.replace(/[^0-9.]/g, ""));
    if (!activeConvId || !amount || amount <= 0) return;

    const conv = getConversations().find((c) => c.id === activeConvId);
    const chosenLoad = allLoads.find((l) => l.id === selectedLoadId);
    const loadCtx = chosenLoad
      ? { loadId: chosenLoad.id, origin: chosenLoad.origin, destination: chosenLoad.destination }
      : conv
      ? { loadId: conv.loadId, origin: conv.origin, destination: conv.destination }
      : undefined;

    sendOffer(activeConvId, amount, "carrier", loadCtx);
    setShowQuoteInput(false);
    setQuoteAmount("");
    if (activeConvId) refreshMessages(activeConvId);
    refreshConvs();

    if (conv) {
      addNotification({
        type: "quote_received",
        title: `Quote received from ${conv.carrierName}`,
        body: `$${amount.toLocaleString()} · ${loadCtx?.origin ?? conv.origin} → ${loadCtx?.destination ?? conv.destination}`,
        role: "3pl",
        href: `/dashboard/3pl/quotes?conv=${activeConvId}`,
        metadata: { carrierId: conv.carrierId, carrierName: conv.carrierName, quotedRate: amount },
      });
    }
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
  }

  function handleAcceptOffer() {
    if (!activeConvId) return;

    // Capture conversation and offer BEFORE mutating state
    const conv = getConversations().find((c) => c.id === activeConvId);
    if (!conv?.offer) return;
    const offerAmount = conv.offer.amount;
    const convId = activeConvId;
    // Use the offer's loadId (set when broker/carrier selects a specific load), fall back to conversation loadId
    const effectiveLoadId = conv.offer.loadId || conv.loadId;
    const effectiveOrigin = conv.offer.loadOrigin || conv.origin;
    const effectiveDestination = conv.offer.loadDestination || conv.destination;

    // Accept the offer
    respondToOffer(convId, "accepted", undefined, "carrier");

    // Create booking with captured data BEFORE async refreshes
    let loadExtra: { pickupDate?: string; commodity?: string; temperature?: string; equipmentType?: string; distanceMiles?: number } = {};
    try {
      const loads = JSON.parse(sessionStorage.getItem("ch_loads") || "[]");
      const load = loads.find((l: { id: string }) => l.id === effectiveLoadId);
      if (load) {
        loadExtra = {
          pickupDate: load.pickupDate,
          commodity: load.commodity,
          temperature: load.temperature,
          equipmentType: load.equipmentType,
          distanceMiles: load.distanceMiles,
        };
      }
    } catch { /* ignore */ }

    createBooking({
      convId,
      loadId: effectiveLoadId,
      carrierId: conv.carrierId,
      carrierName: conv.carrierName,
      driverName: conv.driverName || "—",
      truckNum: conv.truckNum || "TBD",
      origin: effectiveOrigin,
      destination: effectiveDestination,
      acceptedRate: offerAmount,
      ...loadExtra,
    });

    // Refresh UI AFTER booking is created (these are async)
    refreshMessages(convId);
    refreshConvs();

    addNotification({
      type: "offer_accepted",
      title: `Offer accepted · ${conv.carrierName}`,
      body: `$${offerAmount.toLocaleString()} · ${effectiveOrigin} → ${effectiveDestination}`,
      role: "3pl",
      href: `/dashboard/3pl/quotes?conv=${convId}`,
      metadata: { carrierId: conv.carrierId, carrierName: conv.carrierName, offeredRate: offerAmount },
    });
    addNotification({
      type: "offer_accepted",
      title: `Booking confirmed`,
      body: `$${offerAmount.toLocaleString()} · ${effectiveOrigin} → ${effectiveDestination}`,
      role: "carrier",
      href: `/dashboard/carrier/loads`,
    });
  }

  function handleDeclineOffer() {
    if (!activeConvId) return;
    const conv = getConversations().find((c) => c.id === activeConvId);
    respondToOffer(activeConvId, "declined", undefined, "carrier");
    if (activeConvId) refreshMessages(activeConvId);
    refreshConvs();

    if (conv) {
      addNotification({
        type: "offer_declined",
        title: `Offer declined`,
        body: `${conv.origin} → ${conv.destination}`,
        role: "3pl",
        href: `/dashboard/3pl/quotes?conv=${activeConvId}`,
        metadata: { carrierId: conv.carrierId, carrierName: conv.carrierName },
      });
    }
  }

  function handleCounterOffer(amount: number) {
    if (!activeConvId) return;
    respondToOffer(activeConvId, "countered", amount, "carrier");
    if (activeConvId) refreshMessages(activeConvId);
    refreshConvs();
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
  }

  const activeConv = convs.find((c) => c.id === activeConvId) ?? null;
  const totalUnread = convs.reduce((s, c) => s + (c.unreadCarrier ?? 0), 0);
  const relevantLoads = activeConv ? getRelevantLoads(activeConv, allLoads) : [];

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f9fafb]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#3b82f6] border-t-transparent" />
      </div>
    );
  }

  return (
    <AppShell role="carrier" companyName={user.companyName} companyCity={user.companyCity} companyState={user.companyState} mcNumber={user.mcNumber} initials={user.initials}>
      <Link href="/dashboard/carrier" className="mb-5 inline-flex items-center gap-1.5 text-sm text-[#6b7280] hover:text-[#374151] transition-colors">
        <ArrowLeft size={15} /> Back to Dashboard
      </Link>

      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[#111827]">Messages</h1>
          <p className="mt-1 text-sm text-[#6b7280]">Manage conversations and offers with brokers</p>
        </div>
        {totalUnread > 0 && (
          <span className="flex items-center gap-1.5 rounded-full bg-[#ef4444] px-3 py-1 text-[12px] font-semibold text-white">
            {totalUnread} unread
          </span>
        )}
      </div>

      {/* Split layout */}
      <div className="flex gap-0 overflow-hidden rounded-xl border border-[#e5e7eb] bg-white" style={{ height: "calc(100vh - 240px)", minHeight: 520 }}>

        {/* Left: conversation list */}
        <div className="flex w-80 shrink-0 flex-col border-r border-[#e5e7eb]">
          <div className="border-b border-[#f3f4f6] px-4 py-3">
            <p className="text-[13px] font-semibold text-[#374151]">
              {convs.length} conversation{convs.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {convs.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
                <MessageSquare size={28} className="mb-2 text-[#d1d5db]" />
                <p className="text-sm font-medium text-[#374151]">No conversations yet</p>
                <p className="mt-1 text-xs text-[#9ca3af]">Brokers will message you here about loads.</p>
              </div>
            ) : (
              [...convs].sort((a, b) => {
                const aCompleted = a.offer?.status === "accepted" ? 1 : 0;
                const bCompleted = b.offer?.status === "accepted" ? 1 : 0;
                if (aCompleted !== bCompleted) return aCompleted - bCompleted;
                return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
              }).map((conv) => {
                const isActive = conv.id === activeConvId;
                const unread = conv.unreadCarrier ?? 0;
                const offerBadge =
                  conv.offer?.status === "accepted" ? { label: "Booked", color: "#16a34a", bg: "#f0fdf4" }
                  : conv.offer?.status === "declined" ? { label: "Declined", color: "#dc2626", bg: "#fef2f2" }
                  : conv.offer?.from === "3pl" && conv.offer.status === "pending" ? { label: "Offer received", color: "#d97706", bg: "#fffbeb" }
                  : conv.offer?.from === "carrier" && conv.offer.status === "pending" ? { label: "Quote sent", color: "#2563eb", bg: "#eff6ff" }
                  : null;
                return (
                  <button key={conv.id} onClick={() => selectConv(conv.id)}
                    className={`w-full border-b border-[#f3f4f6] px-4 py-3.5 text-left transition-colors last:border-0 ${isActive ? "bg-[#eff6ff]" : "hover:bg-[#f9fafb]"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className={`truncate text-[13px] ${isActive ? "font-semibold text-[#1d4ed8]" : "font-semibold text-[#111827]"}`}>
                        {conv.carrierName}
                      </p>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {unread > 0 && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#3b82f6] px-1.5 text-[10px] font-bold text-white">{unread}</span>
                        )}
                        <span className="text-[11px] text-[#9ca3af]">{timeAgo(conv.lastActivity)}</span>
                      </div>
                    </div>
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-[#9ca3af]">
                      <span className="truncate">{conv.origin}</span>
                      <ArrowRight size={10} className="shrink-0" />
                      <span className="truncate">{conv.destination}</span>
                    </p>
                    {conv.lastMessage && <p className="mt-1 truncate text-[12px] text-[#6b7280]">{conv.lastMessage}</p>}
                    {offerBadge && (
                      <span className="mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: offerBadge.bg, color: offerBadge.color }}>
                        {offerBadge.label}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: active conversation */}
        {activeConv ? (
          <div className="flex flex-1 flex-col min-w-0">

            {/* Header (mirrors broker: shows carrier name, truck/driver, route, link) */}
            <div className="flex items-center justify-between border-b border-[#f3f4f6] px-5 py-3.5">
              <div>
                <p className="text-[15px] font-semibold text-[#111827]">
                  {activeConv.origin} → {activeConv.destination}
                </p>
                <p className="flex items-center gap-1 text-[12px] text-[#6b7280]">
                  Truck {activeConv.truckNum} · {activeConv.driverName}
                  <span className="mx-1 text-[#d1d5db]">·</span>
                  {activeConv.carrierName}
                </p>
              </div>
              <Link href="/dashboard/carrier/quote-requests" className="flex items-center gap-1 text-[12px] font-medium text-[#3b82f6] hover:text-[#2563eb] transition-colors">
                Quote Requests <ChevronRight size={13} />
              </Link>
            </div>

            {/* Relevant loads banner */}
            <RelevantLoadsBanner conv={activeConv} allLoads={allLoads} />

            {/* Offer banner */}
            {activeConv.offer && (
              <div className="border-b border-[#e5e7eb] px-5 py-3">
                <OfferBanner
                  conv={activeConv}
                  onAccept={handleAcceptOffer}
                  onDecline={handleDeclineOffer}
                  onCounter={handleCounterOffer}
                />
              </div>
            )}

            {/* Message thread */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Package size={28} className="mb-2 text-[#d1d5db]" />
                  <p className="text-sm text-[#9ca3af]">No messages yet — say something!</p>
                </div>
              ) : (
                messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quote input panel (mirrors broker offer input — with load selector) */}
            {showQuoteInput && (
              <div className="border-t border-[#e5e7eb] bg-[#eff6ff] px-5 py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[12px] font-semibold uppercase tracking-wider text-[#3b82f6]">Send a quote</p>
                  <button onClick={() => { setShowQuoteInput(false); setQuoteAmount(""); }} className="rounded p-1 text-[#9ca3af] hover:text-[#374151] transition-colors">
                    <X size={14} />
                  </button>
                </div>

                {/* Load selector */}
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-[#6b7280]">Which load is this quote for?</label>
                  <div className="relative">
                    <select
                      value={selectedLoadId}
                      onChange={(e) => setSelectedLoadId(e.target.value)}
                      className="w-full appearance-none rounded-lg border border-[#3b82f6] bg-white px-3 py-2 pr-8 text-[13px] font-medium text-[#111827] outline-none"
                    >
                      <option value="">— Select a load —</option>
                      {relevantLoads.length > 0 ? (
                        relevantLoads.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.origin} → {l.destination}
                            {l.pickupDate ? ` · ${formatDate(l.pickupDate)}` : ""}
                            {l.pricingRateMin && l.pricingRateMax ? ` · Market $${l.pricingRateMin.toLocaleString()}–$${l.pricingRateMax.toLocaleString()}` : ""}
                          </option>
                        ))
                      ) : (
                        <option value={activeConv.loadId}>
                          {activeConv.origin} → {activeConv.destination}
                        </option>
                      )}
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
                  </div>
                </div>

                {/* Amount + send */}
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-semibold text-[#374151]">$</span>
                  <input
                    type="number" min="0" placeholder="Your rate for this load"
                    value={quoteAmount}
                    onChange={(e) => setQuoteAmount(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendQuote()}
                    autoFocus
                    className="flex-1 rounded-lg border border-[#3b82f6] bg-white px-3 py-2 text-[14px] font-semibold text-[#111827] placeholder:font-normal placeholder:text-[#9ca3af] outline-none"
                  />
                  <button
                    onClick={handleSendQuote}
                    disabled={!quoteAmount || !selectedLoadId}
                    className="flex items-center gap-1.5 rounded-lg bg-[#3b82f6] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#2563eb] disabled:opacity-40 transition-colors"
                  >
                    <DollarSign size={13} /> Send Quote
                  </button>
                </div>
              </div>
            )}

            {/* Compose footer */}
            <div className="border-t border-[#e5e7eb] px-4 py-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setShowQuoteInput((v) => !v); setQuoteAmount(""); }}
                  title="Send a quote"
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-[13px] font-semibold transition-colors ${
                    showQuoteInput ? "border-[#3b82f6] bg-[#eff6ff] text-[#2563eb]" : "border-[#d1d5db] text-[#374151] hover:border-[#3b82f6] hover:text-[#2563eb]"
                  }`}
                >
                  <DollarSign size={14} /> Quote
                </button>
                <input
                  type="text" placeholder="Type a message…"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                  className="flex-1 rounded-lg border border-[#e5e7eb] bg-[#f9fafb] px-4 py-2 text-[14px] text-[#111827] placeholder:text-[#9ca3af] outline-none focus:border-[#3b82f6] focus:bg-white transition-colors"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!messageText.trim()}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[#3b82f6] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#2563eb] disabled:opacity-40 transition-colors"
                >
                  <Send size={14} /> Send
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <MessageSquare size={36} className="mb-3 text-[#d1d5db]" />
            <p className="text-sm font-medium text-[#374151]">Select a conversation</p>
            <p className="mt-1 text-xs text-[#9ca3af]">Choose a load negotiation from the list.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
