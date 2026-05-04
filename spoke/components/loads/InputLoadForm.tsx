"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Calendar,
  Thermometer,
  ChevronRight,
  Info,
  Check,
  AlertCircle,
} from "lucide-react";
import { AIPricingSidebar, generateMockPricing } from "./AIPricingSidebar";
import type { AIPricingData } from "./AIPricingSidebar";
import { createLoad, type StoredLoad } from "@/lib/supabase/db";
import dynamic from "next/dynamic";

// Dynamically import the map (no SSR) — Leaflet requires browser APIs.
const RouteMap = dynamic(
  () => import("@/components/maps/RouteMap").then((m) => m.RouteMap),
  { ssr: false, loading: () => <div className="h-[280px] w-full animate-pulse rounded-xl bg-[#f3f4f6]" /> }
);

// ─── Types ────────────────────────────────────────────────────────────────────

/** A geocoded location returned by Nominatim and confirmed by the user. */
interface LocationResult {
  label: string;       // e.g. "Charleston, SC" or "123 Main St, Dallas, TX"
  lat: number;
  lng: number;
}

/** Raw Nominatim search result shape */
interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    country_code?: string;
    "ISO3166-2-lvl4"?: string; // e.g. "US-SC" → state code "SC"
  };
}

interface LoadFormValues {
  pickupDate: string;
  pickupWindowStart: string;
  pickupWindowEnd: string;
  deliveryDate: string;
  equipmentType: string;
  commodity: string;
  temperature: string;
  weightLbs: string;
  specialRequirements: string;
  targetRate: string;
  showTargetRate: boolean;
}

const INITIAL_VALUES: LoadFormValues = {
  pickupDate: "",
  pickupWindowStart: "",
  pickupWindowEnd: "",
  deliveryDate: "",
  equipmentType: "",
  commodity: "",
  temperature: "",
  weightLbs: "",
  specialRequirements: "",
  targetRate: "",
  showTargetRate: false,
};

import { EQUIPMENT_TYPES, isReeferEquipment } from "@/lib/utils/constants";

const EQUIPMENT_OPTIONS = [
  { value: "", label: "Select equipment type" },
  ...EQUIPMENT_TYPES,
];

// ─── Progress steps ───────────────────────────────────────────────────────────

const STEPS = ["Route", "Schedule", "Freight Details", "Pricing"] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a short, readable label from a Nominatim result.
 * US:     "Charleston, SC"
 * Canada: "Toronto, Ontario, CA"
 * Other:  first segment of display_name
 */
function buildLabel(r: NominatimResult): string {
  const addr = r.address;
  const city =
    addr?.city ||
    addr?.town ||
    addr?.village ||
    addr?.county ||
    r.display_name.split(",")[0].trim();
  const stateCode = addr?.["ISO3166-2-lvl4"]?.split("-")[1]; // "US-SC" → "SC"
  const state = stateCode || addr?.state || "";
  const country = addr?.country_code?.toUpperCase();

  if (country === "US" && state) return `${city}, ${state}`;
  if (state && country) return `${city}, ${state}, ${country}`;
  if (state) return `${city}, ${state}`;
  return city || r.display_name.split(",")[0].trim();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({
  number,
  title,
  complete,
}: {
  number: number;
  title: string;
  complete?: boolean;
}) {
  return (
    <div className={`mb-5 flex items-center gap-3 ${number > 1 ? "mt-8" : ""}`}>
      <div
        className={`flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-semibold ${
          complete ? "bg-[#22c55e] text-white" : "bg-[#3b82f6] text-white"
        }`}
      >
        {complete ? <Check size={14} /> : number}
      </div>
      <h3 className="text-[17px] font-semibold text-[#111827]">{title}</h3>
    </div>
  );
}

function FieldLabel({
  label,
  required,
  hint,
  htmlFor,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  htmlFor?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-[#374151]">
      {label}{" "}
      {required && <span className="text-[#ef4444]">*</span>}
      {hint && <span className="ml-1 font-normal text-[#9ca3af]">({hint})</span>}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-[#d1d5db] bg-white px-3.5 py-2.5 text-sm text-[#111827] placeholder-[#9ca3af] outline-none transition-colors focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/20 disabled:bg-[#f9fafb] disabled:text-[#9ca3af]";

const selectClass =
  "w-full appearance-none rounded-lg border border-[#d1d5db] bg-white px-3.5 py-2.5 text-sm text-[#111827] outline-none transition-colors focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/20";

/**
 * Location autocomplete backed by Nominatim (OpenStreetMap geocoding).
 * Works for any address, city, or postal code in North America (US, CA, MX).
 *
 * TODO: Swap geocoding provider to Mapbox Geocoding API for better address
 *       quality and autocomplete-as-you-type:
 *   GET https://api.mapbox.com/geocoding/v5/mapbox.places/{query}.json
 *       ?access_token=NEXT_PUBLIC_MAPBOX_TOKEN&country=US,CA,MX&types=place,address
 *   Same onConfirm callback shape — just parse coordinates from
 *   features[0].geometry.coordinates ([lng, lat]) and features[0].place_name.
 */
function LocationAutocomplete({
  id,
  inputValue,
  onInputChange,
  onConfirm,
  placeholder,
  confirmed,
  error,
}: {
  id: string;
  inputValue: string;
  onInputChange: (val: string) => void;
  onConfirm: (result: LocationResult) => void;
  placeholder: string;
  confirmed: boolean;
  error?: string;
}) {
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  function handleChange(val: string) {
    onInputChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (val.length < 3) {
      setSuggestions([]);
      setOpen(false);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        // Nominatim — free, no API key. Rate limit: 1 req/s (debounce handles this).
        // countrycodes=us,ca,mx restricts to North America.
        // TODO: Replace with Mapbox Geocoding for better results + no rate-limit concerns.
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?` +
            `q=${encodeURIComponent(val)}&format=json&limit=6&addressdetails=1&countrycodes=us,ca,mx`,
          { headers: { "Accept-Language": "en" } }
        );
        const data: NominatimResult[] = await res.json();
        setSuggestions(data);
        setOpen(data.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 350);
  }

  function handleSelect(result: NominatimResult) {
    const label = buildLabel(result);
    onInputChange(label);
    onConfirm({ label, lat: parseFloat(result.lat), lng: parseFloat(result.lon) });
    setSuggestions([]);
    setOpen(false);
  }

  const borderClass = error
    ? "border-[#fca5a5] focus:border-[#ef4444] focus:ring-[#ef4444]/10"
    : confirmed
    ? "border-[#22c55e] focus:border-[#22c55e] focus:ring-[#22c55e]/20"
    : "border-[#d1d5db] focus:border-[#3b82f6] focus:ring-[#3b82f6]/20";

  return (
    <div ref={containerRef} className="relative">
      <MapPin
        size={15}
        className={`absolute left-3 top-1/2 -translate-y-1/2 ${
          confirmed ? "text-[#22c55e]" : "text-[#3b82f6]"
        }`}
      />
      <input
        id={id}
        type="text"
        value={inputValue}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        className={`w-full rounded-lg border bg-white py-2.5 pl-9 pr-9 text-sm text-[#111827] placeholder-[#9ca3af] outline-none transition-colors focus:ring-2 ${borderClass} ${
          confirmed ? "bg-[#f0fdf4]" : ""
        }`}
      />
      {/* Right-side indicator */}
      {confirmed ? (
        <Check size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#22c55e]" />
      ) : searching ? (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#3b82f6] border-t-transparent" />
      ) : null}

      {/* Suggestions dropdown */}
      {open && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto overflow-hidden rounded-lg border border-[#e5e7eb] bg-white shadow-lg">
          {suggestions.map((s) => (
            <button
              key={s.place_id}
              type="button"
              className="flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left text-sm text-[#374151] hover:bg-[#eff6ff] transition-colors"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(s);
              }}
            >
              <MapPin size={13} className="mt-0.5 shrink-0 text-[#9ca3af]" />
              <span className="line-clamp-2">{s.display_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

const FORM_DRAFT_KEY = "ch_load_form_draft";

function saveDraftToSession(data: {
  values: LoadFormValues;
  originText: string;
  destText: string;
  confirmedOrigin: LocationResult | null;
  confirmedDest: LocationResult | null;
}) {
  try { sessionStorage.setItem(FORM_DRAFT_KEY, JSON.stringify(data)); } catch {}
}

function loadDraftFromSession(): {
  values: LoadFormValues;
  originText: string;
  destText: string;
  confirmedOrigin: LocationResult | null;
  confirmedDest: LocationResult | null;
} | null {
  try {
    const raw = sessionStorage.getItem(FORM_DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function InputLoadForm() {
  const router = useRouter();

  const [values, setValues] = useState<LoadFormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<
    Partial<Record<keyof LoadFormValues | "origin" | "destination", string>>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [pricingData, setPricingData] = useState<AIPricingData | null>(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [activeSection, setActiveSection] = useState(0);
  const [routeInfo, setRouteInfo] = useState<{ miles: number; minutes: number } | null>(null);

  // Geocoded locations — set when user picks from the Nominatim dropdown
  const [confirmedOrigin, setConfirmedOrigin] = useState<LocationResult | null>(null);
  const [confirmedDest, setConfirmedDest] = useState<LocationResult | null>(null);

  // Raw text values for the two inputs (controlled separately from confirmed locations)
  const [originText, setOriginText] = useState("");
  const [destText, setDestText] = useState("");

  // Restore draft only when returning via the "Back to load details" button
  const draftReady = useRef(false);
  useEffect(() => {
    const isBack = sessionStorage.getItem("ch_load_form_back") === "1";
    sessionStorage.removeItem("ch_load_form_back");
    if (isBack) {
      const draft = loadDraftFromSession();
      if (draft) {
        setValues(draft.values);
        setOriginText(draft.originText);
        setDestText(draft.destText);
        if (draft.confirmedOrigin) setConfirmedOrigin(draft.confirmedOrigin);
        if (draft.confirmedDest) setConfirmedDest(draft.confirmedDest);
      }
    } else {
      // Not coming back from find-trucks — clear any stale draft
      try { sessionStorage.removeItem(FORM_DRAFT_KEY); } catch {}
    }
    requestAnimationFrame(() => { draftReady.current = true; });
  }, []);

  // Section refs for scroll-spy
  const sectionRefs = useRef<(HTMLElement | null)[]>([null, null, null, null]);

  function set<K extends keyof LoadFormValues>(key: K, val: LoadFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: val }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  // Auto-save draft to sessionStorage on changes (skip until restore completes)
  useEffect(() => {
    if (!draftReady.current) return;
    saveDraftToSession({ values, originText, destText, confirmedOrigin, confirmedDest });
  }, [values, originText, destText, confirmedOrigin, confirmedDest]);

  // Scroll-spy: update active step based on scroll position
  useEffect(() => {
    function handleScroll() {
      const offsets = sectionRefs.current.map((el) =>
        el ? el.getBoundingClientRect().top : Infinity
      );
      const active = offsets.reduce(
        (best, offset, i) =>
          offset <= 120 && offset > (offsets[best] ?? Infinity) ? i : best,
        0
      );
      setActiveSection(active);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Reset route info when either location changes (new route in-flight)
  useEffect(() => {
    setRouteInfo(null);
  }, [confirmedOrigin, confirmedDest]);

  // Stable callback passed to RouteMap — called when OSRM route calculation completes
  const handleRouteCalculated = useCallback((miles: number, minutes: number) => {
    setRouteInfo({ miles, minutes });
  }, []);

  // Mock market pricing — fires when both locations are confirmed
  // TODO: Replace with debounced fetch to FastAPI /api/pricing/estimate
  //       POST { origin_lat, origin_lng, dest_lat, dest_lng, equipment_type }
  const fetchPricing = useCallback((origin: LocationResult | null, dest: LocationResult | null, eqType: string, miles: number) => {
    if (!origin || !dest) {
      setPricingData(null);
      return;
    }
    setPricingLoading(true);
    setTimeout(() => {
      const data = generateMockPricing(origin.label, dest.label, miles || 295, eqType || "dry_van");
      setPricingData(data);
      setPricingLoading(false);
    }, 700);
  }, []);

  useEffect(() => {
    fetchPricing(confirmedOrigin, confirmedDest, values.equipmentType, routeInfo?.miles ?? 0);
  }, [confirmedOrigin, confirmedDest, values.equipmentType, routeInfo?.miles, fetchPricing]);

  // Completion checks for progress indicator
  const routeReady = confirmedOrigin !== null && confirmedDest !== null;
  const sectionComplete = [
    routeReady,
    !!values.pickupDate,
    !!values.equipmentType && !!values.commodity && (!isReeferEquipment(values.equipmentType) || !!values.temperature),
    !!values.targetRate,
  ];

  function validate(): boolean {
    const next: typeof errors = {};
    if (!confirmedOrigin) next.origin = "Select a location from the suggestions";
    if (!confirmedDest) next.destination = "Select a location from the suggestions";
    if (!values.pickupDate) next.pickupDate = "Required";
    if (!values.equipmentType) next.equipmentType = "Required";
    if (!values.commodity) next.commodity = "Required";
    if (isReeferEquipment(values.equipmentType) && !values.temperature) next.temperature = "Required";
    if (!values.targetRate) next.targetRate = "Required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);

    // TODO: Replace with Supabase insert:
    // const { data: load } = await supabase.from("loads").insert({
    //   broker_id: user.id, status: "posted",
    //   origin: confirmedOrigin.label, origin_lat: confirmedOrigin.lat, origin_lng: confirmedOrigin.lng,
    //   destination: confirmedDest.label, dest_lat: confirmedDest.lat, dest_lng: confirmedDest.lng,
    //   pickup_date: values.pickupDate, equipment_type: values.equipmentType,
    //   commodity: values.commodity, temperature: parseFloat(values.temperature),
    //   weight_lbs: values.weightLbs ? parseFloat(values.weightLbs) : null,
    //   distance_miles: routeInfo?.miles, duration_minutes: routeInfo?.minutes,
    //   ai_rate_min: pricingData?.rateMin, ai_rate_max: pricingData?.rateMax,
    // }).select().single();
    // router.push(`/dashboard/3pl/loads/${load.id}/find-trucks`);

    // Generate a unique ID for each submitted load so multiple loads can coexist.
    // TODO: Replace with the real Supabase-generated UUID from the insert response.
    const loadId = `load-${Date.now()}`;

    const demoLoad = {
      id: loadId,
      origin: confirmedOrigin!.label,
      destination: confirmedDest!.label,
      originLat: confirmedOrigin!.lat,
      originLng: confirmedOrigin!.lng,
      destLat: confirmedDest!.lat,
      destLng: confirmedDest!.lng,
      pickupDate: values.pickupDate,
      commodity: values.commodity,
      temperature: values.temperature,
      equipmentType: values.equipmentType,
      weightLbs: values.weightLbs,
      specialRequirements: values.specialRequirements,
      targetRate: values.targetRate,
      pricingRateMin: pricingData?.rateMin,
      pricingRateMax: pricingData?.rateMax,
      pricingConfidence: pricingData?.confidence,
      distanceMiles: routeInfo ? Math.round(routeInfo.miles) : undefined,
      durationMinutes: routeInfo ? Math.round(routeInfo.minutes) : undefined,
      createdAt: new Date().toISOString(),
      status: "active",
      notifiedCarriers: [],
    };

    // Don't persist to Supabase/My Loads yet — that happens when the user
    // notifies carriers or explicitly saves the draft on the find-trucks page.
    // Just store in sessionStorage so find-trucks can read it.
    sessionStorage.setItem("ch_active_load", JSON.stringify(demoLoad));

    await new Promise((r) => setTimeout(r, 600));
    router.push(`/dashboard/3pl/loads/${loadId}/find-trucks`);
  }

  async function handleSaveDraft() {
    // TODO: Same insert as above but with status: "draft"
    alert("Draft saved (demo — Supabase insert goes here)");
  }

  return (
    <div className="flex gap-7 items-start">
      {/* ── Form column ── */}
      <div className="flex-[2] min-w-0">
        {/* Sticky progress bar */}
        <div className="sticky top-[64px] z-10 -mx-1 mb-7 rounded-xl border border-[#e5e7eb] bg-white px-5 py-3 shadow-sm">
          <div className="flex items-center gap-0">
            {STEPS.map((step, i) => (
              <div key={step} className="flex items-center">
                <button
                  type="button"
                  onClick={() =>
                    sectionRefs.current[i]?.scrollIntoView({ behavior: "smooth", block: "start" })
                  }
                  className="flex items-center gap-1.5 focus:outline-none"
                >
                  <div
                    className={`h-2 w-2 rounded-full transition-colors ${
                      sectionComplete[i]
                        ? "bg-[#22c55e]"
                        : i === activeSection
                        ? "bg-[#3b82f6]"
                        : "bg-[#d1d5db]"
                    }`}
                  />
                  <span
                    className={`text-[13px] transition-colors ${
                      i === activeSection
                        ? "font-semibold text-[#2563eb]"
                        : sectionComplete[i]
                        ? "font-medium text-[#16a34a]"
                        : "text-[#9ca3af]"
                    }`}
                  >
                    {step}
                  </span>
                </button>
                {i < STEPS.length - 1 && (
                  <div
                    className={`mx-2 h-px w-8 transition-colors ${
                      sectionComplete[i] ? "bg-[#22c55e]" : "bg-[#e5e7eb]"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="rounded-xl border border-[#e5e7eb] bg-white px-7 py-6">

            {/* ── Section 1: Route ── */}
            <section ref={(el) => { sectionRefs.current[0] = el; }}>
              <SectionHeader number={1} title="Route" complete={sectionComplete[0]} />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel label="Origin" required htmlFor="origin" />
                  <LocationAutocomplete
                    id="origin"
                    inputValue={originText}
                    onInputChange={(val) => {
                      setOriginText(val);
                      // Clear confirmed location if user edits the text
                      if (confirmedOrigin && val !== confirmedOrigin.label) {
                        setConfirmedOrigin(null);
                      }
                      setErrors((prev) => ({ ...prev, origin: undefined }));
                    }}
                    onConfirm={(result) => {
                      setConfirmedOrigin(result);
                      setOriginText(result.label);
                      setErrors((prev) => ({ ...prev, origin: undefined }));
                    }}
                    placeholder="City, address, or zip code"
                    confirmed={confirmedOrigin !== null}
                    error={errors.origin}
                  />
                  {errors.origin && (
                    <p className="mt-1 text-xs text-[#ef4444]">{errors.origin}</p>
                  )}
                </div>
                <div>
                  <FieldLabel label="Destination" required htmlFor="destination" />
                  <LocationAutocomplete
                    id="destination"
                    inputValue={destText}
                    onInputChange={(val) => {
                      setDestText(val);
                      if (confirmedDest && val !== confirmedDest.label) {
                        setConfirmedDest(null);
                      }
                      setErrors((prev) => ({ ...prev, destination: undefined }));
                    }}
                    onConfirm={(result) => {
                      setConfirmedDest(result);
                      setDestText(result.label);
                      setErrors((prev) => ({ ...prev, destination: undefined }));
                    }}
                    placeholder="City, address, or zip code"
                    confirmed={confirmedDest !== null}
                    error={errors.destination}
                  />
                  {errors.destination && (
                    <p className="mt-1 text-xs text-[#ef4444]">{errors.destination}</p>
                  )}
                </div>
              </div>

              {routeReady && confirmedOrigin && confirmedDest && (
                <>
                  {/* Route map — renders as soon as both locations are confirmed */}
                  <div className="mt-4">
                    <RouteMap
                      originCoords={[confirmedOrigin.lat, confirmedOrigin.lng]}
                      destCoords={[confirmedDest.lat, confirmedDest.lng]}
                      originLabel={confirmedOrigin.label}
                      destLabel={confirmedDest.label}
                      height={280}
                      onRouteCalculated={handleRouteCalculated}
                    />
                  </div>
                  <div className="mt-2.5 flex items-center gap-2 rounded-lg bg-[#f9fafb] px-3.5 py-2.5">
                    <Info size={13} className="text-[#9ca3af]" />
                    {routeInfo ? (
                      <span className="text-xs text-[#6b7280]">
                        Driving distance:{" "}
                        <strong className="text-[#374151]">
                          {Math.round(routeInfo.miles)} miles
                        </strong>
                        {" · "}
                        Est. drive time:{" "}
                        <strong className="text-[#374151]">
                          {routeInfo.minutes >= 60
                            ? `${Math.floor(routeInfo.minutes / 60)}h ${Math.round(routeInfo.minutes % 60)}m`
                            : `${Math.round(routeInfo.minutes)}m`}
                        </strong>
                      </span>
                    ) : (
                      <span className="text-xs text-[#9ca3af]">Calculating route…</span>
                    )}
                  </div>
                </>
              )}
            </section>

            {/* ── Section 2: Schedule ── */}
            <section ref={(el) => { sectionRefs.current[1] = el; }}>
              <SectionHeader number={2} title="Schedule" complete={sectionComplete[1]} />
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <FieldLabel label="Pickup Date" required htmlFor="pickupDate" />
                  <div className="relative">
                    <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
                    <input
                      id="pickupDate"
                      type="date"
                      value={values.pickupDate}
                      onChange={(e) => set("pickupDate", e.target.value)}
                      className={`${inputClass} pl-9`}
                    />
                  </div>
                  {errors.pickupDate && (
                    <p className="mt-1 text-xs text-[#ef4444]">{errors.pickupDate}</p>
                  )}
                </div>

                <div className="min-w-0">
                  <FieldLabel label="Pickup Window" hint="optional" />
                  <div className="flex items-center gap-1">
                    <input
                      type="time"
                      value={values.pickupWindowStart}
                      onChange={(e) => set("pickupWindowStart", e.target.value)}
                      className={`${inputClass} min-w-0`}
                    />
                    <span className="shrink-0 text-xs text-[#9ca3af]">to</span>
                    <input
                      type="time"
                      value={values.pickupWindowEnd}
                      onChange={(e) => set("pickupWindowEnd", e.target.value)}
                      className={`${inputClass} min-w-0`}
                    />
                  </div>
                </div>

                <div>
                  <FieldLabel label="Delivery Date" hint="optional" htmlFor="deliveryDate" />
                  <div className="relative">
                    <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
                    <input
                      id="deliveryDate"
                      type="date"
                      value={values.deliveryDate}
                      onChange={(e) => set("deliveryDate", e.target.value)}
                      className={`${inputClass} pl-9`}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* ── Section 3: Freight Details ── */}
            <section ref={(el) => { sectionRefs.current[2] = el; }}>
              <SectionHeader number={3} title="Freight Details" complete={sectionComplete[2]} />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel label="Equipment Type" required htmlFor="equipmentType" />
                  <div className="relative">
                    <select
                      id="equipmentType"
                      value={values.equipmentType}
                      onChange={(e) => set("equipmentType", e.target.value)}
                      className={selectClass}
                    >
                      {EQUIPMENT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value} disabled={!o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <ChevronRight
                      size={14}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-[#9ca3af]"
                    />
                  </div>
                  {errors.equipmentType && (
                    <p className="mt-1 text-xs text-[#ef4444]">{errors.equipmentType}</p>
                  )}
                </div>

                <div>
                  <FieldLabel label="Commodity" required htmlFor="commodity" />
                  <input
                    id="commodity"
                    type="text"
                    value={values.commodity}
                    onChange={(e) => set("commodity", e.target.value)}
                    placeholder={isReeferEquipment(values.equipmentType) ? "e.g. Strawberries, Frozen Shrimp, Dairy" : values.equipmentType === "flatbed" ? "e.g. Steel Beams, Lumber, Machinery" : "e.g. Consumer Goods, Paper Products, Electronics"}
                    className={inputClass}
                  />
                  {errors.commodity && (
                    <p className="mt-1 text-xs text-[#ef4444]">{errors.commodity}</p>
                  )}
                </div>

                {isReeferEquipment(values.equipmentType) && (
                <div>
                  <FieldLabel label="Temperature" required htmlFor="temperature" />
                  <div className="relative">
                    <Thermometer size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
                    <input
                      id="temperature"
                      type="number"
                      value={values.temperature}
                      onChange={(e) => set("temperature", e.target.value)}
                      placeholder="34"
                      className={`${inputClass} pl-9 pr-9`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#9ca3af]">
                      °F
                    </span>
                  </div>
                  {errors.temperature && (
                    <p className="mt-1 text-xs text-[#ef4444]">{errors.temperature}</p>
                  )}
                </div>
                )}

                <div>
                  <FieldLabel label="Weight" hint="optional" htmlFor="weight" />
                  <div className="relative">
                    <input
                      id="weight"
                      type="number"
                      value={values.weightLbs}
                      onChange={(e) => set("weightLbs", e.target.value)}
                      placeholder="42000"
                      className={`${inputClass} pr-9`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#9ca3af]">
                      lbs
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <FieldLabel label="Special Requirements" hint="optional" htmlFor="specialReqs" />
                <textarea
                  id="specialReqs"
                  value={values.specialRequirements}
                  onChange={(e) => set("specialRequirements", e.target.value)}
                  rows={3}
                  placeholder="e.g. Must maintain 32–36°F, no stops, lumper included"
                  className={`${inputClass} resize-y`}
                />
              </div>
            </section>

            {/* ── Section 4: Pricing ── */}
            <section ref={(el) => { sectionRefs.current[3] = el; }}>
              <SectionHeader number={4} title="Pricing" complete={sectionComplete[3]} />

              {pricingData && (
                <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-[#dbeafe] bg-[#eff6ff] px-4 py-3">
                  <Info size={15} className="mt-0.5 shrink-0 text-[#2563eb]" />
                  <p className="text-[13px] text-[#1d4ed8]">
                    Market data on this lane suggests{" "}
                    <strong>
                      ${pricingData.rateMin.toLocaleString()} – ${pricingData.rateMax.toLocaleString()}
                    </strong>
                    . Your target rate has been pre-filled with the estimated average.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 items-start">
                <div>
                  <FieldLabel label="Your Target Rate" required htmlFor="targetRate" />
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-[#9ca3af]">
                      $
                    </span>
                    <input
                      id="targetRate"
                      type="number"
                      value={values.targetRate}
                      onChange={(e) => set("targetRate", e.target.value)}
                      placeholder={pricingData ? `${Math.round((pricingData.rateMin + pricingData.rateMax) / 2 / 10) * 10}` : "Enter target rate"}
                      className={`${inputClass} pl-7`}
                    />
                  </div>
                  {errors.targetRate && (
                    <p className="mt-1 text-xs text-[#ef4444]">{errors.targetRate}</p>
                  )}
                </div>

                <div className="pt-7">
                  <label className="flex cursor-pointer items-center gap-2.5 text-sm text-[#374151]">
                    <input
                      type="checkbox"
                      checked={values.showTargetRate}
                      onChange={(e) => set("showTargetRate", e.target.checked)}
                      className="h-4 w-4 rounded border-[#d1d5db] accent-[#3b82f6]"
                    />
                    Show carriers target rate
                  </label>
                </div>
              </div>

              {/* Validation summary */}
              {Object.keys(errors).length > 0 && (
                <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-[#fecaca] bg-[#fef2f2] px-4 py-3">
                  <AlertCircle size={15} className="mt-0.5 shrink-0 text-[#ef4444]" />
                  <p className="text-[13px] text-[#dc2626]">
                    Please fill in all required fields before submitting.
                  </p>
                </div>
              )}
            </section>

            {/* ── Actions ── */}
            <div className="mt-8 flex items-center justify-end gap-3 border-t border-[#e5e7eb] pt-6">
              <button
                type="button"
                onClick={handleSaveDraft}
                className="rounded-lg border border-[#d1d5db] bg-white px-5 py-2.5 text-sm font-medium text-[#4b5563] hover:bg-[#f9fafb] transition-colors"
              >
                Save Draft
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-60 disabled:cursor-not-allowed transition-all ${
                  sectionComplete.every(Boolean)
                    ? "bg-gradient-to-r from-[#22c55e] to-[#16a34a] hover:from-[#16a34a] hover:to-[#15803d]"
                    : "bg-gradient-to-r from-[#3b82f6] to-[#1d4ed8] hover:from-[#2563eb] hover:to-[#1e40af]"
                }`}
              >
                {submitting ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Saving…
                  </>
                ) : (
                  <>
                    Input Load &amp; Find Carriers <ChevronRight size={15} />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* ── Market Rate Sidebar ── */}
      <div className="w-[320px] shrink-0 sticky top-[92px]">
        <AIPricingSidebar data={pricingData} loading={pricingLoading} />
      </div>
    </div>
  );
}
