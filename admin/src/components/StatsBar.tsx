import type { Metrics } from "../types";

export function StatsBar({ metrics }: { metrics: Metrics }) {
  const stats = [
    {
      value: `${metrics.completionRate.toFixed(0)}%`,
      label: "Completion Rate",
    },
    {
      value: metrics.avgTasksPerUser.toFixed(1),
      label: "Avg Tasks / User",
    },
    {
      value: `${metrics.longestStreak}d`,
      label: "Longest Streak",
    },
    {
      value: `${metrics.aiSuccessRate.toFixed(0)}%`,
      label: "AI Success Rate",
    },
  ];

  return (
    <section className="bg-foreground text-white py-16 relative overflow-hidden dot-pattern">
      {/* Ambient glow */}
      <div className="absolute -top-24 left-1/4 w-[500px] h-[500px] bg-accent/6 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute -bottom-24 right-1/4 w-[400px] h-[400px] bg-accent-secondary/4 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {stats.map((stat, i) => (
            <div key={i} className="text-center animate-fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="text-3xl sm:text-4xl md:text-5xl font-bold gradient-text mb-2 tracking-tight">
                {stat.value}
              </div>
              <div className="text-xs sm:text-sm text-white/50 font-mono uppercase tracking-[0.12em]">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
