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
  Package,
  X,
  ChevronDown,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";
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
import { addNotification } from "@/lib/notifications";
import { createBooking } from "@/lib/bookings";

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

const LOAD_STATUS_COLOR: Record<string, { color: string; dot: string }> = {
  active:            { color: "#2563eb", dot: "#3b82f6" },
  carriers_notified: { color: "#d97706", dot: "#f59e0b" },
  booked:            { color: "#16a34a", dot: "#22c55e" },
};

function getStoredLoads(): StoredLoad[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(sessionStorage.getItem("ch_loads") || "[]"); }
  catch { return []; }
}

/** Loads relevant to a carrier: ones where they were notified, or all non-booked loads. */
function getRelevantLoads(conv: Conversation, allLoads: StoredLoad[]): StoredLoad[] {
  const notified = allLoads.filter((l) =>
    l.notifiedCarriers?.some((c) => c.id === conv.carrierId)
  );
  if (notified.length > 0) return notified;
  return allLoads.filter((l) => l.status !== "booked");
}

// ─── Demo seed data ───────────────────────────────────────────────────────────

function seedDemoConversations() {
  const id1 = "conv-demo-load-1-carrier-1";
  const id2 = "conv-demo-load-1-carrier-2";

  ensureConversation({
    loadId: "demo-load-1",
    carrierId: "carrier-1",
    carrierName: "Coastal Reefer LLC",
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

    const msg2: Message = { id: "demo-msg-c2-0", sender: "carrier", body: "Interested in the load. What's the target rate?", timestamp: new Date(now - 40 * 60_000).toISOString() };
    sessionStorage.setItem(`ch_msgs_${id2}`, JSON.stringify([msg2]));
    const convs = getConversations();
    sessionStorage.setItem("ch_conversations", JSON.stringify(
      convs.map((c) =>
        c.id === id2 ? { ...c, lastMessage: msg2.body, lastActivity: msg2.timestamp, unreadBroker: 1 }
        : c.id === id1 ? { ...c, unreadBroker: 1 }
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

// ─── Relevant loads banner ────────────────────────────────────────────────────

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
            <Link
              key={load.id}
              href={`/dashboard/3pl/loads/${load.id}`}
              className="flex items-center gap-2 rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-[12px] transition-colors hover:border-[#3b82f6] hover:bg-[#eff6ff]"
            >
              <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: sc.dot }} />
              <span className="font-medium text-[#111827] truncate max-w-[120px]">{load.origin}</span>
              <ArrowRight size={10} className="shrink-0 text-[#9ca3af]" />
              <span className="font-medium text-[#111827] truncate max-w-[120px]">{load.destination}</span>
              {load.pickupDate && (
                <span className="text-[#9ca3af]">· {formatDate(load.pickupDate)}</span>
              )}
              <ChevronRight size={11} className="shrink-0 text-[#d1d5db]" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ─── Offer banner ─────────────────────────────────────────────────────────────

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
  const fromCarrier = offer.from === "carrier";
  const canRespond = !isResolved && fromCarrier;

  if (isResolved) {
    return (
      <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium ${
        offer.status === "accepted" ? "border-[#bbf7d0] bg-[#f0fdf4] text-[#16a34a]" : "border-[#fecaca] bg-[#fef2f2] text-[#dc2626]"
      }`}>
        {offer.status === "accepted" ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
        <div>
          <span>{offer.status === "accepted" ? `Offer accepted · $${offer.amount.toLocaleString()}` : "Offer declined"}</span>
          {offer.loadOrigin && (
            <span className="ml-2 text-[12px] opacity-70">
              {offer.loadOrigin} → {offer.loadDestination}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#bfdbfe] bg-[#eff6ff] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#3b82f6]">
            {fromCarrier ? "Carrier offer" : "Your offer — awaiting response"}
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
            <button onClick={() => setShowCounter(true)} className="flex items-center gap-1.5 rounded-lg border border-[#3b82f6] bg-white px-4 py-2 text-sm font-semibold text-[#2563eb] hover:bg-[#eff6ff] transition-colors">
              <RefreshCw size={14} /> Counter
            </button>
            <button onClick={onDecline} className="flex items-center gap-1.5 rounded-lg border border-[#fecaca] bg-white px-4 py-2 text-sm font-semibold text-[#dc2626] hover:bg-[#fef2f2] transition-colors">
              <XCircle size={14} /> Decline
            </button>
          </div>
        )}
        {!canRespond && !showCounter && (
          <span className="text-[12px] text-[#6b7280]">Awaiting carrier response</span>
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
            className="flex-1 rounded-lg border border-[#3b82f6] bg-white px-3 py-2 text-[13px] font-semibold text-[#111827] placeholder:font-normal placeholder:text-[#9ca3af] outline-none"
          />
          <button
            onClick={() => {
              const v = parseFloat(counterVal);
              if (v > 0) { onCounter(v); setShowCounter(false); setCounterVal(""); }
            }}
            className="rounded-lg bg-[#3b82f6] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#2563eb] transition-colors"
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

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: Message }) {
  const isBroker = msg.sender === "3pl";
  if (msg.offerEvent) {
    const { action, amount, previousAmount } = msg.offerEvent;
    let text = "";
    let color = "text-[#6b7280]";
    if (action === "sent") { text = `${isBroker ? "You" : "Carrier"} sent an offer · $${amount.toLocaleString()}`; color = "text-[#3b82f6]"; }
    else if (action === "countered") { text = `${isBroker ? "You" : "Carrier"} countered $${previousAmount?.toLocaleString()} → $${amount.toLocaleString()}`; color = "text-[#d97706]"; }
    else if (action === "accepted") { text = `Offer accepted · $${amount.toLocaleString()}`; color = "text-[#16a34a]"; }
    else if (action === "declined") { text = "Offer declined"; color = "text-[#dc2626]"; }
    return (
      <div className="flex items-center gap-3 py-1">
        <div className="h-px flex-1 bg-[#e5e7eb]" />
        <span className={`shrink-0 text-[12px] font-medium ${color}`}>{text}</span>
        <div className="h-px flex-1 bg-[#e5e7eb]" />
      </div>
    );
  }
  return (
    <div className={`flex ${isBroker ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[72%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed ${isBroker ? "rounded-br-sm bg-[#3b82f6] text-white" : "rounded-bl-sm bg-[#f3f4f6] text-[#111827]"}`}>
        {msg.body}
        <p className={`mt-1 text-[11px] ${isBroker ? "text-[#bfdbfe]" : "text-[#9ca3af]"}`}>{timeAgo(msg.timestamp)}</p>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function QuoteInboxPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [convs, setConvs] = useState<Conversation[]>([]);
  const [allLoads, setAllLoads] = useState<StoredLoad[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  // Offer input state
  const [showOfferInput, setShowOfferInput] = useState(false);
  const [offerAmount, setOfferAmount] = useState("");
  const [selectedLoadId, setSelectedLoadId] = useState<string>("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (!loading && user && user.role !== "3pl") router.push("/dashboard/carrier");
  }, [user, loading, router]);

  useEffect(() => {
    if (getConversations().length === 0) seedDemoConversations();
    refreshConvs();
    setAllLoads(getStoredLoads());
  }, []);

  function refreshConvs() {
    const stored = getConversations().sort(
      (a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
    );
    setConvs(stored);
    return stored;
  }

  // Read URL params on mount: conv, offerLoad, offerRate
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const convId = params.get("conv");
    const offerLoad = params.get("offerLoad");
    const offerRate = params.get("offerRate");

    if (convId) setActiveConvId(convId);

    if (offerLoad || offerRate) {
      setShowOfferInput(true);
      if (offerLoad) setSelectedLoadId(offerLoad);
      if (offerRate) setOfferAmount(offerRate);
    }
  }, []);

  // Auto-select first conv if none
  useEffect(() => {
    if (!activeConvId && convs.length > 0) setActiveConvId(convs[0].id);
  }, [convs, activeConvId]);

  // Load messages when active conv changes
  useEffect(() => {
    if (!activeConvId) return;
    setMessages(getMessages(activeConvId));
    markConversationRead(activeConvId);
    refreshConvs();
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
  }, [activeConvId]);

  // When active conv changes, default the load selector to the conv's own load
  useEffect(() => {
    if (!activeConvId) return;
    const conv = getConversations().find((c) => c.id === activeConvId);
    if (conv && !selectedLoadId) setSelectedLoadId(conv.loadId);
  }, [activeConvId]);

  function selectConv(id: string) {
    setActiveConvId(id);
    setShowOfferInput(false);
    setMessageText("");
    setOfferAmount("");
    window.history.replaceState(null, "", `/dashboard/3pl/quotes?conv=${id}`);
  }

  function handleSendMessage() {
    if (!activeConvId || !messageText.trim()) return;
    addMessage(activeConvId, { sender: "3pl", body: messageText.trim() });
    setMessageText("");
    setMessages(getMessages(activeConvId));
    refreshConvs();
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
  }

  function handleSendOffer() {
    const amount = parseFloat(offerAmount.replace(/[^0-9.]/g, ""));
    if (!activeConvId || !amount || amount <= 0) return;

    const conv = getConversations().find((c) => c.id === activeConvId);
    const chosenLoad = allLoads.find((l) => l.id === selectedLoadId);
    const loadCtx = chosenLoad
      ? { loadId: chosenLoad.id, origin: chosenLoad.origin, destination: chosenLoad.destination }
      : conv
      ? { loadId: conv.loadId, origin: conv.origin, destination: conv.destination }
      : undefined;

    sendOffer(activeConvId, amount, "3pl", loadCtx);
    setShowOfferInput(false);
    setOfferAmount("");
    setMessages(getMessages(activeConvId));
    refreshConvs();

    if (conv) {
      addNotification({
        type: "offer_sent",
        title: `Offer sent to ${conv.carrierName}`,
        body: `$${amount.toLocaleString()} · ${loadCtx?.origin ?? conv.origin} → ${loadCtx?.destination ?? conv.destination}`,
        role: "3pl",
        href: `/dashboard/3pl/quotes?conv=${activeConvId}`,
        metadata: { carrierId: conv.carrierId, carrierName: conv.carrierName, offeredRate: amount },
      });
      addNotification({
        type: "offer_received",
        title: `New offer: $${amount.toLocaleString()}`,
        body: `${loadCtx?.origin ?? conv.origin} → ${loadCtx?.destination ?? conv.destination}`,
        role: "carrier",
        href: `/dashboard/carrier/quote-requests`,
        metadata: { carrierId: conv.carrierId, carrierName: conv.carrierName, offeredRate: amount },
      });
    }
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
  }

  function handleAcceptOffer() {
    if (!activeConvId) return;
    const conv = getConversations().find((c) => c.id === activeConvId);
    respondToOffer(activeConvId, "accepted");
    setMessages(getMessages(activeConvId));
    refreshConvs();
    if (conv?.offer) {
      // Enrich with load data from ch_loads
      let loadExtra: { pickupDate?: string; commodity?: string; temperature?: string; equipmentType?: string; distanceMiles?: number } = {};
      try {
        const loads = JSON.parse(sessionStorage.getItem("ch_loads") || "[]");
        const load = loads.find((l: { id: string }) => l.id === conv.loadId);
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
        convId: activeConvId,
        loadId: conv.loadId,
        carrierId: conv.carrierId,
        carrierName: conv.carrierName,
        driverName: conv.driverName,
        truckNum: conv.truckNum,
        origin: conv.origin,
        destination: conv.destination,
        acceptedRate: conv.offer.amount,
        ...loadExtra,
      });

      addNotification({ type: "offer_accepted", title: `Offer accepted · ${conv.carrierName}`, body: `$${conv.offer.amount.toLocaleString()}`, role: "3pl", href: `/dashboard/3pl/quotes?conv=${activeConvId}`, metadata: { carrierId: conv.carrierId, carrierName: conv.carrierName, offeredRate: conv.offer.amount } });
    }
  }

  function handleDeclineOffer() {
    if (!activeConvId) return;
    const conv = getConversations().find((c) => c.id === activeConvId);
    respondToOffer(activeConvId, "declined");
    setMessages(getMessages(activeConvId));
    refreshConvs();
    if (conv?.offer) {
      addNotification({ type: "offer_declined", title: `Offer declined · ${conv.carrierName}`, body: `${conv.origin} → ${conv.destination}`, role: "3pl", href: `/dashboard/3pl/quotes?conv=${activeConvId}`, metadata: { carrierId: conv.carrierId, carrierName: conv.carrierName } });
    }
  }

  function handleCounterOffer(amount: number) {
    if (!activeConvId) return;
    respondToOffer(activeConvId, "countered", amount);
    setMessages(getMessages(activeConvId));
    refreshConvs();
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
  }

  const activeConv = convs.find((c) => c.id === activeConvId) ?? null;
  const relevantLoads = activeConv ? getRelevantLoads(activeConv, allLoads) : [];

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f9fafb]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#3b82f6] border-t-transparent" />
      </div>
    );
  }

  return (
    <AppShell role="3pl" companyName={user.companyName} companyCity={user.companyCity} companyState={user.companyState} initials={user.initials}>
      <Link href="/dashboard/3pl" className="mb-5 inline-flex items-center gap-1.5 text-sm text-[#6b7280] hover:text-[#374151] transition-colors">
        <ArrowLeft size={15} /> Back to Dashboard
      </Link>

      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[#111827]">Quote Inbox</h1>
          <p className="mt-1 text-sm text-[#6b7280]">Manage conversations and offers with carriers</p>
        </div>
        {convs.some((c) => c.unreadBroker > 0) && (
          <span className="flex items-center gap-1.5 rounded-full bg-[#ef4444] px-3 py-1 text-[12px] font-semibold text-white">
            {convs.reduce((s, c) => s + c.unreadBroker, 0)} unread
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
                <p className="mt-1 text-xs text-[#9ca3af]">Open a load and click Message on a carrier to start.</p>
              </div>
            ) : (
              convs.map((conv) => {
                const isActive = conv.id === activeConvId;
                const offerBadge =
                  conv.offer?.status === "accepted" ? { label: "Accepted", color: "#16a34a", bg: "#f0fdf4" }
                  : conv.offer?.status === "declined" ? { label: "Declined", color: "#dc2626", bg: "#fef2f2" }
                  : conv.offer ? { label: "Offer pending", color: "#d97706", bg: "#fffbeb" }
                  : null;
                return (
                  <button key={conv.id} onClick={() => selectConv(conv.id)}
                    className={`w-full border-b border-[#f3f4f6] px-4 py-3.5 text-left transition-colors last:border-0 ${isActive ? "bg-[#eff6ff]" : "hover:bg-[#f9fafb]"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className={`truncate text-[13px] ${isActive ? "font-semibold text-[#1d4ed8]" : "font-semibold text-[#111827]"}`}>{conv.carrierName}</p>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {conv.unreadBroker > 0 && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#3b82f6] px-1.5 text-[10px] font-bold text-white">{conv.unreadBroker}</span>
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

            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#f3f4f6] px-5 py-3.5">
              <div>
                <p className="text-[15px] font-semibold text-[#111827]">{activeConv.carrierName}</p>
                <p className="flex items-center gap-1 text-[12px] text-[#6b7280]">
                  Truck {activeConv.truckNum} · {activeConv.driverName}
                  <span className="mx-1 text-[#d1d5db]">·</span>
                  {activeConv.origin} <ArrowRight size={10} /> {activeConv.destination}
                </p>
              </div>
              <Link href={`/dashboard/3pl/loads/${activeConv.loadId}`} className="flex items-center gap-1 text-[12px] font-medium text-[#3b82f6] hover:text-[#2563eb] transition-colors">
                View load <ChevronRight size={13} />
              </Link>
            </div>

            {/* Relevant loads banner */}
            <RelevantLoadsBanner conv={activeConv} allLoads={allLoads} />

            {/* Offer banner */}
            {activeConv.offer && (
              <div className="border-b border-[#e5e7eb] px-5 py-3">
                <OfferBanner conv={activeConv} onAccept={handleAcceptOffer} onDecline={handleDeclineOffer} onCounter={handleCounterOffer} />
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

            {/* Offer input panel */}
            {showOfferInput && (
              <div className="border-t border-[#e5e7eb] bg-[#eff6ff] px-5 py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[12px] font-semibold uppercase tracking-wider text-[#3b82f6]">Send an offer</p>
                  <button onClick={() => { setShowOfferInput(false); setOfferAmount(""); }} className="rounded p-1 text-[#9ca3af] hover:text-[#374151] transition-colors">
                    <X size={14} />
                  </button>
                </div>

                {/* Load selector */}
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-[#6b7280]">Which load is this offer for?</label>
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
                    type="number" min="0" placeholder="Offer amount"
                    value={offerAmount}
                    onChange={(e) => setOfferAmount(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendOffer()}
                    autoFocus
                    className="flex-1 rounded-lg border border-[#3b82f6] bg-white px-3 py-2 text-[14px] font-semibold text-[#111827] placeholder:font-normal placeholder:text-[#9ca3af] outline-none"
                  />
                  <button
                    onClick={handleSendOffer}
                    disabled={!offerAmount || !selectedLoadId}
                    className="flex items-center gap-1.5 rounded-lg bg-[#3b82f6] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#2563eb] disabled:opacity-40 transition-colors"
                  >
                    <DollarSign size={13} /> Send Offer
                  </button>
                </div>
              </div>
            )}

            {/* Compose footer */}
            <div className="border-t border-[#e5e7eb] px-4 py-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setShowOfferInput((v) => !v); setOfferAmount(""); }}
                  title="Send an offer"
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-[13px] font-semibold transition-colors ${
                    showOfferInput ? "border-[#3b82f6] bg-[#eff6ff] text-[#2563eb]" : "border-[#d1d5db] text-[#374151] hover:border-[#3b82f6] hover:text-[#2563eb]"
                  }`}
                >
                  <DollarSign size={14} /> Offer
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
            <p className="mt-1 text-xs text-[#9ca3af]">Choose a carrier from the list to view messages.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
