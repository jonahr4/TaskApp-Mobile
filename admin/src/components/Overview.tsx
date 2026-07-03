import type { Metrics } from "../types";
import { formatNumber } from "../utils";

interface MetricCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  sub?: string;
  gradient?: boolean;
}

function MetricCard({ icon, value, label, sub, gradient }: MetricCardProps) {
  return (
    <div className="bg-card rounded-xl border border-border shadow-soft hover:shadow-elevated hover:-translate-y-0.5 transition-all duration-200 p-5 group">
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 transition-transform duration-200 group-hover:scale-110 ${
          gradient
            ? "bg-gradient-to-br from-accent to-accent-secondary text-white"
            : "bg-accent/8 text-accent"
        }`}
      >
        {icon}
      </div>
      <div className="text-2xl sm:text-3xl font-bold tracking-tight mb-0.5">
        {value}
      </div>
      <div className="text-sm text-muted-foreground">{label}</div>
      {sub && (
        <div className="text-xs text-muted-foreground/60 mt-1">{sub}</div>
      )}
    </div>
  );
}

/* ── SVG Icons ── */
const UsersIcon = (
  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zm8 0a3 3 0 11-6 0 3 3 0 016 0zm-4.07 11c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
  </svg>
);

const BoltIcon = (
  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
    <path
      fillRule="evenodd"
      d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
      clipRule="evenodd"
    />
  </svg>
);

const CheckIcon = (
  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
    <path
      fillRule="evenodd"
      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
      clipRule="evenodd"
    />
  </svg>
);

const ChartIcon = (
  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zm6-4a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zm6-3a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
  </svg>
);

const SparklesIcon = (
  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zm7-10a1 1 0 01.967.744L14.146 7.2 17.5 7.512a1 1 0 01.541 1.753l-2.454 2.113.669 3.386a1 1 0 01-1.49 1.087L12 14.188l-2.766 1.663a1 1 0 01-1.49-1.087l.67-3.386-2.455-2.113a1 1 0 01.541-1.753l3.356-.312L11.033.744A1 1 0 0112 0z" />
  </svg>
);

const FireIcon = (
  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
    <path
      fillRule="evenodd"
      d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z"
      clipRule="evenodd"
    />
  </svg>
);

export function Overview({ metrics }: { metrics: Metrics }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 stagger">
      <MetricCard
        icon={UsersIcon}
        value={formatNumber(metrics.totalUsers)}
        label="Total Users"
        sub={`${metrics.newUsersThisWeek} new this week`}
        gradient
      />
      <MetricCard
        icon={BoltIcon}
        value={formatNumber(metrics.activeUsers7d)}
        label="Active (7d)"
        sub={`${metrics.activeUsers30d} in 30 days`}
      />
      <MetricCard
        icon={CheckIcon}
        value={formatNumber(metrics.totalTasks)}
        label="Tasks Created"
        sub={`${formatNumber(metrics.totalCompleted)} completed`}
      />
      <MetricCard
        icon={ChartIcon}
        value={`${metrics.completionRate.toFixed(0)}%`}
        label="Completion Rate"
      />
      <MetricCard
        icon={SparklesIcon}
        value={formatNumber(metrics.totalAiParses)}
        label="AI Parses"
        sub={`${metrics.aiSuccessRate.toFixed(0)}% success rate`}
      />
      <MetricCard
        icon={FireIcon}
        value={metrics.avgStreak.toFixed(1)}
        label="Avg Streak"
        sub={`Best: ${metrics.longestStreak}d`}
      />
    </div>
  );
}
