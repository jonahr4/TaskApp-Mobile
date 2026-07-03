import { useState, useEffect, useCallback, useMemo } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { computeMetrics } from "../utils";
import type { User } from "firebase/auth";
import type { UserData, Metrics } from "../types";

const EMPTY_METRICS: Metrics = {
  totalUsers: 0,
  activeUsers7d: 0,
  activeUsers30d: 0,
  newUsersThisWeek: 0,
  totalTasks: 0,
  totalCompleted: 0,
  completionRate: 0,
  totalAiParses: 0,
  aiSuccessRate: 0,
  avgTasksPerUser: 0,
  avgStreak: 0,
  longestStreak: 0,
  onboardingRate: 0,
  tasksBySource: [],
  providerBreakdown: [],
  deviceBreakdown: [],
  versionBreakdown: [],
  dailyActivity: [],
};

/**
 * Single fetch of all `userData` documents + client-side metric computation.
 *
 * Rate-limit impact: N reads per refresh (one per user document).
 * For 100 users → 100 reads. Free tier = 50,000/day.
 */
export function useAdminData(user: User | null, isAdmin: boolean) {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    if (!user || !isAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const snap = await getDocs(collection(db, "userData"));
      const data = snap.docs.map((d) => d.data() as UserData);
      setUsers(data);
      setLastRefreshed(new Date());
    } catch (err: any) {
      console.error("Failed to fetch userData:", err);
      setError(
        err?.code === "permission-denied"
          ? "Permission denied — check your Firestore rules include your admin UID."
          : "Failed to load user data. Check the console for details."
      );
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin]);

  /* Fetch on mount (or when auth changes) */
  useEffect(() => {
    if (user && isAdmin) {
      refresh();
    }
  }, [user, isAdmin, refresh]);

  /* Compute metrics client-side (no extra reads) */
  const metrics = useMemo<Metrics>(
    () => (users.length > 0 ? computeMetrics(users) : EMPTY_METRICS),
    [users]
  );

  return { users, metrics, loading, error, refresh, lastRefreshed };
}
