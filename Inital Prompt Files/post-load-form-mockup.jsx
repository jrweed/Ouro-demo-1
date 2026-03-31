import { useState } from "react";
import { Bell, ChevronDown, ChevronRight, FileText, LayoutDashboard, Truck, Inbox, BookOpen, DollarSign, Settings, Plus, TrendingUp, Sparkles, MapPin, Calendar, Thermometer, Package, Weight, AlertCircle, Check, Info } from "lucide-react";

const c = {
  p50: "#eff6ff", p100: "#dbeafe", p500: "#3b82f6", p600: "#2563eb", p700: "#1d4ed8",
  s50: "#f0fdf4", s500: "#22c55e", s600: "#16a34a",
  w50: "#fffbeb", w500: "#f59e0b", w600: "#d97706",
  d50: "#fef2f2", d500: "#ef4444",
  n50: "#f9fafb", n100: "#f3f4f6", n200: "#e5e7eb", n300: "#d1d5db", n400: "#9ca3af", n500: "#6b7280", n600: "#4b5563", n700: "#374151", n800: "#1f2937", n900: "#111827",
};

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard" },
  { icon: Plus, label: "Post Load", active: true },
  { icon: FileText, label: "My Loads" },
  { icon: Inbox, label: "Quote Inbox", badge: 5 },
  { icon: BookOpen, label: "Active Bookings" },
  { icon: DollarSign, label: "Pricing Tool" },
  { icon: Settings, label: "Settings" },
];

function SectionHeader({ number, title, active }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, marginTop: number > 1 ? 32 : 0 }}>
      <div style={{
        width: 28, height: 28, borderRadius: 9999,
        background: active ? c.p500 : c.n200,
        color: active ? "#fff" : c.n500,
        fontSize: 13, fontWeight: 600,
        display: "flex", alignItems: "center", justifyContent: "center"
      }}>{number}</div>
      <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: active ? c.n900 : c.n500 }}>{title}</h3>
    </div>
  );
}

function FormField({ label, placeholder, suffix, prefix, type, required, hint, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: c.n700, marginBottom: 6 }}>
        {label} {required && <span style={{ color: c.d500 }}>*</span>}
      </label>
      {children ? children : (
        <div style={{ position: "relative" }}>
          {prefix && (
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: c.n400, fontSize: 14, fontWeight: 500 }}>{prefix}</span>
          )}
          <input
            type={type || "text"}
            placeholder={placeholder}
            style={{
              width: "100%", padding: "10px 12px", paddingLeft: prefix ? 28 : 12, paddingRight: suffix ? 48 : 12,
              border: `1px solid ${c.n300}`, borderRadius: 8, fontSize: 14, color: c.n800,
              outline: "none", boxSizing: "border-box", background: "#fff",
            }}
          />
          {suffix && (
            <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: c.n400, fontSize: 13 }}>{suffix}</span>
          )}
        </div>
      )}
      {hint && <p style={{ margin: "4px 0 0 0", fontSize: 12, color: c.n400 }}>{hint}</p>}
    </div>
  );
}

function SelectField({ label, options, required, value }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: c.n700, marginBottom: 6 }}>
        {label} {required && <span style={{ color: c.d500 }}>*</span>}
      </label>
      <div style={{ position: "relative" }}>
        <select style={{
          width: "100%", padding: "10px 12px", border: `1px solid ${c.n300}`, borderRadius: 8,
          fontSize: 14, color: value ? c.n800 : c.n400, outline: "none", appearance: "none",
          background: "#fff", cursor: "pointer", boxSizing: "border-box"
        }}>
          {options.map((o, i) => <option key={i} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown size={16} color={c.n400} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
      </div>
    </div>
  );
}

function ProgressIndicator({ steps, current }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 28 }}>
      {steps.map((step, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 8, height: 8, borderRadius: 9999,
              background: i <= current ? c.p500 : c.n300,
            }} />
            <span style={{ fontSize: 13, fontWeight: i === current ? 600 : 400, color: i <= current ? c.p600 : c.n400 }}>{step}</span>
          </div>
          {i < steps.length - 1 && (
            <div style={{ width: 32, height: 1, background: i < current ? c.p500 : c.n300, margin: "0 8px" }} />
          )}
        </div>
      ))}
    </div>
  );
}

function PricingTxn({ rate, date, lane }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${c.n100}` }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: c.n700 }}>{lane}</div>
        <div style={{ fontSize: 11, color: c.n400 }}>{date}</div>
      </div>
      <span style={{ fontSize: 14, fontWeight: 600, color: c.n800 }}>${rate.toLocaleString()}</span>
    </div>
  );
}

export default function PostLoadForm() {
  const [currentStep] = useState(2);

  return (
    <div style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif", background: c.n50, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Top Bar */}
      <header style={{ height: 64, background: "#fff", borderBottom: `1px solid ${c.n200}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, background: `linear-gradient(135deg, ${c.p500}, ${c.p700})`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Truck size={18} color="#fff" />
          </div>
          <span style={{ fontSize: 18, fontWeight: 700, color: c.n900 }}>ColdHaul</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button style={{ background: "none", border: "none", cursor: "pointer", padding: 8, borderRadius: 8, position: "relative" }}>
            <Bell size={20} color={c.n600} />
            <span style={{ position: "absolute", top: 4, right: 4, width: 18, height: 18, background: c.d500, borderRadius: 9999, color: "#fff", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>3</span>
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 12px", borderRadius: 8, cursor: "pointer" }}>
            <div style={{ width: 34, height: 34, borderRadius: 9999, background: `linear-gradient(135deg, ${c.p100}, ${c.p500})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 600 }}>JC</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: c.n800 }}>Lowcountry Logistics</div>
              <div style={{ fontSize: 11, color: c.n500 }}>3PL · Charleston, SC</div>
            </div>
          </div>
        </div>
      </header>

      <div style={{ display: "flex", flex: 1 }}>
        {/* Sidebar */}
        <aside style={{ width: 240, background: "#fff", borderRight: `1px solid ${c.n200}`, padding: "24px 12px", flexShrink: 0, position: "sticky", top: 64, height: "calc(100vh - 64px)" }}>
          <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {sidebarItems.map((item, i) => (
              <a key={i} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, fontSize: 14, fontWeight: item.active ? 500 : 400,
                color: item.active ? c.p600 : c.n600, background: item.active ? c.p50 : "transparent",
                textDecoration: "none", cursor: "pointer", borderLeft: item.active ? `3px solid ${c.p500}` : "3px solid transparent",
              }}>
                <item.icon size={18} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge && <span style={{ background: c.d500, color: "#fff", fontSize: 11, fontWeight: 600, padding: "1px 7px", borderRadius: 9999 }}>{item.badge}</span>}
              </a>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main style={{ flex: 1, padding: "28px 32px", display: "flex", gap: 28, alignItems: "flex-start" }}>

          {/* Form Column */}
          <div style={{ flex: 2 }}>
            <div style={{ marginBottom: 20 }}>
              <h1 style={{ fontSize: 26, fontWeight: 700, color: c.n900, margin: 0 }}>Post a Load</h1>
              <p style={{ fontSize: 14, color: c.n500, margin: "4px 0 0 0" }}>Fill in load details to get AI-powered pricing and find nearby carriers</p>
            </div>

            <ProgressIndicator steps={["Route", "Schedule", "Freight Details", "Pricing"]} current={currentStep} />

            <div style={{ background: "#fff", borderRadius: 12, border: `1px solid ${c.n200}`, padding: 28 }}>
              {/* Step 1: Route */}
              <SectionHeader number={1} title="Route" active={true} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <FormField label="Origin" required>
                  <div style={{ position: "relative" }}>
                    <MapPin size={16} color={c.p500} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
                    <input
                      value="Charleston, SC"
                      readOnly
                      style={{ width: "100%", padding: "10px 12px 10px 36px", border: `1px solid ${c.p500}`, borderRadius: 8, fontSize: 14, color: c.n800, outline: "none", boxSizing: "border-box", background: c.p50 }}
                    />
                    <Check size={16} color={c.s500} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)" }} />
                  </div>
                </FormField>
                <FormField label="Destination" required>
                  <div style={{ position: "relative" }}>
                    <MapPin size={16} color={c.d500} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
                    <input
                      value="Atlanta, GA"
                      readOnly
                      style={{ width: "100%", padding: "10px 12px 10px 36px", border: `1px solid ${c.p500}`, borderRadius: 8, fontSize: 14, color: c.n800, outline: "none", boxSizing: "border-box", background: c.p50 }}
                    />
                    <Check size={16} color={c.s500} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)" }} />
                  </div>
                </FormField>
              </div>
              <div style={{ background: c.n50, borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8, marginTop: 4, marginBottom: 8 }}>
                <Info size={14} color={c.n400} />
                <span style={{ fontSize: 12, color: c.n500 }}>Estimated distance: <strong style={{ color: c.n700 }}>295 miles</strong> · Avg transit: 5-6 hours</span>
              </div>

              {/* Step 2: Schedule */}
              <SectionHeader number={2} title="Schedule" active={true} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                <FormField label="Pickup Date" required>
                  <div style={{ position: "relative" }}>
                    <Calendar size={16} color={c.n400} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
                    <input value="March 15, 2026" readOnly style={{ width: "100%", padding: "10px 12px 10px 36px", border: `1px solid ${c.n300}`, borderRadius: 8, fontSize: 14, color: c.n800, outline: "none", boxSizing: "border-box", background: "#fff" }} />
                  </div>
                </FormField>
                <FormField label="Pickup Window" hint="Optional">
                  <div style={{ display: "flex", gap: 8 }}>
                    <input value="8:00 AM" readOnly style={{ flex: 1, padding: "10px 12px", border: `1px solid ${c.n300}`, borderRadius: 8, fontSize: 14, color: c.n800, boxSizing: "border-box" }} />
                    <span style={{ alignSelf: "center", color: c.n400, fontSize: 13 }}>to</span>
                    <input value="12:00 PM" readOnly style={{ flex: 1, padding: "10px 12px", border: `1px solid ${c.n300}`, borderRadius: 8, fontSize: 14, color: c.n800, boxSizing: "border-box" }} />
                  </div>
                </FormField>
                <FormField label="Delivery Date" hint="Optional">
                  <div style={{ position: "relative" }}>
                    <Calendar size={16} color={c.n400} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
                    <input value="March 16, 2026" readOnly style={{ width: "100%", padding: "10px 12px 10px 36px", border: `1px solid ${c.n300}`, borderRadius: 8, fontSize: 14, color: c.n800, outline: "none", boxSizing: "border-box" }} />
                  </div>
                </FormField>
              </div>

              {/* Step 3: Freight Details */}
              <SectionHeader number={3} title="Freight Details" active={true} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <SelectField label="Equipment Type" required value="reefer_single" options={[
                  { value: "reefer_single", label: "Reefer Single-Temp" },
                  { value: "reefer_multi", label: "Reefer Multi-Temp" },
                ]} />
                <FormField label="Commodity" required placeholder="e.g. Strawberries, Frozen Shrimp">
                  <input value="Strawberries" readOnly style={{ width: "100%", padding: "10px 12px", border: `1px solid ${c.n300}`, borderRadius: 8, fontSize: 14, color: c.n800, boxSizing: "border-box" }} />
                </FormField>
                <FormField label="Temperature" suffix="°F" required>
                  <div style={{ position: "relative" }}>
                    <Thermometer size={16} color={c.n400} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
                    <input value="34" readOnly style={{ width: "100%", padding: "10px 12px 10px 36px", border: `1px solid ${c.n300}`, borderRadius: 8, fontSize: 14, color: c.n800, boxSizing: "border-box" }} />
                    <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: c.n400, fontSize: 13 }}>°F</span>
                  </div>
                </FormField>
                <FormField label="Weight" suffix="lbs">
                  <div style={{ position: "relative" }}>
                    <input value="42,000" readOnly style={{ width: "100%", padding: "10px 12px", border: `1px solid ${c.n300}`, borderRadius: 8, fontSize: 14, color: c.n800, boxSizing: "border-box" }} />
                    <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: c.n400, fontSize: 13 }}>lbs</span>
                  </div>
                </FormField>
              </div>
              <FormField label="Special Requirements" hint="Optional — temperature constraints, loading instructions, etc.">
                <textarea
                  placeholder="e.g. Must maintain 32-36°F, no stops, lumper included"
                  rows={3}
                  style={{ width: "100%", padding: "10px 12px", border: `1px solid ${c.n300}`, borderRadius: 8, fontSize: 14, color: c.n800, resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }}
                />
              </FormField>

              {/* Step 4: Pricing */}
              <SectionHeader number={4} title="Pricing" active={false} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
                <FormField label="Your Target Rate" prefix="$" hint="Optional — leave blank to let carriers set pricing">
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: c.n400, fontSize: 14, fontWeight: 500 }}>$</span>
                    <input placeholder="1,900" style={{ width: "100%", padding: "10px 12px 10px 28px", border: `1px solid ${c.n300}`, borderRadius: 8, fontSize: 14, color: c.n800, boxSizing: "border-box" }} />
                  </div>
                </FormField>
                <div style={{ paddingTop: 26 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14, color: c.n700 }}>
                    <input type="checkbox" style={{ width: 18, height: 18, accentColor: c.p500 }} />
                    <span>Request quotes from carriers instead</span>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 28, paddingTop: 20, borderTop: `1px solid ${c.n200}` }}>
                <button style={{ padding: "10px 20px", borderRadius: 8, border: `1px solid ${c.n300}`, background: "#fff", fontSize: 14, fontWeight: 500, color: c.n600, cursor: "pointer" }}>
                  Save Draft
                </button>
                <button style={{
                  padding: "10px 24px", borderRadius: 8, border: "none",
                  background: `linear-gradient(135deg, ${c.p500}, ${c.p700})`,
                  fontSize: 14, fontWeight: 600, color: "#fff", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 8,
                  boxShadow: `0 2px 8px ${c.p500}40`
                }}>
                  Post Load & Find Trucks <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* AI Pricing Sidebar */}
          <div style={{ flex: 1, maxWidth: 340, position: "sticky", top: 92 }}>
            <div style={{ background: "#fff", borderRadius: 12, border: `1px solid ${c.n200}`, overflow: "hidden" }}>
              {/* Header */}
              <div style={{ background: `linear-gradient(135deg, ${c.p50}, #e0ecff)`, padding: "18px 20px", borderBottom: `1px solid ${c.n200}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Sparkles size={16} color={c.p600} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: c.p700, textTransform: "uppercase", letterSpacing: "0.05em" }}>AI Pricing Intelligence</span>
                </div>
                <div style={{ fontSize: 12, color: c.n500 }}>Charleston, SC → Atlanta, GA · 295 mi</div>
              </div>

              {/* Rate Recommendation */}
              <div style={{ padding: "20px 20px 16px" }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: c.n500, marginBottom: 6 }}>Recommended Rate</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span style={{ fontSize: 32, fontWeight: 700, color: c.n900, letterSpacing: "-0.02em" }}>$1,850</span>
                  <span style={{ fontSize: 18, color: c.n400, fontWeight: 500 }}>–</span>
                  <span style={{ fontSize: 32, fontWeight: 700, color: c.n900, letterSpacing: "-0.02em" }}>$2,050</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
                  <span style={{ background: c.s50, color: c.s600, padding: "3px 10px", borderRadius: 9999, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.s500 }} />
                    High Confidence
                  </span>
                </div>
              </div>

              {/* Lane Stats */}
              <div style={{ padding: "0 20px 16px" }}>
                <div style={{ background: c.n50, borderRadius: 10, padding: 14 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, color: c.n400, textTransform: "uppercase", fontWeight: 500, letterSpacing: "0.05em" }}>Avg Rate</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: c.n800, marginTop: 2 }}>$1,940</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: c.n400, textTransform: "uppercase", fontWeight: 500, letterSpacing: "0.05em" }}>Per Mile</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: c.n800, marginTop: 2 }}>$6.58</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: c.n400, textTransform: "uppercase", fontWeight: 500, letterSpacing: "0.05em" }}>Transactions</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: c.n800, marginTop: 2 }}>47</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: c.n400, textTransform: "uppercase", fontWeight: 500, letterSpacing: "0.05em" }}>Trend</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: c.s600, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                        <TrendingUp size={14} /> +2.3%
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mini Sparkline Placeholder */}
              <div style={{ padding: "0 20px 16px" }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: c.n500, marginBottom: 8 }}>90-Day Price Trend</div>
                <svg viewBox="0 0 280 60" style={{ width: "100%", height: 60 }}>
                  <defs>
                    <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={c.p500} stopOpacity="0.15" />
                      <stop offset="100%" stopColor={c.p500} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M0,40 Q20,45 40,38 T80,35 T120,30 T160,28 T200,22 T240,18 T280,15" fill="none" stroke={c.p500} strokeWidth="2" />
                  <path d="M0,40 Q20,45 40,38 T80,35 T120,30 T160,28 T200,22 T240,18 T280,15 V60 H0 Z" fill="url(#trendGrad)" />
                </svg>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: c.n400, marginTop: 2 }}>
                  <span>Dec</span><span>Jan</span><span>Feb</span><span>Mar</span>
                </div>
              </div>

              {/* Seasonality Insight */}
              <div style={{ padding: "0 20px 16px" }}>
                <div style={{ background: c.w50, borderRadius: 8, padding: "10px 14px", border: `1px solid ${c.w500}20`, display: "flex", gap: 10 }}>
                  <AlertCircle size={16} color={c.w600} style={{ flexShrink: 0, marginTop: 1 }} />
                  <div style={{ fontSize: 12, color: c.n600, lineHeight: 1.5 }}>
                    <strong>Strawberry season peak</strong> starts mid-March. Expect rates to increase 5-8% through April.
                  </div>
                </div>
              </div>

              {/* Recent Transactions */}
              <div style={{ padding: "0 20px 16px" }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: c.n500, marginBottom: 8 }}>Recent Comparable Loads</div>
                <PricingTxn rate={1900} date="Mar 10, 2026" lane="Charleston → Atlanta" />
                <PricingTxn rate={2010} date="Mar 8, 2026" lane="Charleston → Atlanta" />
                <PricingTxn rate={1875} date="Mar 5, 2026" lane="Savannah → Atlanta" />
                <PricingTxn rate={1940} date="Mar 2, 2026" lane="Charleston → Macon" />
              </div>

              {/* Data Source */}
              <div style={{ padding: "12px 20px", borderTop: `1px solid ${c.n100}`, background: c.n50 }}>
                <div style={{ fontSize: 11, color: c.n400, textAlign: "center" }}>
                  Based on 47 reefer transactions · Last 90 days
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
