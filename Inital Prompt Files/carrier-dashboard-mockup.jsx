import { useState } from "react";
import { Bell, ChevronDown, ChevronRight, LayoutDashboard, Truck, Users, Inbox, BookOpen, Settings, Plus, Package, MapPin, Clock, AlertCircle, Wrench, ArrowRight } from "lucide-react";

const c = {
  p50: "#eff6ff", p100: "#dbeafe", p500: "#3b82f6", p600: "#2563eb", p700: "#1d4ed8",
  s50: "#f0fdf4", s500: "#22c55e", s600: "#16a34a",
  w50: "#fffbeb", w500: "#f59e0b", w600: "#d97706",
  d50: "#fef2f2", d500: "#ef4444",
  n50: "#f9fafb", n100: "#f3f4f6", n200: "#e5e7eb", n300: "#d1d5db", n400: "#9ca3af", n500: "#6b7280", n600: "#4b5563", n700: "#374151", n800: "#1f2937", n900: "#111827",
};

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: Truck, label: "My Trucks" },
  { icon: Users, label: "Drivers" },
  { icon: Inbox, label: "Quote Requests", badge: 4 },
  { icon: BookOpen, label: "Active Loads" },
  { icon: Settings, label: "Settings" },
];

function StatCard({ label, value, icon: Icon, accent, sub }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", border: `1px solid ${c.n200}`, flex: 1, minWidth: 160 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={20} color={c.p600} />
        </div>
      </div>
      <div style={{ marginTop: 14, fontSize: 30, fontWeight: 700, color: c.n900, letterSpacing: "-0.02em" }}>{value}</div>
      <div style={{ fontSize: 14, color: c.n500, marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 12, color: c.n400, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function StatusDot({ status }) {
  const map = {
    available: { color: c.s500, label: "Available" },
    loaded: { color: c.p500, label: "Loaded" },
    in_transit: { color: c.p600, label: "In Transit" },
    maintenance: { color: c.d500, label: "Maintenance" },
    inactive: { color: c.n400, label: "Inactive" },
  };
  const s = map[status] || map.available;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500, color: s.color }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }} />
      {s.label}
    </span>
  );
}

function FreshnessIndicator({ hours }) {
  let color = c.s500;
  let label = "Just now";
  if (hours >= 24) { color = c.n400; label = `${Math.floor(hours)}h ago`; }
  else if (hours >= 4) { color = c.w500; label = `${Math.floor(hours)}h ago`; }
  else if (hours >= 1) { label = `${Math.floor(hours)}h ago`; }
  else { label = `${Math.floor(hours * 60)}m ago`; }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: c.n500 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
      {label}
    </span>
  );
}

const trucks = [
  { id: "#207", equipment: "Reefer Single", driver: "Joe Martinez", status: "available", city: "Charleston", state: "SC", updated: 0.5 },
  { id: "#44", equipment: "Reefer Single", driver: "Mike Richardson", status: "loaded", city: "Savannah", state: "GA", updated: 1.2 },
  { id: "#112", equipment: "Reefer Multi", driver: null, status: "maintenance", city: "Jacksonville", state: "FL", updated: 48 },
  { id: "#89", equipment: "Reefer Single", driver: "Tony Lewis", status: "in_transit", city: "Atlanta", state: "GA", updated: 0.3 },
  { id: "#301", equipment: "Reefer Single", driver: "Sam Kim", status: "available", city: "Miami", state: "FL", updated: 2.1 },
];

const quoteRequests = [
  { origin: "Charleston, SC", dest: "Atlanta, GA", date: "Mar 15", commodity: "Strawberries", temp: 34, matchedTruck: "#207", distance: 18, time: "25 min ago" },
  { origin: "Savannah, GA", dest: "Miami, FL", date: "Mar 18", commodity: "Frozen Shrimp", temp: 0, matchedTruck: "#44", distance: 12, time: "1 hour ago" },
  { origin: "Jacksonville, FL", dest: "Charlotte, NC", date: "Mar 20", commodity: "Produce Mix", temp: 36, matchedTruck: "#301", distance: 89, time: "3 hours ago" },
  { origin: "Atlanta, GA", dest: "Savannah, GA", date: "Mar 22", commodity: "Dairy", temp: 38, matchedTruck: "#89", distance: 5, time: "5 hours ago" },
];

export default function CarrierDashboard() {
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
            <span style={{ position: "absolute", top: 4, right: 4, width: 18, height: 18, background: c.d500, borderRadius: 9999, color: "#fff", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>4</span>
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 12px", borderRadius: 8, cursor: "pointer" }}>
            <div style={{ width: 34, height: 34, borderRadius: 9999, background: `linear-gradient(135deg, ${c.s50}, ${c.s500})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 600 }}>CR</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: c.n800 }}>Coastal Reefer LLC</div>
              <div style={{ fontSize: 11, color: c.n500 }}>Carrier · MC-482910</div>
            </div>
            <ChevronDown size={14} color={c.n400} />
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

          {/* Fleet Health Mini */}
          <div style={{ marginTop: 28, padding: "16px 12px", background: c.n50, borderRadius: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: c.n600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Fleet Health</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              {[c.s500, c.s500, c.p500, c.p500, c.d500].map((color, i) => (
                <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: color }} />
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: c.n500 }}>
              <span>2 available</span>
              <span>2 active</span>
              <span>1 maint</span>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main style={{ flex: 1, padding: "28px 32px", maxWidth: 1200 }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 700, color: c.n900, margin: 0 }}>Dashboard</h1>
              <p style={{ fontSize: 14, color: c.n500, margin: "4px 0 0 0" }}>Manage your fleet and respond to load opportunities</p>
            </div>
            <button style={{ background: c.p500, color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: `0 1px 3px ${c.p500}40` }}>
              <Plus size={18} /> Add Truck
            </button>
          </div>

          {/* Stat Cards */}
          <div style={{ display: "flex", gap: 16, marginBottom: 28 }}>
            <StatCard icon={Truck} label="Total Trucks" value="5" accent={c.p50} sub="2 available · 2 loaded · 1 maintenance" />
            <StatCard icon={Package} label="Active Loads" value="2" accent={c.s50} />
            <StatCard icon={Inbox} label="Quote Requests" value="4" accent={c.w50} sub="4 new, awaiting response" />
            <StatCard icon={MapPin} label="Coverage Area" value="4" accent={c.p50} sub="SC, GA, FL, NC" />
          </div>

          {/* My Fleet Table */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: c.n900, margin: 0 }}>My Fleet</h2>
              <span style={{ fontSize: 13, color: c.p500, cursor: "pointer", fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}>
                Manage all trucks <ChevronRight size={14} />
              </span>
            </div>
            <div style={{ background: "#fff", borderRadius: 12, border: `1px solid ${c.n200}`, overflow: "hidden" }}>
              {/* Table Header */}
              <div style={{ display: "grid", gridTemplateColumns: "80px 140px 160px 120px 140px 100px 80px", padding: "12px 20px", background: c.n50, borderBottom: `1px solid ${c.n200}`, fontSize: 12, fontWeight: 600, color: c.n500, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                <span>Truck</span>
                <span>Equipment</span>
                <span>Driver</span>
                <span>Status</span>
                <span>Location</span>
                <span>Updated</span>
                <span></span>
              </div>
              {/* Table Rows */}
              {trucks.map((truck, i) => (
                <div key={i} style={{
                  display: "grid", gridTemplateColumns: "80px 140px 160px 120px 140px 100px 80px",
                  padding: "14px 20px", borderBottom: i < trucks.length - 1 ? `1px solid ${c.n100}` : "none",
                  alignItems: "center", fontSize: 14,
                  background: truck.status === "maintenance" ? c.d50 + "60" : "#fff",
                }}>
                  <span style={{ fontWeight: 600, color: c.n800 }}>{truck.id}</span>
                  <span style={{ color: c.n600, fontSize: 13 }}>{truck.equipment}</span>
                  <span style={{ color: truck.driver ? c.n700 : c.n400, fontSize: 13 }}>
                    {truck.driver || "Unassigned"}
                    {!truck.driver && (
                      <span style={{ marginLeft: 6, fontSize: 11, color: c.w600, fontWeight: 500 }}>⚠</span>
                    )}
                  </span>
                  <StatusDot status={truck.status} />
                  <span style={{ color: c.n600, fontSize: 13, display: "flex", alignItems: "center", gap: 4 }}>
                    <MapPin size={12} color={c.n400} />
                    {truck.city}, {truck.state}
                  </span>
                  <FreshnessIndicator hours={truck.updated} />
                  <button style={{ background: "none", border: `1px solid ${c.n300}`, borderRadius: 6, padding: "4px 10px", fontSize: 12, color: c.n600, cursor: "pointer" }}>
                    Edit
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Maintenance Alert */}
          <div style={{ background: c.d50, border: `1px solid ${c.d500}25`, borderRadius: 10, padding: "14px 20px", display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Wrench size={18} color={c.d500} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: c.n800 }}>Truck #112 needs attention</div>
              <div style={{ fontSize: 13, color: c.n600, marginTop: 2 }}>No driver assigned · In maintenance for 48 hours · Location stale</div>
            </div>
            <button style={{ background: "#fff", border: `1px solid ${c.n300}`, borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 500, color: c.n700, cursor: "pointer", whiteSpace: "nowrap" }}>
              Update Status
            </button>
          </div>

          {/* Quote Requests */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: c.n900, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                New Quote Requests
                <span style={{ background: c.d500, color: "#fff", fontSize: 12, fontWeight: 600, padding: "2px 8px", borderRadius: 9999 }}>4</span>
              </h2>
              <span style={{ fontSize: 13, color: c.p500, cursor: "pointer", fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}>
                View all requests <ChevronRight size={14} />
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {quoteRequests.map((req, i) => (
                <div key={i} style={{ background: "#fff", borderRadius: 10, border: `1px solid ${c.n200}`, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", gap: 16, alignItems: "center", flex: 1 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: c.p50, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Package size={18} color={c.p500} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: 14, color: c.n900 }}>{req.origin}</span>
                        <ArrowRight size={14} color={c.n400} />
                        <span style={{ fontWeight: 600, fontSize: 14, color: c.n900 }}>{req.dest}</span>
                      </div>
                      <div style={{ fontSize: 13, color: c.n500, marginTop: 4, display: "flex", gap: 12, flexWrap: "wrap" }}>
                        <span>{req.date}</span>
                        <span>·</span>
                        <span>{req.commodity}</span>
                        <span>·</span>
                        <span>{req.temp}°F</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: c.s600, display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
                        <Truck size={14} />
                        Truck {req.matchedTruck}
                      </div>
                      <div style={{ fontSize: 12, color: c.n500, marginTop: 2 }}>
                        {req.distance} mi from pickup · {req.time}
                      </div>
                    </div>
                    <button style={{ background: c.p500, color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}>
                      View & Quote <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
