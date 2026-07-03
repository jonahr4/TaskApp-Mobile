import { useState, useMemo } from "react";
import type { UserData } from "../types";
import { getFirestoreDate, getLastActive, timeAgo, formatNumber } from "../utils";

type SortKey =
  | "taskCount"
  | "tasksCompleted"
  | "aiPromptsCount"
  | "streak"
  | "lastSeen";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "taskCount", label: "Tasks Created" },
  { key: "tasksCompleted", label: "Tasks Completed" },
  { key: "aiPromptsCount", label: "AI Usage" },
  { key: "streak", label: "Current Streak" },
  { key: "lastSeen", label: "Last Active" },
];

const RANK_STYLES = [
  "bg-gradient-to-br from-amber-400 to-amber-500 text-white",
  "bg-gradient-to-br from-slate-300 to-slate-400 text-white",
  "bg-gradient-to-br from-amber-600 to-amber-700 text-white",
];

function getSortValue(user: UserData, key: SortKey): number {
  switch (key) {
    case "taskCount":
      return user.taskCount || 0;
    case "tasksCompleted":
      return user.tasksCompleted || 0;
    case "aiPromptsCount":
      return user.aiPromptsCount || 0;
    case "streak":
      return user.streakData?.current || 0;
    case "lastSeen":
      return getLastActive(user).getTime();
  }
}

export function UserTable({
  users,
  onSelectUser,
}: {
  users: UserData[];
  onSelectUser: (user: UserData) => void;
}) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("taskCount");

  const sorted = useMemo(() => {
    let result = [...users];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (u) =>
          (u.displayName || "").toLowerCase().includes(q) ||
          (u.email || "").toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => getSortValue(b, sortKey) - getSortValue(a, sortKey));

    return result;
  }, [users, search, sortKey]);

  return (
    <div className="animate-fade-in-up">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-lg border border-border bg-card text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors"
          />
        </div>

        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="h-10 px-3 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 cursor-pointer"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.key} value={opt.key}>
              Sort: {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border shadow-soft overflow-hidden">
        {/* Header */}
        <div className="hidden md:grid grid-cols-[3rem_1fr_5rem_5rem_5rem_5rem_6rem] gap-3 px-5 py-3 border-b border-border bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <span>#</span>
          <span>User</span>
          <span className="text-right">Tasks</span>
          <span className="text-right">Done</span>
          <span className="text-right">AI</span>
          <span className="text-right">Streak</span>
          <span className="text-right">Last Active</span>
        </div>

        {sorted.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            {search ? "No users match your search" : "No user data available"}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {sorted.map((user, i) => {
              const lastSeen = getLastActive(user);
              const isRecent =
                Date.now() - lastSeen.getTime() < 24 * 60 * 60 * 1000;

              return (
                <button
                  key={user.uid}
                  onClick={() => onSelectUser(user)}
                  className="w-full grid grid-cols-1 md:grid-cols-[3rem_1fr_5rem_5rem_5rem_5rem_6rem] gap-2 md:gap-3 px-5 py-3.5 text-left hover:bg-accent/[0.03] transition-colors group cursor-pointer"
                >
                  {/* Rank */}
                  <span className="hidden md:flex items-center">
                    {i < 3 ? (
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${RANK_STYLES[i]}`}
                      >
                        {i + 1}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground ml-1.5">
                        {i + 1}
                      </span>
                    )}
                  </span>

                  {/* User info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="md:hidden text-sm font-medium text-muted-foreground w-6 shrink-0">
                      {i + 1}
                    </span>

                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt=""
                        className="w-8 h-8 rounded-full shrink-0 border border-border"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full shrink-0 bg-gradient-to-br from-accent to-accent-secondary flex items-center justify-center text-white text-xs font-bold">
                        {(user.displayName || user.email || "?")[0].toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate group-hover:text-accent transition-colors">
                        {user.displayName || "Anonymous"}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {user.email || "No email"}
                      </div>
                    </div>
                  </div>

                  {/* Mobile stats */}
                  <div className="md:hidden flex gap-4 ml-9 text-xs text-muted-foreground">
                    <span>
                      <strong className="text-foreground">
                        {formatNumber(user.taskCount || 0)}
                      </strong>{" "}
                      tasks
                    </span>
                    <span>
                      <strong className="text-foreground">
                        {formatNumber(user.tasksCompleted || 0)}
                      </strong>{" "}
                      done
                    </span>
                    <span>
                      <strong className="text-foreground">
                        {user.streakData?.current || 0}
                      </strong>
                      d streak
                    </span>
                  </div>

                  <span className="hidden md:flex items-center justify-end text-sm font-medium">
                    {formatNumber(user.taskCount || 0)}
                  </span>
                  <span className="hidden md:flex items-center justify-end text-sm text-muted-foreground">
                    {formatNumber(user.tasksCompleted || 0)}
                  </span>
                  <span className="hidden md:flex items-center justify-end text-sm text-muted-foreground">
                    {formatNumber(user.aiPromptsCount || 0)}
                  </span>
                  <span className="hidden md:flex items-center justify-end text-sm">
                    {user.streakData?.current || 0}d
                  </span>
                  <span
                    className={`hidden md:flex items-center justify-end text-xs ${
                      isRecent
                        ? "text-success font-medium"
                        : "text-muted-foreground"
                    }`}
                  >
                    {lastSeen.getTime() > 0 ? timeAgo(lastSeen) : "Never"}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground/50 mt-3 text-center">
        {sorted.length} user{sorted.length !== 1 ? "s" : ""} · Click a row to
        view details and tasks
      </p>
    </div>
  );
}
