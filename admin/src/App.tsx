import { useState } from "react";
import { useAuth } from "./hooks/useAuth";
import { useAdminData } from "./hooks/useAdminData";
import { timeAgo } from "./utils";
import { LoginScreen } from "./components/LoginScreen";
import { Overview } from "./components/Overview";
import { StatsBar } from "./components/StatsBar";
import { Insights } from "./components/Insights";
import { UserTable } from "./components/UserTable";
import { RecentTasks } from "./components/RecentTasks";
import { UserDetail } from "./components/UserDetail";
import { InsightCenter } from "./pages/InsightCenter";
import { NewSignups } from "./pages/NewSignups";
import type { UserData } from "./types";

type Page = "dashboard" | "insights" | "signups";

/* ── Section Label Badge ── */
function SectionLabel({ text }: { text: string }) {
  return (
    <div className="inline-flex items-center gap-2.5 rounded-full border border-accent/30 bg-accent/5 px-4 py-1.5 mb-5">
      <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse-dot" />
      <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-accent font-medium">
        {text}
      </span>
    </div>
  );
}

/* ── Loading Spinner ── */
function Spinner() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    </div>
  );
}

export default function App() {
  const { user, isAdmin, signIn, signOut, loading: authLoading } = useAuth();
  const {
    users,
    metrics,
    loading: dataLoading,
    error,
    refresh,
    lastRefreshed,
  } = useAdminData(user, isAdmin);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [page, setPage] = useState<Page>("dashboard");

  /* ── Auth Gate ── */
  if (authLoading) return <Spinner />;
  if (!user || !isAdmin) {
    return (
      <LoginScreen
        onSignIn={signIn}
        error={user && !isAdmin ? "not-admin" : undefined}
        uid={user?.uid}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 backdrop-blur-xl border-b bg-background/80 border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-xl select-none">
              Task<span className="gradient-text">App</span>
            </h1>

            {/* Page Nav */}
            <div className="hidden sm:flex gap-0.5 p-0.5 rounded-lg bg-muted/50">
              <button
                onClick={() => setPage("dashboard")}
                className={`text-[11px] font-medium px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  page === "dashboard"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setPage("insights")}
                className={`text-[11px] font-medium px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  page === "insights"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Insights
              </button>
              <button
                onClick={() => setPage("signups")}
                className={`text-[11px] font-medium px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  page === "signups"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                New Users
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {lastRefreshed && (
              <span className="text-[11px] hidden md:inline text-muted-foreground/60">
                Updated {timeAgo(lastRefreshed)}
              </span>
            )}
            <button
              onClick={refresh}
              disabled={dataLoading}
              className="h-8 px-3 rounded-lg border text-xs font-medium active:scale-[0.97] transition-all disabled:opacity-40 cursor-pointer border-border hover:bg-muted"
            >
              {dataLoading ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 border-[1.5px] border-accent border-t-transparent rounded-full animate-spin" />
                  Loading
                </span>
              ) : (
                "Refresh"
              )}
            </button>
            <div className="w-px h-5 hidden sm:block bg-border" />
            <button
              onClick={signOut}
              className="h-8 px-3 rounded-lg text-xs transition-colors cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Mobile page nav */}
        <div className="sm:hidden flex border-t px-4 border-border">
          <button
            onClick={() => setPage("dashboard")}
            className={`flex-1 text-xs font-medium py-2 text-center border-b-2 transition-colors cursor-pointer ${
              page === "dashboard"
                ? "border-accent text-accent"
                : page === "insights"
                  ? "border-transparent text-slate-500"
                  : "border-transparent text-muted-foreground"
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setPage("insights")}
            className={`flex-1 text-xs font-medium py-2 text-center border-b-2 transition-colors cursor-pointer ${
              page === "insights"
                ? "border-accent text-accent"
                : "border-transparent text-muted-foreground"
            }`}
          >
            Insights
          </button>
          <button
            onClick={() => setPage("signups")}
            className={`flex-1 text-xs font-medium py-2 text-center border-b-2 transition-colors cursor-pointer ${
              page === "signups"
                ? "border-accent text-accent"
                : "border-transparent text-muted-foreground"
            }`}
          >
            New Users
          </button>
        </div>
      </header>

      {/* ── Error Banner ── */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4">
          <div className={`border rounded-xl px-4 py-3 text-sm flex items-start gap-2 ${
            page === "insights"
              ? "bg-red-500/5 border-red-500/20 text-red-400"
              : "bg-danger/5 border-danger/20 text-danger"
          }`}>
            <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            {error}
          </div>
        </div>
      )}

      {/* ── Page Content ── */}
      {page === "insights" ? (
        <InsightCenter users={users} metrics={metrics} onSelectUser={setSelectedUser} />
      ) : page === "signups" ? (
        <NewSignups users={users} onSelectUser={setSelectedUser} />
      ) : (
        <main>
          {/* Overview */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-6">
            <SectionLabel text="Overview" />
            <h2 className="font-display text-2xl sm:text-3xl mb-6">
              Your <span className="gradient-text">Users</span> at a Glance
            </h2>
            <Overview metrics={metrics} />
          </section>

          {/* Inverted Stats Bar */}
          <div className="mt-6 mb-2">
            <StatsBar metrics={metrics} />
          </div>

          {/* Insights */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
            <SectionLabel text="Insights" />
            <h2 className="font-display text-2xl sm:text-3xl mb-6">
              How They <span className="gradient-text">Use</span> the App
            </h2>
            <Insights metrics={metrics} />
          </section>

          {/* Recent Activity */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
            <SectionLabel text="Recent Activity" />
            <h2 className="font-display text-2xl sm:text-3xl mb-6">
              Latest <span className="gradient-text">Tasks</span>
            </h2>
            <RecentTasks users={users} />
          </section>

          {/* Top Users */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-16">
            <SectionLabel text="Top Users" />
            <h2 className="font-display text-2xl sm:text-3xl mb-6">
              Your <span className="gradient-text">Best</span> Users
            </h2>
            <UserTable users={users} onSelectUser={setSelectedUser} />
          </section>
        </main>
      )}

      {/* ── Footer (dashboard only) ── */}
      {page === "dashboard" && (
        <footer className="border-t border-border py-6">
          <p className="text-center text-xs text-muted-foreground/40">
            TaskApp Admin Dashboard · {users.length} users loaded ·{" "}
            {users.length} Firestore reads this session
          </p>
        </footer>
      )}

      {/* ── User Detail Panel ── */}
      {selectedUser && (
        <UserDetail
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
}
