import { useState, useEffect, useMemo } from "react";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import type { UserData, Task, TaskGroup, AnalyticsEvent } from "../types";
import { getFirestoreDate, getLastActive, timeAgo, formatNumber } from "../utils";

interface UserDetailProps {
  user: UserData;
  onClose: () => void;
}

/* ── Priority helpers ── */
function getQuadrant(t: Task) {
  if (t.urgent === null || t.important === null) return null;
  if (t.urgent && t.important) return "DO";
  if (!t.urgent && t.important) return "SCHEDULE";
  if (t.urgent && !t.important) return "DELEGATE";
  return "ELIMINATE";
}

const QUADRANT_STYLE: Record<string, { label: string; cls: string }> = {
  DO: { label: "Do First", cls: "bg-red-50 text-red-600 border-red-200" },
  SCHEDULE: { label: "Schedule", cls: "bg-blue-50 text-blue-600 border-blue-200" },
  DELEGATE: { label: "Delegate", cls: "bg-amber-50 text-amber-600 border-amber-200" },
  ELIMINATE: { label: "Eliminate", cls: "bg-gray-50 text-gray-500 border-gray-200" },
};

const SOURCE_LABELS: Record<string, string> = {
  tasks: "Manual",
  ai: "AI",
  calendar: "Calendar",
  matrix: "Matrix",
};

/* ── Sub-components ── */
function StatRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

function SourceBar({ label, value, maxValue, color }: { label: string; value: number; maxValue: number; color: string }) {
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-20 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-medium w-8 text-right">{value}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
      {children}
    </h4>
  );
}

function TaskRow({ task, groupName }: { task: Task; groupName?: string }) {
  const q = getQuadrant(task);
  const created = getFirestoreDate(task.createdAt);
  const updated = getFirestoreDate(task.updatedAt);
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 py-3 text-left hover:bg-accent/[0.02] transition-colors cursor-pointer px-1"
      >
        {/* Status */}
        <div className="mt-0.5 shrink-0">
          {task.completed ? (
            <div className="w-5 h-5 rounded-full bg-success/10 border border-success/30 flex items-center justify-center">
              <svg className="w-3 h-3 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
          ) : (
            <div className="w-5 h-5 rounded-full border-2 border-border" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className={`text-sm leading-snug ${task.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
            {task.title}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            {q && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${QUADRANT_STYLE[q].cls}`}>
                {QUADRANT_STYLE[q].label}
              </span>
            )}
            {task.createdFrom && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/5 text-accent border border-accent/20 font-medium">
                {SOURCE_LABELS[task.createdFrom] || task.createdFrom}
              </span>
            )}
            {groupName && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet/5 text-violet border border-violet/20 font-medium">
                {groupName}
              </span>
            )}
            <span className="text-[10px] text-muted-foreground/60">
              {timeAgo(created)}
            </span>
          </div>
        </div>

        {/* Expand chevron */}
        <svg
          className={`w-4 h-4 text-muted-foreground/40 mt-1 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="pl-11 pr-3 pb-3 space-y-1.5 animate-fade-in">
          {task.notes && (
            <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 leading-relaxed">
              {task.notes}
            </p>
          )}
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-muted-foreground/60">Created</span>
              <span className="text-foreground">{created.toLocaleString("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
            </div>
            {task.completed && (
              <div className="flex justify-between">
                <span className="text-muted-foreground/60">Completed</span>
                <span className="text-success">{updated.toLocaleString("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
              </div>
            )}
            {task.dueDate && (
              <div className="flex justify-between">
                <span className="text-muted-foreground/60">Due</span>
                <span className="text-foreground">
                  {(() => {
                    const d = new Date(task.dueDate + "T" + (task.dueTime || "00:00"));
                    return d.toLocaleString("en", { month: "short", day: "numeric", ...(task.dueTime ? { hour: "numeric", minute: "2-digit" } : {}) });
                  })()}
                </span>
              </div>
            )}
            {task.location && (
              <div className="flex justify-between">
                <span className="text-muted-foreground/60">Location</span>
                <span className="text-foreground truncate ml-2">{task.location}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground/60">Priority</span>
              <span className="text-foreground">
                {(() => {
                  const q = getQuadrant(task);
                  if (!q) return "Unset";
                  return QUADRANT_STYLE[q]?.label || q;
                })()}
              </span>
            </div>
            {groupName && (
              <div className="flex justify-between">
                <span className="text-muted-foreground/60">Group</span>
                <span className="text-foreground">{groupName}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Events Analysis ── */
function EventsAnalysis({ events }: { events: AnalyticsEvent[] }) {
  const analysis = useMemo(() => {
    const tabViews: Record<string, number> = {};
    let taskCreated = 0;
    let taskCompleted = 0;
    let aiParseCount = 0;
    const aiSources: Record<string, number> = {};
    let onboarded = false;

    /* Hourly activity heatmap (0-23) */
    const hourlyActivity = new Array(24).fill(0);

    /* Daily event counts (last 14 days) */
    const now = Date.now();
    const FOURTEEN_DAYS = 14 * 24 * 60 * 60 * 1000;
    const dailyCounts: Record<string, number> = {};

    events.forEach((e) => {
      const ts = getFirestoreDate(e.ts);

      /* Hourly heatmap */
      if (ts.getTime() > 0) {
        hourlyActivity[ts.getHours()]++;
      }

      /* Daily counts (last 14d) */
      if (now - ts.getTime() < FOURTEEN_DAYS) {
        const dateStr = ts.toISOString().split("T")[0];
        dailyCounts[dateStr] = (dailyCounts[dateStr] || 0) + 1;
      }

      switch (e.name) {
        case "tab_view":
          tabViews[e.tab || "unknown"] = (tabViews[e.tab || "unknown"] || 0) + 1;
          break;
        case "task_created":
          taskCreated++;
          break;
        case "task_completed":
          taskCompleted++;
          break;
        case "ai_parse":
          aiParseCount++;
          if (e.source) aiSources[e.source] = (aiSources[e.source] || 0) + 1;
          break;
        case "onboarding_completed":
          onboarded = true;
          break;
      }
    });

    /* Peak hour */
    const peakHour = hourlyActivity.indexOf(Math.max(...hourlyActivity));
    const peakHourLabel =
      peakHour === 0 ? "12 AM" : peakHour < 12 ? `${peakHour} AM` : peakHour === 12 ? "12 PM" : `${peakHour - 12} PM`;

    /* Most used tab */
    const mostUsedTab = Object.entries(tabViews).sort((a, b) => b[1] - a[1])[0];

    /* Active days in last 14 */
    const activeDays = Object.keys(dailyCounts).length;

    return {
      totalEvents: events.length,
      tabViews,
      taskCreated,
      taskCompleted,
      aiParseCount,
      aiSources,
      onboarded,
      hourlyActivity,
      peakHourLabel,
      peakHour,
      mostUsedTab,
      activeDays,
    };
  }, [events]);

  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No events tracked yet
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Key metrics */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { value: analysis.totalEvents, label: "Events" },
          { value: analysis.activeDays, label: "Active Days (14d)" },
          { value: analysis.peakHourLabel, label: "Peak Hour" },
        ].map((stat, i) => (
          <div key={i} className="bg-muted/50 rounded-lg p-2.5 text-center">
            <div className="text-base font-bold">{stat.value}</div>
            <div className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Tab Usage */}
      {Object.keys(analysis.tabViews).length > 0 && (
        <div>
          <div className="text-[11px] font-medium text-muted-foreground mb-2">Tab Usage</div>
          <div className="space-y-1.5">
            {Object.entries(analysis.tabViews)
              .sort((a, b) => b[1] - a[1])
              .map(([tab, count]) => {
                const max = Math.max(...Object.values(analysis.tabViews));
                const pct = max > 0 ? (count / max) * 100 : 0;
                return (
                  <div key={tab} className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground w-16 capitalize shrink-0">{tab}</span>
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[11px] font-medium w-8 text-right">{count}</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Hourly Heatmap */}
      <div>
        <div className="text-[11px] font-medium text-muted-foreground mb-2">Hourly Activity</div>
        <div className="flex gap-[2px]">
          {analysis.hourlyActivity.map((count, hour) => {
            const max = Math.max(...analysis.hourlyActivity, 1);
            const intensity = count / max;
            return (
              <div
                key={hour}
                className="flex-1 rounded-sm relative group"
                style={{
                  height: "24px",
                  background: count === 0 ? "#F1F5F9" : `rgba(0, 82, 255, ${0.15 + intensity * 0.85})`,
                }}
                title={`${hour}:00 — ${count} events`}
              >
                {/* Tooltip on hover */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                  <div className="bg-foreground text-white text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap">
                    {hour}:00 · {count}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[9px] text-muted-foreground/50">12am</span>
          <span className="text-[9px] text-muted-foreground/50">6am</span>
          <span className="text-[9px] text-muted-foreground/50">12pm</span>
          <span className="text-[9px] text-muted-foreground/50">6pm</span>
          <span className="text-[9px] text-muted-foreground/50">12am</span>
        </div>
      </div>

      {/* Event Breakdown */}
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="flex justify-between bg-muted/30 rounded-lg px-3 py-2">
          <span className="text-muted-foreground">Tasks Created</span>
          <span className="font-medium">{analysis.taskCreated}</span>
        </div>
        <div className="flex justify-between bg-muted/30 rounded-lg px-3 py-2">
          <span className="text-muted-foreground">Tasks Completed</span>
          <span className="font-medium">{analysis.taskCompleted}</span>
        </div>
        <div className="flex justify-between bg-muted/30 rounded-lg px-3 py-2">
          <span className="text-muted-foreground">AI Parses</span>
          <span className="font-medium">{analysis.aiParseCount}</span>
        </div>
        {analysis.mostUsedTab && (
          <div className="flex justify-between bg-muted/30 rounded-lg px-3 py-2">
            <span className="text-muted-foreground">Favorite Tab</span>
            <span className="font-medium capitalize">{analysis.mostUsedTab[0]}</span>
          </div>
        )}
      </div>

      {/* AI Sources */}
      {Object.keys(analysis.aiSources).length > 0 && (
        <div>
          <div className="text-[11px] font-medium text-muted-foreground mb-1.5">AI Parse Sources</div>
          <div className="flex gap-2">
            {Object.entries(analysis.aiSources).map(([source, count]) => (
              <span key={source} className="text-[10px] px-2 py-1 rounded-md bg-violet/5 text-violet border border-violet/20 font-medium">
                {source}: {count}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main Component ── */
export function UserDetail({ user, onClose }: UserDetailProps) {
  const lastSeen = getLastActive(user);
  const createdAt = getFirestoreDate(user.createdAt);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [groups, setGroups] = useState<TaskGroup[]>([]);
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [taskFilter, setTaskFilter] = useState<"all" | "active" | "completed">("all");
  const [activeTab, setActiveTab] = useState<"tasks" | "events">("tasks");

  /* Fetch tasks + groups */
  useEffect(() => {
    async function fetchData() {
      try {
        const [taskSnap, groupSnap] = await Promise.all([
          getDocs(query(collection(db, "users", user.uid, "tasks"), orderBy("createdAt", "desc"))),
          getDocs(collection(db, "users", user.uid, "taskGroups")),
        ]);
        setTasks(taskSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Task)));
        setGroups(groupSnap.docs.map((d) => ({ id: d.id, ...d.data() } as TaskGroup)));
      } catch (err: any) {
        console.error("Failed to fetch tasks:", err);
        setTasksError(
          err?.code === "permission-denied"
            ? "Update Firestore rules to allow admin read on users collection."
            : "Failed to load tasks."
        );
      } finally {
        setTasksLoading(false);
      }
    }
    fetchData();
  }, [user.uid]);

  /* Fetch events */
  useEffect(() => {
    async function fetchEvents() {
      try {
        const snap = await getDocs(
          query(collection(db, "users", user.uid, "events"), orderBy("ts", "desc"))
        );
        setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() } as AnalyticsEvent)));
      } catch {
        /* Events may not exist — that's fine */
      } finally {
        setEventsLoading(false);
      }
    }
    fetchEvents();
  }, [user.uid]);

  /* Group ID → name map */
  const groupMap = useMemo(() => {
    const m = new Map<string, string>();
    groups.forEach((g) => m.set(g.id, g.name));
    return m;
  }, [groups]);

  const filteredTasks = tasks.filter((t) => {
    if (taskFilter === "active") return !t.completed;
    if (taskFilter === "completed") return t.completed;
    return true;
  });

  const sources = [
    { label: "Task List", value: user.tasksCreatedFromTasks || 0, color: "#0052FF" },
    { label: "AI", value: user.tasksCreatedFromAI || 0, color: "#8B5CF6" },
    { label: "Calendar", value: user.tasksCreatedFromCalendar || 0, color: "#10B981" },
    { label: "Matrix", value: user.tasksCreatedFromMatrix || 0, color: "#F59E0B" },
  ];
  const maxSource = Math.max(...sources.map((s) => s.value), 1);

  const providerLabel: Record<string, string> = {
    "google.com": "Google",
    "apple.com": "Apple",
    password: "Email",
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />

      <div className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-lg bg-card border-l border-border shadow-elevated overflow-y-auto animate-slide-in">
        {/* Header */}
        <div className="sticky top-0 bg-card/90 backdrop-blur-xl border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <h2 className="font-semibold text-sm">User Detail</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground cursor-pointer">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Profile */}
          <div className="flex items-center gap-4">
            {user.photoURL ? (
              <img src={user.photoURL} alt="" className="w-14 h-14 rounded-full border-2 border-border" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-accent to-accent-secondary flex items-center justify-center text-white text-xl font-bold">
                {(user.displayName || user.email || "?")[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <h3 className="font-semibold text-lg truncate">{user.displayName || "Anonymous"}</h3>
              <p className="text-sm text-muted-foreground truncate">{user.email || "No email"}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs px-2 py-0.5 rounded-full bg-accent/8 text-accent font-medium">
                  {providerLabel[user.provider || ""] || user.provider || "Unknown"}
                </span>
                {user.onboardingCompleted && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success font-medium">Onboarded</span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: user.taskCount || 0, label: "Tasks" },
              { value: user.tasksCompleted || 0, label: "Completed" },
              { value: user.aiPromptsCount || 0, label: "AI Parses" },
            ].map((stat, i) => (
              <div key={i} className="bg-muted/50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold">{formatNumber(stat.value)}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Creation Sources */}
          <div>
            <SectionTitle>Task Creation Sources</SectionTitle>
            <div className="space-y-2.5">
              {sources.map((s, i) => (
                <SourceBar key={i} {...s} maxValue={maxSource} />
              ))}
            </div>
          </div>

          {/* Groups */}
          {groups.length > 0 && (
            <div>
              <SectionTitle>Task Groups ({groups.length})</SectionTitle>
              <div className="flex flex-wrap gap-2">
                {groups.map((g) => {
                  const taskCount = tasks.filter((t) => t.groupId === g.id).length;
                  return (
                    <div
                      key={g.id}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-muted/30 text-xs"
                    >
                      {g.color && (
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ background: g.color }} />
                      )}
                      <span className="font-medium">{g.name}</span>
                      <span className="text-muted-foreground/60">{taskCount}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Streak */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200/50">
            <SectionTitle>Streak</SectionTitle>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-2xl font-bold text-amber-700">
                  {user.streakData?.current || 0}
                  <span className="text-sm font-normal text-amber-600/70 ml-1">days</span>
                </div>
                <div className="text-xs text-amber-600/60">Current</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-700">
                  {user.streakData?.longest || 0}
                  <span className="text-sm font-normal text-amber-600/70 ml-1">days</span>
                </div>
                <div className="text-xs text-amber-600/60">Best Ever</div>
              </div>
            </div>
          </div>

          {/* Tab switcher: Tasks / Events */}
          <div>
            <div className="flex gap-1 p-1 bg-muted/50 rounded-lg mb-4">
              {(["tasks", "events"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 text-xs font-medium py-2 rounded-md transition-all cursor-pointer ${
                    activeTab === tab
                      ? "bg-card text-foreground shadow-soft"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab === "tasks" ? `Tasks (${tasks.length})` : `Events (${events.length})`}
                </button>
              ))}
            </div>

            {activeTab === "tasks" && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] text-muted-foreground">
                    {filteredTasks.length} {taskFilter !== "all" ? taskFilter : ""} task{filteredTasks.length !== 1 ? "s" : ""}
                  </span>
                  <div className="flex gap-1">
                    {(["all", "active", "completed"] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setTaskFilter(f)}
                        className={`text-[11px] px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                          taskFilter === f ? "bg-accent text-white" : "text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {tasksLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : tasksError ? (
                  <div className="bg-danger/5 border border-danger/20 rounded-lg px-3 py-2.5 text-xs text-danger">
                    {tasksError}
                  </div>
                ) : filteredTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No {taskFilter !== "all" ? taskFilter : ""} tasks
                  </p>
                ) : (
                  <div className="max-h-[400px] overflow-y-auto rounded-lg border border-border bg-muted/20 px-2">
                    {filteredTasks.map((task) => (
                      <TaskRow key={task.id} task={task} groupName={task.groupId ? groupMap.get(task.groupId) : undefined} />
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab === "events" && (
              <>
                {eventsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <EventsAnalysis events={events} />
                )}
              </>
            )}
          </div>

          {/* Account Details */}
          <div>
            <SectionTitle>Account Details</SectionTitle>
            <div className="bg-muted/30 rounded-xl px-4 divide-y divide-border">
              <StatRow label="AI Rate Limit" value={`${user.dailyAiLimit || 25} / day`} />
              <StatRow
                label="AI Success"
                value={user.aiPromptsCount > 0 ? `${(((user.aiParseSuccessCount || 0) / user.aiPromptsCount) * 100).toFixed(0)}%` : "—"}
              />
              <StatRow label="Device" value={user.deviceModel || "Unknown"} />
              <StatRow label="OS" value={user.osVersion ? `iOS ${user.osVersion}` : "Unknown"} />
              <StatRow label="App Version" value={user.appVersion ? `v${user.appVersion} (b${user.appBuild || "?"})` : "Unknown"} />
              <StatRow label="Timezone" value={user.timezone || "Unknown"} />
              <StatRow label="Joined" value={createdAt.getTime() > 0 ? createdAt.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" }) : "Unknown"} />
              <StatRow label="Last Active" value={lastSeen.getTime() > 0 ? timeAgo(lastSeen) : "Never"} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
