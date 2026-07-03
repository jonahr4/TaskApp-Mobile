import type { UserData, Metrics, ChartDatum } from "./types";

/* ── Firestore timestamp → JS Date ── */
export function getFirestoreDate(ts: any): Date {
  if (!ts) return new Date(0);
  if (typeof ts.toDate === "function") return ts.toDate();
  if (ts.seconds) return new Date(ts.seconds * 1000);
  if (typeof ts === "string") return new Date(ts);
  return new Date(0);
}

/* ── Best "last active" considering both lastSeenAt and dailyUsage ── */
export function getLastActive(user: UserData): Date {
  const lastSeen = getFirestoreDate(user.lastSeenAt);

  if (user.dailyUsage) {
    const dates = Object.keys(user.dailyUsage).sort();
    if (dates.length > 0) {
      /* Use end-of-day for the most recent dailyUsage date */
      const latest = new Date(dates[dates.length - 1] + "T23:59:59");
      if (latest > lastSeen) return latest;
    }
  }

  return lastSeen;
}

/* ── Time-relative formatting ── */
export function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

/* ── Number formatting ── */
export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(0)}K`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

/* ── Chart palette ── */
const SOURCE_COLORS: Record<string, string> = {
  tasks: "#0052FF",
  ai: "#8B5CF6",
  calendar: "#10B981",
  matrix: "#F59E0B",
};

const PROVIDER_COLORS: Record<string, string> = {
  "google.com": "#4285F4",
  "apple.com": "#1D1D1F",
  password: "#10B981",
};

const PROVIDER_LABELS: Record<string, string> = {
  "google.com": "Google",
  "apple.com": "Apple",
  password: "Email",
};

const DEVICE_COLORS = [
  "#0052FF",
  "#4D7CFF",
  "#8B5CF6",
  "#10B981",
  "#F59E0B",
  "#EC4899",
  "#64748B",
  "#06B6D4",
];

/* ── Aggregate all userData documents → Metrics ── */
export function computeMetrics(users: UserData[]): Metrics {
  const now = Date.now();
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

  const totalUsers = users.length;

  const activeUsers7d = users.filter(
    (u) => now - getFirestoreDate(u.lastSeenAt).getTime() < SEVEN_DAYS
  ).length;

  const activeUsers30d = users.filter(
    (u) => now - getFirestoreDate(u.lastSeenAt).getTime() < THIRTY_DAYS
  ).length;

  const newUsersThisWeek = users.filter(
    (u) => now - getFirestoreDate(u.createdAt).getTime() < SEVEN_DAYS
  ).length;

  const totalTasks = users.reduce((s, u) => s + (u.taskCount || 0), 0);
  const totalCompleted = users.reduce((s, u) => s + (u.tasksCompleted || 0), 0);
  const completionRate = totalTasks > 0 ? (totalCompleted / totalTasks) * 100 : 0;

  const totalAiParses = users.reduce((s, u) => s + (u.aiPromptsCount || 0), 0);
  const aiSuccessCount = users.reduce(
    (s, u) => s + (u.aiParseSuccessCount || 0),
    0
  );
  const aiSuccessRate =
    totalAiParses > 0 ? (aiSuccessCount / totalAiParses) * 100 : 0;

  const avgTasksPerUser = totalUsers > 0 ? totalTasks / totalUsers : 0;

  const avgStreak =
    totalUsers > 0
      ? users.reduce((s, u) => s + (u.streakData?.current || 0), 0) /
        totalUsers
      : 0;

  const longestStreak = Math.max(
    0,
    ...users.map((u) => u.streakData?.longest || 0)
  );

  const onboardingCompleted = users.filter((u) => u.onboardingCompleted).length;
  const onboardingRate =
    totalUsers > 0 ? (onboardingCompleted / totalUsers) * 100 : 0;

  /* Task creation sources */
  const tasksBySource: ChartDatum[] = [
    {
      name: "Task List",
      value: users.reduce((s, u) => s + (u.tasksCreatedFromTasks || 0), 0),
      color: SOURCE_COLORS.tasks,
    },
    {
      name: "AI Assistant",
      value: users.reduce((s, u) => s + (u.tasksCreatedFromAI || 0), 0),
      color: SOURCE_COLORS.ai,
    },
    {
      name: "Calendar",
      value: users.reduce((s, u) => s + (u.tasksCreatedFromCalendar || 0), 0),
      color: SOURCE_COLORS.calendar,
    },
    {
      name: "Matrix",
      value: users.reduce((s, u) => s + (u.tasksCreatedFromMatrix || 0), 0),
      color: SOURCE_COLORS.matrix,
    },
  ].filter((s) => s.value > 0);

  /* Sign-in providers */
  const providerMap: Record<string, number> = {};
  users.forEach((u) => {
    const p = u.provider || "unknown";
    providerMap[p] = (providerMap[p] || 0) + 1;
  });
  const providerBreakdown: ChartDatum[] = Object.entries(providerMap).map(
    ([key, value]) => ({
      name: PROVIDER_LABELS[key] || key,
      value,
      color: PROVIDER_COLORS[key] || "#94A3B8",
    })
  );

  /* Devices */
  const deviceMap: Record<string, number> = {};
  users.forEach((u) => {
    const d = u.deviceModel || "Unknown";
    deviceMap[d] = (deviceMap[d] || 0) + 1;
  });
  const deviceBreakdown = Object.entries(deviceMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  /* App versions */
  const versionMap: Record<string, number> = {};
  users.forEach((u) => {
    const v = u.appVersion || "Unknown";
    versionMap[v] = (versionMap[v] || 0) + 1;
  });
  const versionBreakdown = Object.entries(versionMap)
    .map(([name, value]) => ({ name: name === "Unknown" ? name : `v${name}`, value }))
    .sort((a, b) => b.value - a.value);

  /* Daily activity — aggregate all users' dailyUsage for last 30 days */
  const dailyMap: Record<string, { created: number; completed: number }> = {};
  users.forEach((u) => {
    if (!u.dailyUsage) return;
    for (const [date, data] of Object.entries(u.dailyUsage)) {
      if (!dailyMap[date]) dailyMap[date] = { created: 0, completed: 0 };
      dailyMap[date].created += (data as any).created || 0;
      dailyMap[date].completed += (data as any).completed || 0;
    }
  });

  const dailyActivity: { date: string; created: number; completed: number }[] =
    [];
  const thirtyDaysAgoDate = new Date(now - THIRTY_DAYS);
  for (
    let d = new Date(thirtyDaysAgoDate);
    d <= new Date();
    d.setDate(d.getDate() + 1)
  ) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${day}`;
    dailyActivity.push({
      date: dateStr,
      created: dailyMap[dateStr]?.created || 0,
      completed: dailyMap[dateStr]?.completed || 0,
    });
  }

  return {
    totalUsers,
    activeUsers7d,
    activeUsers30d,
    newUsersThisWeek,
    totalTasks,
    totalCompleted,
    completionRate,
    totalAiParses,
    aiSuccessRate,
    avgTasksPerUser,
    avgStreak,
    longestStreak,
    onboardingRate,
    tasksBySource,
    providerBreakdown,
    deviceBreakdown,
    versionBreakdown,
    dailyActivity,
  };
}

export { DEVICE_COLORS };
