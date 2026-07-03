import {
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import type { Metrics } from "../types";
import { DEVICE_COLORS } from "../utils";

/* ── Shared chart card wrapper ── */
function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-xl border border-border shadow-soft hover:shadow-elevated transition-all duration-200 p-6 animate-fade-in-up">
      <h3 className="font-semibold text-sm mb-5 text-foreground">{title}</h3>
      {children}
    </div>
  );
}

/* ── Custom tooltip ── */
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-elevated px-3 py-2 text-xs">
      {label && <p className="font-medium mb-1 text-foreground">{label}</p>}
      {payload.map((entry: any, i: number) => (
        <p key={i} className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full inline-block"
            style={{ background: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium text-foreground">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

/* ── Donut chart with legend ── */
function DonutChart({
  data,
  total,
}: {
  data: { name: string; value: number; color: string }[];
  total?: number;
}) {
  const computedTotal = total ?? data.reduce((s, d) => s + d.value, 0);

  return (
    <div>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={52}
            outerRadius={78}
            paddingAngle={3}
            dataKey="value"
            strokeWidth={0}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      <div className="flex flex-wrap gap-x-5 gap-y-2 justify-center mt-3">
        {data.map((s, i) => {
          const pct =
            computedTotal > 0
              ? ((s.value / computedTotal) * 100).toFixed(0)
              : "0";
          return (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: s.color }}
              />
              <span className="text-muted-foreground">{s.name}</span>
              <span className="font-semibold text-foreground">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Insights({ metrics }: { metrics: Metrics }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {/* ── Task Creation Sources ── */}
      <ChartCard title="Task Creation Sources">
        {metrics.tasksBySource.length > 0 ? (
          <DonutChart data={metrics.tasksBySource} />
        ) : (
          <p className="text-sm text-muted-foreground text-center py-12">
            No task creation data yet
          </p>
        )}
      </ChartCard>

      {/* ── Sign-in Providers ── */}
      <ChartCard title="Sign-In Providers">
        {metrics.providerBreakdown.length > 0 ? (
          <DonutChart data={metrics.providerBreakdown} />
        ) : (
          <p className="text-sm text-muted-foreground text-center py-12">
            No provider data yet
          </p>
        )}
      </ChartCard>

      {/* ── Daily Activity ── */}
      <ChartCard title="Daily Activity (30 days)">
        {metrics.dailyActivity.some((d) => d.created > 0 || d.completed > 0) ? (
          <div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart
                data={metrics.dailyActivity}
                margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
              >
                <defs>
                  <linearGradient
                    id="gradCreated"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#0052FF" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0052FF" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient
                    id="gradCompleted"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#94A3B8" }}
                  tickFormatter={(v: string) => {
                    const d = new Date(v + "T00:00:00");
                    return d.toLocaleDateString("en", {
                      month: "short",
                      day: "numeric",
                    });
                  }}
                  interval={6}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#94A3B8" }}
                  width={30}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="created"
                  stroke="#0052FF"
                  fill="url(#gradCreated)"
                  strokeWidth={2}
                  name="Created"
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="completed"
                  stroke="#10B981"
                  fill="url(#gradCompleted)"
                  strokeWidth={2}
                  name="Completed"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>

            <div className="flex gap-5 justify-center mt-3">
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-accent" />
                <span className="text-muted-foreground">Created</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-success" />
                <span className="text-muted-foreground">Completed</span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-12">
            No daily activity data yet
          </p>
        )}
      </ChartCard>

      {/* ── Device Distribution ── */}
      <ChartCard title="Device Distribution">
        {metrics.deviceBreakdown.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={metrics.deviceBreakdown}
              layout="vertical"
              margin={{ top: 0, right: 4, bottom: 0, left: 0 }}
            >
              <XAxis
                type="number"
                tick={{ fontSize: 10, fill: "#94A3B8" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11, fill: "#64748B" }}
                width={100}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="value"
                radius={[0, 4, 4, 0]}
                barSize={18}
                name="Users"
              >
                {metrics.deviceBreakdown.map((_entry, i) => (
                  <Cell
                    key={i}
                    fill={DEVICE_COLORS[i % DEVICE_COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-12">
            No device data yet
          </p>
        )}
      </ChartCard>
    </div>
  );
}
