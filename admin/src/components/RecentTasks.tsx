import { useState, useEffect } from "react";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import type { UserData, Task } from "../types";
import { getFirestoreDate, timeAgo } from "../utils";

const Q_STYLE: Record<string, { label: string; dot: string }> = {
  DO: { label: "Do First", dot: "bg-red-500" },
  SCHEDULE: { label: "Schedule", dot: "bg-blue-500" },
  DELEGATE: { label: "Delegate", dot: "bg-amber-500" },
  ELIMINATE: { label: "Eliminate", dot: "bg-gray-400" },
};

const SOURCE_CLS: Record<string, string> = {
  tasks: "bg-accent/5 text-accent border-accent/20",
  ai: "bg-violet/5 text-violet border-violet/20",
  calendar: "bg-success/5 text-success border-success/20",
  matrix: "bg-warning/5 text-warning border-warning/20",
};

const SOURCE_LABELS: Record<string, string> = {
  tasks: "Manual",
  ai: "AI",
  calendar: "Calendar",
  matrix: "Matrix",
};

function getQuadrant(t: Task) {
  if (t.urgent === null || t.important === null) return null;
  if (t.urgent && t.important) return "DO";
  if (!t.urgent && t.important) return "SCHEDULE";
  if (t.urgent && !t.important) return "DELEGATE";
  return "ELIMINATE";
}

/**
 * Fetches recent tasks from top N active users (by lastSeenAt).
 * Avoids collection group query — one query per user, limited results.
 * For 10 users × 5 tasks = 50 reads max.
 */
export function RecentTasks({ users }: { users: UserData[] }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRecent() {
      if (users.length === 0) {
        setLoading(false);
        return;
      }

      try {
        /* Pick top 15 most recently active users */
        const sorted = [...users]
          .sort(
            (a, b) =>
              getFirestoreDate(b.lastSeenAt).getTime() -
              getFirestoreDate(a.lastSeenAt).getTime()
          )
          .slice(0, 15);

        const results: Task[] = [];

        await Promise.all(
          sorted.map(async (u) => {
            try {
              const snap = await getDocs(
                query(
                  collection(db, "users", u.uid, "tasks"),
                  orderBy("createdAt", "desc"),
                  limit(5)
                )
              );
              snap.docs.forEach((d) => {
                results.push({
                  id: d.id,
                  ...(d.data() as Omit<Task, "id">),
                  _userId: u.uid,
                  _userName: u.displayName || u.email || "Unknown",
                });
              });
            } catch {
              /* skip users we can't read */
            }
          })
        );

        /* Sort all results by createdAt desc */
        results.sort(
          (a, b) =>
            getFirestoreDate(b.createdAt).getTime() -
            getFirestoreDate(a.createdAt).getTime()
        );

        setTasks(results.slice(0, 50));
      } catch (err: any) {
        console.error("Failed to fetch recent tasks:", err);
        setError(
          err?.code === "permission-denied"
            ? "Permission denied — update Firestore rules to allow admin read on users collection."
            : "Failed to load recent tasks."
        );
      } finally {
        setLoading(false);
      }
    }

    fetchRecent();
  }, [users]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-warning/5 border border-warning/20 rounded-xl px-4 py-3 text-sm text-warning">
        {error}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-12">
        No tasks found
      </p>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border shadow-soft overflow-hidden animate-fade-in-up">
      {/* Header */}
      <div className="hidden md:grid grid-cols-[1fr_9rem_6rem_6rem_6rem] gap-3 px-5 py-3 border-b border-border bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        <span>Task</span>
        <span>User</span>
        <span>Source</span>
        <span>Priority</span>
        <span className="text-right">Created</span>
      </div>

      <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
        {tasks.map((task, idx) => {
          const q = getQuadrant(task);
          const created = getFirestoreDate(task.createdAt);

          return (
            <div
              key={`${task._userId}-${task.id}-${idx}`}
              className="grid grid-cols-1 md:grid-cols-[1fr_9rem_6rem_6rem_6rem] gap-1 md:gap-3 px-5 py-3 hover:bg-accent/[0.02] transition-colors"
            >
              {/* Task title + status */}
              <div className="flex items-center gap-2.5 min-w-0">
                {task.completed ? (
                  <div className="w-4 h-4 rounded-full bg-success/10 border border-success/30 flex items-center justify-center shrink-0">
                    <svg className="w-2.5 h-2.5 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-4 h-4 rounded-full border-[1.5px] border-border shrink-0" />
                )}
                <span className={`text-sm truncate ${task.completed ? "line-through text-muted-foreground" : ""}`}>
                  {task.title}
                </span>
              </div>

              {/* User */}
              <span className="text-xs text-muted-foreground truncate flex items-center">
                {task._userName}
              </span>

              {/* Source */}
              <span className="flex items-center">
                {task.createdFrom ? (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${SOURCE_CLS[task.createdFrom] || "bg-muted text-muted-foreground border-border"}`}>
                    {SOURCE_LABELS[task.createdFrom] || task.createdFrom}
                  </span>
                ) : (
                  <span className="text-[10px] text-muted-foreground/40">—</span>
                )}
              </span>

              {/* Priority */}
              <span className="flex items-center gap-1.5">
                {q ? (
                  <>
                    <span className={`w-2 h-2 rounded-full ${Q_STYLE[q].dot}`} />
                    <span className="text-[10px] text-muted-foreground">
                      {Q_STYLE[q].label}
                    </span>
                  </>
                ) : (
                  <span className="text-[10px] text-muted-foreground/40">None</span>
                )}
              </span>

              {/* Created */}
              <span className="text-xs text-muted-foreground text-right flex items-center justify-end">
                {created.getTime() > 0 ? timeAgo(created) : "—"}
              </span>
            </div>
          );
        })}
      </div>

      <div className="px-5 py-2.5 border-t border-border bg-muted/30">
        <p className="text-[11px] text-muted-foreground/50 text-center">
          Showing {tasks.length} most recent tasks across active users
        </p>
      </div>
    </div>
  );
}
