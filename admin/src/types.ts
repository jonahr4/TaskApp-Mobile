/* ── Firestore Types ── */

export interface StreakData {
  current: number;
  longest: number;
  lastCompletedDate: string | null;
}

export interface DailyUsageEntry {
  created: number;
  completed: number;
}

/**
 * Mirrors the `userData/{uid}` Firestore document from the mobile app.
 * Firestore timestamps come as objects with `seconds` / `toDate()`.
 */
export interface UserData {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  provider: string | null;
  createdAt: any;
  lastSeenAt: any;

  deviceModel: string | null;
  osVersion: string | null;
  appVersion: string | null;
  appBuild: string | null;
  timezone: string;

  taskCount: number;
  tasksCreatedFromTasks: number;
  tasksCreatedFromAI: number;
  tasksCreatedFromCalendar: number;
  tasksCreatedFromMatrix: number;
  tasksCompleted: number;

  dailyUsage?: Record<string, DailyUsageEntry>;

  aiPromptsCount: number;
  aiParseSuccessCount: number;
  aiParseFailCount: number;

  dailyAiLimit: number;

  streakData: StreakData;

  onboardingCompleted: boolean;
}

/* ── Task (from users/{uid}/tasks/{taskId}) ── */
export interface Task {
  id: string;
  title: string;
  notes?: string;
  urgent: boolean | null;
  important: boolean | null;
  dueDate: string | null;
  dueTime: string | null;
  groupId: string | null;
  completed: boolean;
  location?: string | null;
  order: number;
  createdFrom?: string | null;
  createdAt: any;
  updatedAt: any;
  /* Enriched by admin dashboard (not in Firestore) */
  _userId?: string;
  _userName?: string;
}

/* ── Task Group (from users/{uid}/taskGroups/{groupId}) ── */
export interface TaskGroup {
  id: string;
  name: string;
  color: string | null;
  order: number;
  createdAt: any;
}

/* ── Analytics Event (from users/{uid}/events/{eventId}) ── */
export interface AnalyticsEvent {
  id: string;
  name: "tab_view" | "task_created" | "task_completed" | "ai_parse" | "onboarding_completed";
  ts: any;
  tab?: string;
  source?: string;
  [key: string]: any;
}

/* ── Computed Metrics ── */

export interface ChartDatum {
  name: string;
  value: number;
  color: string;
}

export interface DailyActivityPoint {
  date: string;
  created: number;
  completed: number;
}

export interface Metrics {
  totalUsers: number;
  activeUsers7d: number;
  activeUsers30d: number;
  newUsersThisWeek: number;
  totalTasks: number;
  totalCompleted: number;
  completionRate: number;
  totalAiParses: number;
  aiSuccessRate: number;
  avgTasksPerUser: number;
  avgStreak: number;
  longestStreak: number;
  onboardingRate: number;
  tasksBySource: ChartDatum[];
  providerBreakdown: ChartDatum[];
  deviceBreakdown: { name: string; value: number }[];
  versionBreakdown: { name: string; value: number }[];
  dailyActivity: DailyActivityPoint[];
}
