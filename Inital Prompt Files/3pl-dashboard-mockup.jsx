import { useState } from "react";
import { Bell, ChevronRight, FileText, LayoutDashboard, Truck, Inbox, BookOpen, DollarSign, Settings, Plus, TrendingUp, TrendingDown, Clock, Package, CheckCircle2, AlertTriangle, ChevronDown } from "lucide-react";

const colors = {
  primary50: "#eff6ff", primary100: "#dbeafe", primary500: "#3b82f6", primary600: "#2563eb", primary700: "#1d4ed8",
  success50: "#f0fdf4", success500: "#22c55e", success600: "#16a34a",
  warning50: "#fffbeb", warning500: "#f59e0b", warning600: "#d97706",
  danger50: "#fef2f2", danger500: "#ef4444",
  n50: "#f9fafb", n100: "#f3f4f6", n200: "#e5e7eb", n300: "#d1d5db", n400: "#9ca3af", n500: "#6b7280", n600: "#4b5563", n700: "#374151", n800: "#1f2937", n900: "#111827",
};

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: Plus, label: "Post Load", active: false },
  { icon: FileText, label: "My Loads", active: false },
  { icon: Inbox, label: "Quote Inbox", badge: 5, active: false },
  { icon: BookOpen, label: "Active Bookings", active: false },
  { icon: DollarSign, label: "Pricing Tool", active: false },
  { icon: Settings, label: "Settings", active: false },
];

function StatusBadge({ status }) {
  const map = {
    active: { bg: "#dcfce7", color: "#15803d", label: "Active" },
    quoting: { bg: "#dbeafe", color: "#1d4ed8", label: "Quoting" },
    pending: { bg: "#fef3c7", color: "#92400e", label: "Pending" },
    delivered: { bg: "#dcfce7", color: "#15803d", label: "Delivered" },
    booked: { bg: "#dbeafe", color: "#1d4ed8", label: "Booked" },
    expiring: { bg: "#fef2f2", color: "#dc2626", label: "Expiring" },
  };
  const s = map[status] || map.active;
  return (
    <span style={{ background: s.bg, color: s.color, padding: "2px 10px", borderRadius: 9999, fontSize: 12, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color }} />
      {s.label}
    </span>
  );
}

function StatCard({ label, value, trend, trendUp, icon: Icon, accent }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", border: `1px solid ${colors.n200}`, flex: 1, minWidth: 180 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: accent || colors.primary50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={20} color={colors.primary600} />
        </div>
        {trend && (
          <span style={{ fontSize: 12, fontWeight: 500, color: trendUp ? colors.success600 : colors.danger500, display: "flex", alignItems: "center", gap: 2 }}>
            {trendUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {trend}
          </span>
        )}
      </div>
      <div style={{ marginTop: 16, fontSize: 30, fontWeight: 700, color: colors.n900, letterSpacing: "-0.02em" }}>{value}</div>
      <div style={{ fontSize: 14, color: colors.n500, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function LoadAttentionCard({ origin, destination, date, commodity, temp, quoteCount, status, urgency }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: urgency ? colors.warning50 : "#fff", borderRadius: 10, border: `1px solid ${urgency ? colors.warning500 + "40" : colors.n200}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, flex: 1 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: colors.primary50, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Package size={18} color={colors.primary500} />
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: colors.n900 }}>
            {origin} → {destination}
          </div>
          <div style={{ fontSize: 13, color: colors.n500, marginTop: 2 }}>
            {date} · {commodity} · {temp}°F
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ textAlign: "right" }}>
          {urgency && (
            <div style={{ fontSize: 12, color: colors.warning600, fontWeight: 500, display: "flex", alignItems: "center", gap: 4, marginBottom: 4, justifyContent: "flex-end" }}>
              <AlertTriangle size={12} /> {urgency}
            </div>
          )}
          <span style={{ fontSize: 13, color: colors.n600 }}>
            {quoteCount > 0 ? `${quoteCount} quotes` : "No quotes yet"}
          </span>
        </div>
        <button style={{ background: colors.primary500, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" }}>
          {quoteCount > 0 ? "View Quotes" : "Find Trucks"}
        </button>
      </div>
    </div>
  );
}

function ActivityItem({ icon, iconBg, iconColor, title, subtitle, time }) {
  return (
    <div style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: `1px solid ${colors.n100}` }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, color: colors.n800, fontWeight: 500 }}>{title}</div>
        <div style={{ fontSize: 13, color: colors.n500, marginTop: 2 }}>{subtitle}</div>
      </div>
      <div style={{ fontSize: 12, color: colors.n400, whiteSpace: "nowrap" }}>{time}</div>
    </div>
  );
}

export default function ThreePLDashboard() {
  const [notifOpen, setNotifOpen] = useState(false);

  return (
    <div style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif", background: colors.n50, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Google Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Top Bar */}
      <header style={{ height: 64, background: "#fff", borderBottom: `1px solid ${colors.n200}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, background: `linear-gradient(135deg, ${colors.primary500}, ${colors.primary700})`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Truck size={18} color="#fff" />
          </div>
          <span style={{ fontSize: 18, fontWeight: 700, color: colors.n900, letterSpacing: "-0.01em" }}>ColdHaul</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ position: "relative" }}>
            <button onClick={() => setNotifOpen(!notifOpen)} style={{ background: "none", border: "none", cursor: "pointer", padding: 8, borderRadius: 8, display: "flex", position: "relative" }}>
              <Bell size={20} color={colors.n600} />
              <span style={{ position: "absolute", top: 4, right: 4, width: 18, height: 18, background: colors.danger500, borderRadius: 9999, color: "#fff", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>3</span>
            </button>
            {notifOpen && (
              <div style={{ position: "absolute", right: 0, top: 44, width: 360, background: "#fff", borderRadius: 12, boxShadow: "0 10px 40px rgba(0,0,0,0.12)", border: `1px solid ${colors.n200}`, zIndex: 100, overflow: "hidden" }}>
                <div style={{ padding: "14px 16px", borderBottom: `1px solid ${colors.n100}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 600, fontSize: 14, color: colors.n900 }}>Notifications</span>
                  <span style={{ fontSize: 12, color: colors.primary500, cursor: "pointer", fontWeight: 500 }}>Mark all read</span>
                </div>
                {[
                  { title: "New quote from Coastal Reefer", body: "$1,920 for Charleston → Atlanta", time: "5m ago", unread: true },
                  { title: "Quote accepted", body: "Palmetto Cold booked for Savannah → Miami", time: "1h ago", unread: true },
                  { title: "Load delivered", body: "Jacksonville → Charlotte completed", time: "3h ago", unread: false },
                ].map((n, i) => (
                  <div key={i} style={{ padding: "12px 16px", borderBottom: `1px solid ${colors.n100}`, background: n.unread ? colors.primary50 : "#fff", cursor: "pointer" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: colors.n800 }}>{n.title}</span>
                      {n.unread && <span style={{ width: 8, height: 8, borderRadius: "50%", background: colors.primary500, flexShrink: 0, marginTop: 4 }} />}
                    </div>
                    <div style={{ fontSize: 12, color: colors.n500, marginTop: 2 }}>{n.body}</div>
                    <div style={{ fontSize: 11, color: colors.n400, marginTop: 4 }}>{n.time}</div>
                  </div>
                ))}
                <div style={{ padding: "12px 16px", textAlign: "center" }}>
                  <span style={{ fontSize: 13, color: colors.primary500, fontWeight: 500, cursor: "pointer" }}>View all notifications</span>
                </div>
              </div>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 12px", borderRadius: 8, cursor: "pointer" }}>
            <div style={{ width: 34, height: 34, borderRadius: 9999, background: `linear-gradient(135deg, ${colors.primary100}, ${colors.primary500})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 600 }}>JC</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: colors.n800 }}>Lowcountry Logistics</div>
              <div style={{ fontSize: 11, color: colors.n500 }}>3PL · Charleston, SC</div>
            </div>
            <ChevronDown size={14} color={colors.n400} />
          </div>
        </div>
      </header>

      <div style={{ display: "flex", flex: 1 }}>
        {/* Sidebar */}
        <aside style={{ width: 240, background: "#fff", borderRight: `1px solid ${colors.n200}`, padding: "24px 12px", flexShrink: 0, position: "sticky", top: 64, height: "calc(100vh - 64px)", overflowY: "auto" }}>
          <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {sidebarItems.map((item, i) => (
              <a key={i} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, fontSize: 14, fontWeight: item.active ? 500 : 400,
                color: item.active ? colors.primary600 : colors.n600, background: item.active ? colors.primary50 : "transparent",
                textDecoration: "none", cursor: "pointer", borderLeft: item.active ? `3px solid ${colors.primary500}` : "3px solid transparent",
                transition: "all 0.15s"
              }}>
                <item.icon size={18} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge && (
                  <span style={{ background: colors.danger500, color: "#fff", fontSize: 11, fontWeight: 600, padding: "1px 7px", borderRadius: 9999 }}>{item.badge}</span>
                )}
              </a>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main style={{ flex: 1, padding: "28px 32px", maxWidth: 1200 }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 700, color: colors.n900, margin: 0 }}>Dashboard</h1>
              <p style={{ fontSize: 14, color: colors.n500, margin: "4px 0 0 0" }}>Welcome back — here's your activity overview</p>
            </div>
            <button style={{ background: colors.primary500, color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: `0 1px 3px ${colors.primary500}40` }}>
              <Plus size={18} /> Post Load
            </button>
          </div>

          {/* Stat Cards */}
          <div style={{ display: "flex", gap: 16, marginBottom: 28 }}>
            <StatCard icon={Package} label="Active Loads" value="8" trend="+2 this week" trendUp accent={colors.primary50} />
            <StatCard icon={Inbox} label="Pending Quotes" value="14" trend="+5 new" trendUp accent={colors.warning50} />
            <StatCard icon={FileText} label="Loads This Month" value="23" trend="+15% vs last" trendUp accent={colors.success50} />
            <StatCard icon={DollarSign} label="Avg Cost Savings" value="6.2%" trend="+1.1% vs last" trendUp accent={colors.success50} />
          </div>

          {/* Loads Needing Attention */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: colors.n900, margin: 0 }}>Loads Needing Attention</h2>
              <span style={{ fontSize: 13, color: colors.primary500, cursor: "pointer", fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}>
                View all loads <ChevronRight size={14} />
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <LoadAttentionCard origin="Charleston, SC" destination="Atlanta, GA" date="Mar 15" commodity="Strawberries" temp={34} quoteCount={5} status="quoting" />
              <LoadAttentionCard origin="Savannah, GA" destination="Miami, FL" date="Mar 18" commodity="Frozen Shrimp" temp={0} quoteCount={2} status="expiring" urgency="Quote expires in 2 hours" />
              <LoadAttentionCard origin="Jacksonville, FL" destination="Charlotte, NC" date="Mar 20" commodity="Produce Mix" temp={36} quoteCount={0} status="pending" />
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: colors.n900, margin: 0 }}>Recent Activity</h2>
            </div>
            <div style={{ background: "#fff", borderRadius: 12, border: `1px solid ${colors.n200}`, padding: "4px 20px" }}>
              <ActivityItem
                icon={<CheckCircle2 size={16} color={colors.success600} />}
                iconBg={colors.success50} iconColor={colors.success600}
                title="Quote accepted — Coastal Reefer"
                subtitle="Charleston, SC → Atlanta, GA · $1,920"
                time="25 min ago"
              />
              <ActivityItem
                icon={<Inbox size={16} color={colors.primary500} />}
                iconBg={colors.primary50} iconColor={colors.primary500}
                title="3 new quotes received"
                subtitle="Savannah, GA → Miami, FL · Lowest: $2,340"
                time="1 hour ago"
              />
              <ActivityItem
                icon={<Truck size={16} color={colors.success600} />}
                iconBg={colors.success50} iconColor={colors.success600}
                title="Load delivered"
                subtitle="Jacksonville, FL → Charlotte, NC · Palmetto Cold"
                time="3 hours ago"
              />
              <ActivityItem
                icon={<Package size={16} color={colors.primary500} />}
                iconBg={colors.primary50} iconColor={colors.primary500}
                title="Load posted — requesting quotes"
                subtitle="Jacksonville, FL → Charlotte, NC · Produce Mix"
                time="5 hours ago"
              />
              <ActivityItem
                icon={<DollarSign size={16} color={colors.warning500} />}
                iconBg={colors.warning50} iconColor={colors.warning500}
                title="Quote expired"
                subtitle="Atlanta, GA → Savannah, GA · Dixie Freight withdrew"
                time="Yesterday"
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
