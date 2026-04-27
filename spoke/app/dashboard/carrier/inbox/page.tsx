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
  Truck,
  MapPin,
  Star,
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
  updateConversationTruck,
  type Conversation,
  type Message,
} from "@/lib/conversations";
import { createBooking, getBookings } from "@/lib/bookings";
import { addNotification } from "@/lib/notifications";
import { getTrucks, getDrivers, type Truck as TruckType, type Driver } from "@/lib/fleet";

// ─── Deadhead helpers (mirrors quote-requests page) ───────────────────────────

const CITY_COORDS: Record<string, [number, number]> = {
  "charleston_sc":    [32.7765, -79.9311],
  "atlanta_ga":       [33.7490, -84.3880],
  "savannah_ga":      [32.0835, -81.0998],
  "jacksonville_fl":  [30.3322, -81.6557],
  "miami_fl":         [25.7617, -80.1918],
  "charlotte_nc":     [35.2271, -80.8431],
  "tampa_fl":         [27.9506, -82.4572],
  "nashville_tn":     [36.1627, -86.7816],
  "memphis_tn":       [35.1495, -90.0490],
  "new_orleans_la":   [29.9511, -90.0715],
  "houston_tx":       [29.7604, -95.3698],
  "dallas_tx":        [32.7767, -96.7970],
  "birmingham_al":    [33.5186, -86.8104],
  "columbia_sc":      [34.0007, -81.0348],
  "orlando_fl":       [28.5383, -81.3792],
  "raleigh_nc":       [35.7796, -78.6382],
  "richmond_va":      [37.5407, -77.4360],
  "norfolk_va":       [36.8507, -76.2859],
  "greensboro_nc":    [36.0726, -79.7920],
};

function cityKey(city: string, state: string): string {
  return `${city.toLowerCase().replace(/\s+/g, "_")}_${state.toLowerCase()}`;
}

function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function estimateDeadhead(truckCity: string, truckState: string, pickupLocation: string): number | null {
  const truckCoord = CITY_COORDS[cityKey(truckCity, truckState)];
  const match = pickupLocation.match(/^([^,]+),\s*([A-Z]{2})/);
  if (!match) return null;
  const pickupCoord = CITY_COORDS[cityKey(match[1].trim(), match[2].trim())];
  if (!truckCoord || !pickupCoord) return null;
  return Math.round(haversineMiles(truckCoord[0], truckCoord[1], pickupCoord[0], pickupCoord[1]));
}

// ─── Inline truck picker for accept flow ──────────────────────────────────────

function AcceptTruckPicker({
  pickupLocation,
  preselectedTruckNum,
  onConfirm,
  onCancel,
}: {
  pickupLocation: string;
  preselectedTruckNum?: string;
  onConfirm: (truckNum: string, driverName: string) => void;
  onCancel: () => void;
}) {
  const [trucks] = useState<TruckType[]>(() => getTrucks());
  const [drivers] = useState<Driver[]>(() => getDrivers());

  const withMeta = trucks.map((t) => ({
    ...t,
    deadhead: estimateDeadhead(t.city, t.state, pickupLocation),
    driverName: drivers.find((d) => d.assignedTruckId === t.id)?.name ?? null,
  }));
  const available = withMeta
    .filter((t) => t.status === "available")
    .sort((a, b) => {
      if (a.deadhead === null && b.deadhead === null) return 0;
      if (a.deadhead === null) return 1;
      if (b.deadhead === null) return -1;
      return a.deadhead - b.deadhead;
    });
  const unavailable = withMeta.filter((t) => t.status !== "available");
  const all = [...available, ...unavailable];

  // Preselect: try to match the existing truckNum on the conversation, otherwise best available
  const initId =
    trucks.find((t) => t.truckNum === preselectedTruckNum)?.id ??
    available[0]?.id ??
    null;
  const [selectedId, setSelectedId] = useState<string | null>(initId);

  function handleConfirm() {
    const truck = trucks.find((t) => t.id === selectedId);
    if (!truck) return;
    const driver = drivers.find((d) => d.assignedTruckId === selectedId);
    onConfirm(truck.truckNum, driver?.name ?? "—");
  }

  return (
    <div className="mt-3 rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] p-4">
      <p className="mb-2 text-[13px] font-semibold text-[#15803d]">
        Assign a truck to accept this load
      </p>
      <p className="mb-3 text-[11px] text-[#6b7280]">
        Trucks are sorted by deadhead distance to pickup · {pickupLocation}
      </p>

      <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
        {all.map((truck, i) => {
          const isAvail = truck.status === "available";
          const isSelected = selectedId === truck.id;
          const isRecommended = i === 0 && isAvail;
          return (
            <button
              key={truck.id}
              type="button"
              onClick={() => isAvail && setSelectedId(truck.id)}
              disabled={!isAvail}
              className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all ${
                isSelected
                  ? "border-[#16a34a] bg-white"
                  : isAvail
                  ? "border-[#e5e7eb] bg-white hover:border-[#86efac]"
                  : "cursor-not-allowed border-[#f3f4f6] bg-[#fafafa] opacity-50"
              }`}
            >
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isSelected ? "bg-[#dcfce7]" : "bg-[#f3f4f6]"}`}>
                <Truck size={14} className={isSelected ? "text-[#16a34a]" : "text-[#6b7280]"} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[13px] font-semibold text-[#111827]">Truck {truck.truckNum}</span>
                  {isRecommended && (
                    <span className="flex items-center gap-0.5 rounded-full bg-[#16a34a] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      <Star size={8} fill="white" /> Best match
                    </span>
                  )}
                  {!isAvail && (
                    <span className="text-[11px] text-[#9ca3af] capitalize">({truck.status.replace("_", " ")})</span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[#6b7280]">
                  <span>{truck.year} {truck.make} {truck.model}</span>
                  <span>·</span>
                  <span className="flex items-center gap-0.5"><MapPin size={9} /> {truck.city}, {truck.state}</span>
                  {truck.deadhead !== null && (
                    <>
                      <span>·</span>
                      <span className={truck.deadhead < 50 ? "font-medium text-[#16a34a]" : ""}>~{truck.deadhead} mi deadhead</span>
                    </>
                  )}
                  {truck.driverName && <><span>·</span><span>Driver: {truck.driverName}</span></>}
                </div>
              </div>
              {isSelected && <CheckCircle2 size={15} className="shrink-0 text-[#16a34a]" />}
            </button>
          );
        })}
        {all.length === 0 && (
          <p className="text-[12px] text-[#9ca3af] italic">No trucks in your fleet.</p>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={handleConfirm}
          disabled={!selectedId}
          className="flex items-center gap-1.5 rounded-lg bg-[#16a34a] px-5 py-2 text-sm font-semibold text-white hover:bg-[#15803d] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <CheckCircle2 size={14} /> Confirm & Accept
        </button>
        <button
          onClick={onCancel}
          className="rounded-lg border border-[#e5e7eb] bg-white px-4 py-2 text-sm font-medium text-[#4b5563] hover:bg-[#f9fafb] transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
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
    return (
      <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium ${
        offer.status === "accepted"
          ? "border-[#bbf7d0] bg-[#f0fdf4] text-[#16a34a]"
          : "border-[#fecaca] bg-[#fef2f2] text-[#dc2626]"
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
        {!canRespond && !showCounter && (
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

// ─── Message bubble (carrier perspective: carrier = right/green) ──────────────

function MessageBubble({ msg }: { msg: Message }) {
  const isMe = msg.sender === "carrier"; // carrier is "you"

  if (msg.offerEvent) {
    const { action, amount, previousAmount } = msg.offerEvent;
    let text = "";
    let color = "text-[#6b7280]";
    if (action === "sent") {
      text = `${isMe ? "You" : "Broker"} sent an offer · $${amount.toLocaleString()}`;
      color = "text-[#16a34a]";
    } else if (action === "countered") {
      text = `${isMe ? "You" : "Broker"} countered $${previousAmount?.toLocaleString()} → $${amount.toLocaleString()}`;
      color = "text-[#d97706]";
    } else if (action === "accepted") {
      text = `Offer accepted · $${amount.toLocaleString()}`;
      color = "text-[#16a34a]";
    } else if (action === "declined") {
      text = "Offer declined";
      color = "text-[#dc2626]";
    }
    return (
      <div className="flex items-center gap-3 py-1">
        <div className="h-px flex-1 bg-[#e5e7eb]" />
        <span className={`shrink-0 text-[12px] font-medium ${color}`}>{text}</span>
        <div className="h-px flex-1 bg-[#e5e7eb]" />
      </div>
    );
  }

  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[72%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed ${
        isMe
          ? "rounded-br-sm bg-[#16a34a] text-white"
          : "rounded-bl-sm bg-[#f3f4f6] text-[#111827]"
      }`}>
        {msg.body}
        <p className={`mt-1 text-[11px] ${isMe ? "text-[#bbf7d0]" : "text-[#9ca3af]"}`}>
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

  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [showQuoteInput, setShowQuoteInput] = useState(false);
  const [quoteAmount, setQuoteAmount] = useState("");
  const [showTruckPicker, setShowTruckPicker] = useState(false);

  const { messages, setMessages, convs, refreshConvs, refreshMessages } = useRealtimeMessages(activeConvId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (!loading && user && user.role !== "carrier") router.push("/dashboard/3pl");
  }, [user, loading, router]);

  useEffect(() => {
    if (getConversations().length === 0) seedDemoConversations();
    refreshConvs();
  }, []);

  // Read conv from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const convId = params.get("conv");
    if (convId) setActiveConvId(convId);
  }, []);

  useEffect(() => {
    if (!activeConvId && convs.length > 0) setActiveConvId(convs[0].id);
  }, [convs, activeConvId]);

  useEffect(() => {
    if (!activeConvId) return;
    markConversationRead(activeConvId, "carrier");
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
  }, [activeConvId, messages]);

  function selectConv(id: string) {
    setActiveConvId(id);
    setShowQuoteInput(false);
    setShowTruckPicker(false);
    setMessageText("");
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

    sendOffer(activeConvId, amount, "carrier", conv
      ? { loadId: conv.loadId, origin: conv.origin, destination: conv.destination }
      : undefined);

    setShowQuoteInput(false);
    setQuoteAmount("");
    if (activeConvId) refreshMessages(activeConvId);
    refreshConvs();

    if (conv) {
      // Notify broker that a quote was received
      addNotification({
        type: "quote_received",
        title: `Quote received from ${conv.carrierName}`,
        body: `$${amount.toLocaleString()} · ${conv.origin} → ${conv.destination}`,
        role: "3pl",
        href: `/dashboard/3pl/quotes?conv=${activeConvId}`,
        metadata: { carrierId: conv.carrierId, carrierName: conv.carrierName, quotedRate: amount },
      });
    }
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
  }

  function handleAcceptOffer() {
    // Show truck picker first — acceptance happens in handleAcceptWithTruck
    setShowTruckPicker(true);
  }

  function handleAcceptWithTruck(truckNum: string, driverName: string) {
    if (!activeConvId) return;
    setShowTruckPicker(false);

    // Update conversation with selected truck before accepting
    updateConversationTruck(activeConvId, truckNum, driverName);

    const conv = getConversations().find((c) => c.id === activeConvId);
    respondToOffer(activeConvId, "accepted", undefined, "carrier");
    if (activeConvId) refreshMessages(activeConvId);
    refreshConvs();

    if (conv?.offer) {
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
        driverName,
        truckNum,
        origin: conv.origin,
        destination: conv.destination,
        acceptedRate: conv.offer.amount,
        ...loadExtra,
      });

      addNotification({
        type: "offer_accepted",
        title: `Offer accepted · ${conv.carrierName}`,
        body: `$${conv.offer.amount.toLocaleString()} · ${conv.origin} → ${conv.destination}`,
        role: "3pl",
        href: `/dashboard/3pl/quotes?conv=${activeConvId}`,
        metadata: { carrierId: conv.carrierId, carrierName: conv.carrierName, offeredRate: conv.offer.amount },
      });
    }
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
          <h1 className="text-[26px] font-bold tracking-tight text-[#111827]">Inbox</h1>
          <p className="mt-1 text-sm text-[#6b7280]">Messages and offers from brokers</p>
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
              convs.map((conv) => {
                const isActive = conv.id === activeConvId;
                const unread = conv.unreadCarrier ?? 0;
                const offerBadge =
                  conv.offer?.status === "accepted" ? { label: "Accepted", color: "#16a34a", bg: "#f0fdf4" }
                  : conv.offer?.status === "declined" ? { label: "Declined", color: "#dc2626", bg: "#fef2f2" }
                  : conv.offer?.from === "3pl" && conv.offer.status === "pending" ? { label: "Offer received", color: "#d97706", bg: "#fffbeb" }
                  : conv.offer?.from === "carrier" && conv.offer.status === "pending" ? { label: "Quote sent", color: "#2563eb", bg: "#eff6ff" }
                  : null;
                return (
                  <button key={conv.id} onClick={() => selectConv(conv.id)}
                    className={`w-full border-b border-[#f3f4f6] px-4 py-3.5 text-left transition-colors last:border-0 ${isActive ? "bg-[#f0fdf4]" : "hover:bg-[#f9fafb]"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className={`truncate text-[13px] ${isActive ? "font-semibold text-[#15803d]" : "font-semibold text-[#111827]"}`}>
                        {/* Show broker company context — in demo we use the load route */}
                        {conv.origin.split(",")[1]?.trim() ?? conv.origin} Broker
                      </p>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {unread > 0 && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#22c55e] px-1.5 text-[10px] font-bold text-white">{unread}</span>
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
                <p className="text-[15px] font-semibold text-[#111827]">
                  Load: {activeConv.origin} → {activeConv.destination}
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

            {/* Offer banner */}
            {activeConv.offer && (
              <div className="border-b border-[#e5e7eb] px-5 py-3">
                <OfferBanner
                  conv={activeConv}
                  onAccept={handleAcceptOffer}
                  onDecline={handleDeclineOffer}
                  onCounter={handleCounterOffer}
                />
                {showTruckPicker && activeConv.offer.from === "3pl" && activeConv.offer.status === "pending" && (
                  <AcceptTruckPicker
                    pickupLocation={activeConv.origin}
                    preselectedTruckNum={activeConv.truckNum}
                    onConfirm={handleAcceptWithTruck}
                    onCancel={() => setShowTruckPicker(false)}
                  />
                )}
              </div>
            )}

            {/* Message thread */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Package size={28} className="mb-2 text-[#d1d5db]" />
                  <p className="text-sm text-[#9ca3af]">No messages yet</p>
                </div>
              ) : (
                messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quote input panel */}
            {showQuoteInput && (
              <div className="border-t border-[#e5e7eb] bg-[#f0fdf4] px-5 py-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[12px] font-semibold uppercase tracking-wider text-[#16a34a]">Send a quote</p>
                  <button onClick={() => { setShowQuoteInput(false); setQuoteAmount(""); }} className="rounded p-1 text-[#9ca3af] hover:text-[#374151] transition-colors">
                    <X size={14} />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-semibold text-[#374151]">$</span>
                  <input
                    type="number" min="0" placeholder="Your rate for this load"
                    value={quoteAmount}
                    onChange={(e) => setQuoteAmount(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendQuote()}
                    autoFocus
                    className="flex-1 rounded-lg border border-[#16a34a] bg-white px-3 py-2 text-[14px] font-semibold text-[#111827] placeholder:font-normal placeholder:text-[#9ca3af] outline-none"
                  />
                  <button
                    onClick={handleSendQuote}
                    disabled={!quoteAmount}
                    className="flex items-center gap-1.5 rounded-lg bg-[#16a34a] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#15803d] disabled:opacity-40 transition-colors"
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
                    showQuoteInput ? "border-[#16a34a] bg-[#f0fdf4] text-[#15803d]" : "border-[#d1d5db] text-[#374151] hover:border-[#16a34a] hover:text-[#15803d]"
                  }`}
                >
                  <DollarSign size={14} /> Quote
                </button>
                <input
                  type="text" placeholder="Type a message…"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                  className="flex-1 rounded-lg border border-[#e5e7eb] bg-[#f9fafb] px-4 py-2 text-[14px] text-[#111827] placeholder:text-[#9ca3af] outline-none focus:border-[#16a34a] focus:bg-white transition-colors"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!messageText.trim()}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[#16a34a] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#15803d] disabled:opacity-40 transition-colors"
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
