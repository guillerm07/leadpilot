"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type DailyData = {
  date: string;
  variantId: string;
  variantName: string;
  views: number;
  conversions: number;
  conversionRate: number;
};

// Color palette for variants
const VARIANT_COLORS = [
  "#8b5cf6", // purple
  "#3b82f6", // blue
  "#f97316", // orange
  "#10b981", // green
  "#ef4444", // red
  "#ec4899", // pink
];

export function ExperimentChart({
  dailyData,
  variants,
}: {
  dailyData: DailyData[];
  variants: Array<{ id: string; name: string }>;
}) {
  // Transform data: group by date with one conv rate column per variant
  const dateMap = new Map<string, Record<string, number>>();

  for (const entry of dailyData) {
    if (!dateMap.has(entry.date)) {
      dateMap.set(entry.date, { date: 0 }); // placeholder
    }
    const record = dateMap.get(entry.date)!;
    record[entry.variantId] = entry.conversionRate * 100; // percent
  }

  const chartData = Array.from(dateMap.entries())
    .map(([date, values]) => ({
      date: new Date(date).toLocaleDateString("es-ES", {
        day: "numeric",
        month: "short",
      }),
      ...values,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: "#71717a" }}
            tickLine={false}
            axisLine={{ stroke: "#e4e4e7" }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "#71717a" }}
            tickLine={false}
            axisLine={{ stroke: "#e4e4e7" }}
            tickFormatter={(v: number) => `${v.toFixed(1)}%`}
          />
          <Tooltip
            formatter={(value: number) => `${value.toFixed(2)}%`}
            labelStyle={{ color: "#18181b", fontWeight: 600 }}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e4e4e7",
              boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
            }}
          />
          <Legend />
          {variants.map((variant, i) => (
            <Line
              key={variant.id}
              type="monotone"
              dataKey={variant.id}
              name={variant.name}
              stroke={VARIANT_COLORS[i % VARIANT_COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
