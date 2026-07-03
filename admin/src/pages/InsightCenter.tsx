import { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import type { UserData, Metrics } from "../types";
import { getFirestoreDate, formatNumber } from "../utils";

/* ── Helpers ── */
function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en", { month: "short", day: "numeric" });
}

function formatDateFull(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function ds(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* ── Section Label ── */
function Label({ text }: { text: string }) {
  return (
    <div className="inline-flex items-center gap-2.5 rounded-full border border-accent/30 bg-accent/5 px-4 py-1.5 mb-4">
      <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse-dot" />
      <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-accent font-medium">{text}</span>
    </div>
  );
}

/* ── Stat Card ── */
function StatCard({ value, label, sub, color = "var(--color-accent)" }: { value: string | number; label: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-soft relative overflow-hidden group hover:shadow-elevated transition-shadow">
      <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-5 blur-[60px]" style={{ background: color }} />
      <div className="text-3xl font-bold tracking-tight mb-1" style={{ color }}>{value}</div>
      <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
      {sub && <div className="text-[10px] text-muted-foreground/60 mt-1">{sub}</div>}
    </div>
  );
}

/* ── Custom Tooltip ── */
function TimelineTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-elevated px-3 py-2.5 text-xs">
      <p className="font-medium text-foreground mb-1.5">{formatDateFull(label)}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-semibold text-foreground">{entry.value}</span>
        </p>
      ))}
      <p className="text-[10px] text-muted-foreground/50 mt-1.5 border-t border-border pt-1.5">Click to drill in</p>
    </div>
  );
}

/* ════════════════════════════════════════════════════════ */
/*  INSIGHT CENTER                                         */
/* ════════════════════════════════════════════════════════ */

interface InsightCenterProps {
  users: UserData[];
  metrics: Metrics;
  onSelectUser: (user: UserData) => void;
}

export function InsightCenter({ users, metrics, onSelectUser }: InsightCenterProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  /* ── 60-day timeline from dailyUsage ── */
  const timeline = useMemo(() => {
    const now = new Date();
    const points: { date: string; label: string; created: number; completed: number; activeUsers: number }[] = [];
    for (let i = 59; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dStr = ds(d);
      let created = 0, completed = 0, activeUsers = 0;
      users.forEach((u) => {
        const usage = u.dailyUsage?.[dStr];
        if (usage && ((usage.created || 0) > 0 || (usage.completed || 0) > 0)) {
          created += usage.created || 0;
          completed += usage.completed || 0;
          activeUsers++;
        }
      });
      points.push({ date: dStr, label: formatDateLabel(dStr), created, completed, activeUsers });
    }
    return points;
  }, [users]);

  /* ── Summary stats ── */
  const stats = useMemo(() => {
    const last7 = timeline.slice(-7);
    const prev7 = timeline.slice(-14, -7);
    const created7d = last7.reduce((s, p) => s + p.created, 0);
    const completed7d = last7.reduce((s, p) => s + p.completed, 0);
    const createdPrev = prev7.reduce((s, p) => s + p.created, 0);
    const peakDay = [...timeline].sort((a, b) => (b.created + b.completed) - (a.created + a.completed))[0];
    const avgDailyActive = (timeline.slice(-30).reduce((s, p) => s + p.activeUsers, 0) / 30).toFixed(1);
    const totalEvents = timeline.reduce((s, p) => s + p.created + p.completed, 0);
    return { created7d, completed7d, createdPrev, peakDay, avgDailyActive, totalEvents };
  }, [timeline]);

  /* ── Day detail ── */
  const dayDetail = useMemo(() => {
    if (!selectedDate) return null;
    return users
      .map((u) => {
        const usage = u.dailyUsage?.[selectedDate];
        const created = usage?.created || 0;
        const completed = usage?.completed || 0;
        if (created === 0 && completed === 0) return null;
        return { user: u, created, completed, total: created + completed };
      })
      .filter(Boolean) as { user: UserData; created: number; completed: number; total: number }[];
  }, [selectedDate, users]);

  /* ── Heatmap data (top 12 × 30 days) ── */
  const { heatmapUsers, heatmapDates } = useMemo(() => {
    const now = new Date();
    const dates: string[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      dates.push(ds(d));
    }
    const scored = users.map((u) => {
      let total = 0;
      if (u.dailyUsage) Object.values(u.dailyUsage).forEach((d: any) => { total += (d.created || 0) + (d.completed || 0); });
      return { user: u, total };
    });
    scored.sort((a, b) => b.total - a.total);
    return { heatmapUsers: scored.slice(0, 12).map((s) => s.user), heatmapDates: dates };
  }, [users]);

  const heatmapMax = useMemo(() => {
    let max = 1;
    heatmapUsers.forEach((u) => heatmapDates.forEach((d) => {
      const total = (u.dailyUsage?.[d]?.created || 0) + (u.dailyUsage?.[d]?.completed || 0);
      if (total > max) max = total;
    }));
    return max;
  }, [heatmapUsers, heatmapDates]);

  /* ── Flow data ── */
  const funnelData = [
    { name: "Tasks Created", value: metrics.totalTasks, color: "#0052FF" },
    { name: "AI Assisted", value: metrics.totalAiParses, color: "#8B5CF6" },
    { name: "Completed", value: metrics.totalCompleted, color: "#10B981" },
  ];

  /* ── Event breakdown ── */
  const eventBreakdown = useMemo(() => {
    return [
      { name: "Tasks Created", value: metrics.totalTasks, color: "#0052FF" },
      { name: "Tasks Completed", value: metrics.totalCompleted, color: "#10B981" },
      { name: "AI Parses", value: metrics.totalAiParses, color: "#8B5CF6" },
      { name: "From Calendar", value: users.reduce((s, u) => s + (u.tasksCreatedFromCalendar || 0), 0), color: "#06B6D4" },
      { name: "From Matrix", value: users.reduce((s, u) => s + (u.tasksCreatedFromMatrix || 0), 0), color: "#F59E0B" },
    ].filter((d) => d.value > 0);
  }, [metrics, users]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="mb-10 animate-fade-in-up">
        <Label text="Insight Center" />
        <h2 className="font-display text-3xl sm:text-4xl mb-2">
          Command <span className="gradient-text">Center</span>
        </h2>
        <p className="text-sm text-muted-foreground">{users.length} users across {timeline.filter((p) => p.created + p.completed > 0).length} active days</p>
      </div>

      {/* ── Metric Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        <StatCard value={formatNumber(stats.totalEvents)} label="Total Activity" sub="All task events" color="#0052FF" />
        <StatCard value={stats.avgDailyActive} label="Avg Active / Day" sub="Last 30 days" color="#06B6D4" />
        <StatCard
          value={formatNumber(stats.created7d)}
          label="Created (7d)"
          sub={stats.createdPrev > 0 ? `${stats.created7d >= stats.createdPrev ? "+" : ""}${((stats.created7d / stats.createdPrev - 1) * 100).toFixed(0)}% vs prev week` : "No prev data"}
          color="#8B5CF6"
        />
        <StatCard value={formatNumber(stats.completed7d)} label="Completed (7d)" sub={`${metrics.completionRate.toFixed(0)}% overall rate`} color="#10B981" />
      </div>

      {/* ── Activity Timeline ── */}
      <div className="mb-8 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
        <Label text="Activity Timeline" />
        <h3 className="font-display text-xl mb-1">60-Day <span className="gradient-text">Overview</span></h3>
        <p className="text-xs text-muted-foreground mb-5">Click any day to see who was active</p>

        <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={timeline} onClick={(e: any) => { if (e?.activePayload?.[0]) setSelectedDate(e.activePayload[0].payload.date); }} style={{ cursor: "pointer" }}>
              <defs>
                <linearGradient id="gcreated" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0052FF" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#0052FF" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gcompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94A3B8" }} tickFormatter={(v: string) => formatDateLabel(v)} interval={9} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} width={30} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<TimelineTooltip />} />
              <Area type="monotone" dataKey="created" stroke="#0052FF" fill="url(#gcreated)" strokeWidth={2} name="Created" dot={false} activeDot={{ r: 5, stroke: "#0052FF", strokeWidth: 2, fill: "white" }} />
              <Area type="monotone" dataKey="completed" stroke="#10B981" fill="url(#gcompleted)" strokeWidth={2} name="Completed" dot={false} activeDot={{ r: 5, stroke: "#10B981", strokeWidth: 2, fill: "white" }} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex gap-6 justify-center mt-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="w-3 h-0.5 rounded-full bg-[#0052FF]" /> Created</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="w-3 h-0.5 rounded-full bg-[#10B981]" /> Completed</div>
          </div>
        </div>
      </div>

      {/* ── Day Detail Panel ── */}
      {selectedDate && dayDetail && (
        <div className="mb-8 animate-fade-in-up">
          <div className="rounded-xl border-2 border-accent/20 bg-card overflow-hidden shadow-soft">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between bg-accent/[0.02]">
              <div>
                <h4 className="text-sm font-semibold">{formatDateFull(selectedDate)}</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {dayDetail.length} active user{dayDetail.length !== 1 ? "s" : ""} · {dayDetail.reduce((s, d) => s + d.created, 0)} created · {dayDetail.reduce((s, d) => s + d.completed, 0)} completed
                </p>
              </div>
              <button onClick={() => setSelectedDate(null)} className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer text-xs px-2 py-1 rounded hover:bg-muted">
                Close
              </button>
            </div>

            {dayDetail.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No activity on this day</p>
            ) : (
              <div className="divide-y divide-border">
                <div className="grid grid-cols-[1fr_5rem_5rem_5rem_5rem] gap-3 px-5 py-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider bg-muted/30">
                  <span>User</span>
                  <span className="text-right">Created</span>
                  <span className="text-right">Completed</span>
                  <span className="text-right">Total</span>
                  <span className="text-right"></span>
                </div>
                {dayDetail.map((d) => (
                  <div key={d.user.uid} className="grid grid-cols-[1fr_5rem_5rem_5rem_5rem] gap-3 px-5 py-2.5 hover:bg-accent/[0.02] transition-colors group">
                    <button
                      onClick={() => onSelectUser(d.user)}
                      className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer"
                    >
                      {d.user.photoURL ? (
                        <img src={d.user.photoURL} alt="" className="w-7 h-7 rounded-full border border-border" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent to-accent-secondary flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                          {(d.user.displayName || d.user.email || "?")[0].toUpperCase()}
                        </div>
                      )}
                      <span className="text-sm truncate group-hover:text-accent transition-colors font-medium">
                        {d.user.displayName || "Anonymous"}
                      </span>
                    </button>
                    <span className="text-sm text-accent text-right font-medium flex items-center justify-end">{d.created}</span>
                    <span className="text-sm text-success text-right font-medium flex items-center justify-end">{d.completed}</span>
                    <span className="text-sm text-foreground text-right font-bold flex items-center justify-end">{d.total}</span>
                    <span className="flex items-center justify-end">
                      <button
                        onClick={() => onSelectUser(d.user)}
                        className="text-[10px] text-accent/60 hover:text-accent transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                      >
                        View All →
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── User Activity Heatmap ── */}
      <div className="mb-12 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
        <Label text="User Activity" />
        <h3 className="font-display text-xl mb-1">Activity <span className="gradient-text">Grid</span></h3>
        <p className="text-xs text-muted-foreground mb-5">Top {heatmapUsers.length} users × 30 days — click any cell to drill in</p>

        <div className="rounded-xl border border-border bg-card p-5 shadow-soft overflow-x-auto">
          <div className="min-w-[600px]">
            <div className="flex gap-[3px] mb-1 ml-[120px]">
              {heatmapDates.map((d, i) => (
                <div key={d} className="flex-1 text-center">
                  {i % 5 === 0 && <span className="text-[8px] text-muted-foreground/50">{formatDateLabel(d).split(" ")[1]}</span>}
                </div>
              ))}
            </div>

            {heatmapUsers.map((u) => (
              <div key={u.uid} className="flex items-center gap-[3px] mb-[3px]">
                <button
                  onClick={() => onSelectUser(u)}
                  className="w-[117px] shrink-0 text-[11px] text-muted-foreground truncate pr-2 text-left hover:text-accent transition-colors cursor-pointer"
                >
                  {u.displayName || u.email?.split("@")[0] || "Anonymous"}
                </button>
                {heatmapDates.map((d) => {
                  const total = (u.dailyUsage?.[d]?.created || 0) + (u.dailyUsage?.[d]?.completed || 0);
                  const intensity = total / heatmapMax;
                  const isSelected = d === selectedDate;
                  return (
                    <button
                      key={d}
                      onClick={() => setSelectedDate(d)}
                      className={`flex-1 h-5 rounded-[3px] transition-all cursor-pointer hover:ring-1 hover:ring-accent/30 ${isSelected ? "ring-2 ring-accent" : ""}`}
                      style={{
                        background: total === 0 ? "var(--color-muted)" : `rgba(0, 82, 255, ${0.1 + intensity * 0.6})`,
                      }}
                      title={`${u.displayName || "User"} · ${formatDateLabel(d)} · ${total} tasks`}
                    />
                  );
                })}
              </div>
            ))}

            <div className="flex items-center gap-2 mt-3 ml-[120px]">
              <span className="text-[9px] text-muted-foreground/40">Less</span>
              {[0, 0.25, 0.5, 0.75, 1].map((v) => (
                <div key={v} className="w-4 h-4 rounded-[3px]" style={{ background: v === 0 ? "var(--color-muted)" : `rgba(0, 82, 255, ${0.1 + v * 0.6})` }} />
              ))}
              <span className="text-[9px] text-muted-foreground/40">More</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
        {/* Task Flow */}
        <div className="animate-fade-in-up" style={{ animationDelay: "300ms" }}>
          <Label text="Flow" />
          <h3 className="font-display text-xl mb-5">Task <span className="gradient-text">Lifecycle</span></h3>
          <div className="rounded-xl border border-border bg-card p-6 shadow-soft">
            <div className="space-y-4">
              {funnelData.map((item) => {
                const maxVal = Math.max(...funnelData.map((d) => d.value), 1);
                return (
                  <div key={item.name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-muted-foreground">{item.name}</span>
                      <span className="text-sm font-bold" style={{ color: item.color }}>{formatNumber(item.value)}</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(item.value / maxVal) * 100}%`, background: `linear-gradient(90deg, ${item.color}, ${item.color}80)` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-3 mt-6 pt-4 border-t border-border">
              <div className="text-center">
                <div className="text-lg font-bold text-accent">{metrics.completionRate.toFixed(0)}%</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Completion Rate</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold" style={{ color: "#8B5CF6" }}>{metrics.aiSuccessRate.toFixed(0)}%</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">AI Success Rate</div>
              </div>
            </div>
          </div>
        </div>

        {/* Event Breakdown */}
        <div className="animate-fade-in-up" style={{ animationDelay: "400ms" }}>
          <Label text="Breakdown" />
          <h3 className="font-display text-xl mb-5">Event <span className="gradient-text">Distribution</span></h3>
          <div className="rounded-xl border border-border bg-card p-6 shadow-soft">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={eventBreakdown} layout="vertical" margin={{ left: 0, right: 10 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#64748B" }} width={100} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "white", border: "1px solid #E2E8F0", borderRadius: "8px", fontSize: "12px" }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={18} name="Count">
                  {eventBreakdown.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 pt-4 border-t border-border">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Creation Sources</div>
              <div className="flex flex-wrap gap-3">
                {metrics.tasksBySource.map((s) => (
                  <div key={s.name} className="flex items-center gap-1.5 text-xs">
                    <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                    <span className="text-muted-foreground">{s.name}</span>
                    <span className="font-medium">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Peak Day */}
      {stats.peakDay && stats.peakDay.created + stats.peakDay.completed > 0 && (
        <button
          onClick={() => setSelectedDate(stats.peakDay.date)}
          className="w-full rounded-xl border border-accent/20 bg-accent/[0.02] p-6 mb-8 animate-fade-in-up cursor-pointer hover:bg-accent/[0.04] transition-colors text-left"
          style={{ animationDelay: "500ms" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono mb-1">Peak Activity Day</div>
              <div className="text-lg font-semibold">{formatDateFull(stats.peakDay.date)}</div>
            </div>
            <div className="flex items-center gap-8">
              <div className="text-right">
                <div className="text-2xl font-bold text-accent">{stats.peakDay.created}</div>
                <div className="text-[10px] text-muted-foreground">Created</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-success">{stats.peakDay.completed}</div>
                <div className="text-[10px] text-muted-foreground">Completed</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{stats.peakDay.activeUsers}</div>
                <div className="text-[10px] text-muted-foreground">Users</div>
              </div>
            </div>
          </div>
        </button>
      )}

      <footer className="text-center py-6">
        <p className="text-[11px] text-muted-foreground/40">
          Insight Center · {users.length} users · 0 additional Firestore reads
        </p>
      </footer>
    </div>
  );
}
