import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { UserData } from "../types";
import { getFirestoreDate, getLastActive, timeAgo } from "../utils";

/* ── Helpers ── */
function ds(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function weekLabel(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en", { month: "short", day: "numeric" });
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
function StatCard({ value, label, sub, color = "#0052FF" }: { value: string | number; label: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-soft relative overflow-hidden">
      <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-5 blur-[60px]" style={{ background: color }} />
      <div className="text-3xl font-bold tracking-tight mb-1" style={{ color }}>{value}</div>
      <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
      {sub && <div className="text-[10px] text-muted-foreground/60 mt-1">{sub}</div>}
    </div>
  );
}

/* ── User Card ── */
function UserCard({ user, onSelect, rank }: { user: UserData; onSelect: () => void; rank?: number }) {
  const created = getFirestoreDate(user.createdAt);
  const lastSeen = getLastActive(user);
  const daysSinceJoin = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));
  const isNew = daysSinceJoin <= 7;
  const isActive = Date.now() - lastSeen.getTime() < 7 * 24 * 60 * 60 * 1000;

  return (
    <button
      onClick={onSelect}
      className="w-full text-left rounded-xl border border-border bg-card p-4 shadow-soft hover:shadow-elevated hover:border-accent/20 transition-all cursor-pointer group"
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="relative shrink-0">
          {user.photoURL ? (
            <img src={user.photoURL} alt="" className="w-10 h-10 rounded-full border border-border" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-accent-secondary flex items-center justify-center text-white text-sm font-bold">
              {(user.displayName || user.email || "?")[0].toUpperCase()}
            </div>
          )}
          {isActive && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success border-2 border-card" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate group-hover:text-accent transition-colors">
              {user.displayName || "Anonymous"}
            </span>
            {isNew && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent font-bold uppercase tracking-wider shrink-0">
                New
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{user.email || "No email"}</p>

          {/* Metadata row */}
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <span className="text-[10px] text-muted-foreground">
              Joined {created.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}
            </span>
            <span className="text-[10px] text-muted-foreground/30">·</span>
            <span className={`text-[10px] font-medium ${isActive ? "text-success" : "text-muted-foreground/60"}`}>
              {isActive ? `Active ${timeAgo(lastSeen)}` : `Last seen ${timeAgo(lastSeen)}`}
            </span>
          </div>

          {/* Progress indicators */}
          <div className="flex gap-2 mt-2.5">
            <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${
              user.onboardingCompleted
                ? "bg-success/10 text-success"
                : "bg-muted text-muted-foreground/60"
            }`}>
              {user.onboardingCompleted ? "Onboarded" : "Not Onboarded"}
            </span>
            {(user.taskCount || 0) > 0 && (
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-accent/8 text-accent font-medium">
                {user.taskCount} tasks
              </span>
            )}
            {(user.streakData?.current || 0) > 0 && (
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                {user.streakData?.current}d streak
              </span>
            )}
          </div>
        </div>

        {/* Rank badge */}
        {rank !== undefined && (
          <span className="text-lg font-bold text-muted-foreground/20 shrink-0">#{rank + 1}</span>
        )}
      </div>
    </button>
  );
}

/* ── Tooltip ── */
function GrowthTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-elevated px-3 py-2 text-xs">
      <p className="font-medium text-foreground mb-1">Week of {label}</p>
      <p className="text-muted-foreground">Sign-ups: <span className="font-bold text-accent">{payload[0].value}</span></p>
    </div>
  );
}

/* ════════════════════════════════════════════════════════ */
/*  NEW SIGN-UPS PAGE                                      */
/* ════════════════════════════════════════════════════════ */

interface NewSignupsProps {
  users: UserData[];
  onSelectUser: (user: UserData) => void;
}

export function NewSignups({ users, onSelectUser }: NewSignupsProps) {
  /* ── Sort users by join date (newest first) ── */
  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) =>
      getFirestoreDate(b.createdAt).getTime() - getFirestoreDate(a.createdAt).getTime()
    );
  }, [users]);

  /* ── Weekly sign-up chart (last 12 weeks) ── */
  const weeklyData = useMemo(() => {
    const now = new Date();
    const weeks: { week: string; signups: number }[] = [];

    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - i * 7);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // start of week
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const count = users.filter((u) => {
        const joined = getFirestoreDate(u.createdAt);
        return joined >= weekStart && joined < weekEnd;
      }).length;

      weeks.push({ week: weekLabel(ds(weekStart)), signups: count });
    }
    return weeks;
  }, [users]);

  /* ── Growth metrics ── */
  const growth = useMemo(() => {
    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;

    const last7d = users.filter((u) => now - getFirestoreDate(u.createdAt).getTime() < 7 * DAY).length;
    const last30d = users.filter((u) => now - getFirestoreDate(u.createdAt).getTime() < 30 * DAY).length;
    const prev30d = users.filter((u) => {
      const t = now - getFirestoreDate(u.createdAt).getTime();
      return t >= 30 * DAY && t < 60 * DAY;
    }).length;

    const onboarded = users.filter((u) => u.onboardingCompleted).length;
    const withTasks = users.filter((u) => (u.taskCount || 0) > 0).length;
    const active7d = users.filter((u) => now - getFirestoreDate(u.lastSeenAt).getTime() < 7 * DAY).length;

    const onboardingRate = users.length > 0 ? ((onboarded / users.length) * 100).toFixed(0) : "0";
    const activationRate = users.length > 0 ? ((withTasks / users.length) * 100).toFixed(0) : "0";
    const retentionRate = users.length > 0 ? ((active7d / users.length) * 100).toFixed(0) : "0";

    return { last7d, last30d, prev30d, onboarded, withTasks, active7d, onboardingRate, activationRate, retentionRate, total: users.length };
  }, [users]);

  /* ── Funnel data ── */
  const funnelSteps = [
    { label: "Signed Up", value: growth.total, color: "#0052FF" },
    { label: "Onboarded", value: growth.onboarded, color: "#8B5CF6" },
    { label: "Created Tasks", value: growth.withTasks, color: "#F59E0B" },
    { label: "Active (7d)", value: growth.active7d, color: "#10B981" },
  ];
  const funnelMax = Math.max(...funnelSteps.map((s) => s.value), 1);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="mb-10 animate-fade-in-up">
        <Label text="New Users" />
        <h2 className="font-display text-3xl sm:text-4xl mb-2">
          Sign-up <span className="gradient-text">Tracker</span>
        </h2>
        <p className="text-sm text-muted-foreground">{growth.total} total users · {growth.last7d} this week</p>
      </div>

      {/* ── Metric Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        <StatCard value={growth.last7d} label="This Week" sub={growth.last30d > 0 ? `${growth.last30d} this month` : ""} color="#0052FF" />
        <StatCard
          value={`${growth.onboardingRate}%`}
          label="Onboarding Rate"
          sub={`${growth.onboarded} of ${growth.total} onboarded`}
          color="#8B5CF6"
        />
        <StatCard
          value={`${growth.activationRate}%`}
          label="Activation Rate"
          sub={`${growth.withTasks} created tasks`}
          color="#F59E0B"
        />
        <StatCard
          value={`${growth.retentionRate}%`}
          label="7d Retention"
          sub={`${growth.active7d} active this week`}
          color="#10B981"
        />
      </div>

      {/* ── Weekly Sign-up Chart ── */}
      <div className="mb-8 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
        <Label text="Growth" />
        <h3 className="font-display text-xl mb-5">Weekly <span className="gradient-text">Sign-ups</span></h3>

        <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={weeklyData}>
              <defs>
                <linearGradient id="gsignups" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0052FF" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#0052FF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} width={25} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<GrowthTooltip />} />
              <Area type="monotone" dataKey="signups" stroke="#0052FF" fill="url(#gsignups)" strokeWidth={2} dot={{ r: 3, fill: "#0052FF", stroke: "white", strokeWidth: 2 }} activeDot={{ r: 5, stroke: "#0052FF", strokeWidth: 2, fill: "white" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Onboarding Funnel ── */}
      <div className="mb-12 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
        <Label text="Funnel" />
        <h3 className="font-display text-xl mb-5">User <span className="gradient-text">Journey</span></h3>

        <div className="rounded-xl border border-border bg-card p-6 shadow-soft">
          <div className="space-y-3">
            {funnelSteps.map((step, i) => {
              const pct = (step.value / funnelMax) * 100;
              const dropoff = i > 0 ? (((funnelSteps[i - 1].value - step.value) / funnelSteps[i - 1].value) * 100).toFixed(0) : null;
              return (
                <div key={step.label}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{step.label}</span>
                      {dropoff && parseInt(dropoff) > 0 && (
                        <span className="text-[9px] text-danger/70">-{dropoff}%</span>
                      )}
                    </div>
                    <span className="text-sm font-bold" style={{ color: step.color }}>{step.value}</span>
                  </div>
                  <div className="h-4 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pct}%`,
                        background: `linear-gradient(90deg, ${step.color}, ${step.color}80)`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Recent Sign-ups List ── */}
      <div className="mb-8 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
        <Label text="All Users" />
        <h3 className="font-display text-xl mb-5">Newest <span className="gradient-text">Members</span></h3>

        <div className="grid gap-3">
          {sortedUsers.map((user, i) => (
            <UserCard key={user.uid} user={user} onSelect={() => onSelectUser(user)} rank={i} />
          ))}
        </div>

        {sortedUsers.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-12">No users yet</p>
        )}
      </div>

      <footer className="text-center py-6">
        <p className="text-[11px] text-muted-foreground/40">
          Sign-up Tracker · {users.length} total users
        </p>
      </footer>
    </div>
  );
}
