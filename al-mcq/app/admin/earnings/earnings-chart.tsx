"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

type Row = { date: string; earnings: number; pageViews: number; clicks: number };

export default function EarningsChart({ data }: { data: Row[] }) {
  if (!data.length)
    return (
      <p className="text-[14px]" style={{ color: "var(--muted)" }}>
        No earnings recorded in the last 30 days.
      </p>
    );

  const shaped = data.map((d) => ({
    ...d,
    label: d.date?.slice(5) ?? "",
  }));

  return (
    <div style={{ height: 260 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={shaped} margin={{ top: 6, right: 6, bottom: 0, left: -18 }}>
          <defs>
            <linearGradient id="earn" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5A4BE1" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#5A4BE1" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid vertical={false} stroke="var(--hairline)" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            tickFormatter={(v) => `$${v}`}
            width={54}
          />
          <Tooltip
            cursor={{ stroke: "var(--brand)", strokeOpacity: 0.3 }}
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--hairline)",
              borderRadius: 14,
              fontSize: 13,
              color: "var(--ink)",
            }}
            formatter={(value: any, name: string) =>
              name === "earnings" ? [`$${Number(value).toFixed(2)}`, "Earnings"] : [value, name]
            }
          />
          <Area
            type="monotone"
            dataKey="earnings"
            stroke="#5A4BE1"
            strokeWidth={2}
            fill="url(#earn)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
