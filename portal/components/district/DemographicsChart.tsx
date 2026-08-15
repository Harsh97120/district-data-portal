"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { DistrictMetrics } from "@/lib/types/district";
import { PRIMARY_METRICS, METRIC_LABELS } from "@/lib/constants";

interface DemographicsChartProps {
  district: DistrictMetrics;
}

// Short axis labels (2-3 words max to fit bar chart)
const SHORT_LABELS: Record<string, string> = {
  literacy_rate:        "Literacy %",
  sex_ratio:            "Sex Ratio",
  households_surveyed:  "HH Surveyed",
  women_interviewed:    "Women (15-49)",
  men_interviewed:      "Men (15-54)",
  child_population_pct: "Child Pop %",
  household_size_avg:   "Avg HH Size",
};

const BAR_COLORS = ["#FF6B35", "#FFA726", "#FFD700", "#66BB6A", "#42A5F5"];

export default function DemographicsChart({ district }: DemographicsChartProps) {
  const data = PRIMARY_METRICS.map((field, i) => {
    const raw = district[field as keyof DistrictMetrics];
    const value = typeof raw === "number" ? raw : null;
    return {
      name: SHORT_LABELS[field] ?? field,
      value,
      fullLabel: METRIC_LABELS[field]?.label ?? field,
      color: BAR_COLORS[i % BAR_COLORS.length],
    };
  }).filter((d) => d.value !== null);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
        No chart data available
      </div>
    );
  }

  return (
    <div className="w-full">
      <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider font-medium">
        District Overview — Bar Chart
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={data}
          margin={{ top: 4, right: 8, left: 0, bottom: 60 }}
          barCategoryGap="25%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#2D3148" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: "#9CA3AF", fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: "#2D3148" }}
            angle={-40}
            textAnchor="end"
            interval={0}
          />
          <YAxis
            tick={{ fill: "#9CA3AF", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{
              background: "#1A1D27",
              border: "1px solid #2D3148",
              borderRadius: "8px",
              color: "#F0F0F0",
              fontSize: "12px",
            }}
            labelStyle={{ color: "#FF6B35", fontWeight: 600 }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any, name: any, props: any) => [
              typeof value === "number" ? value.toLocaleString("en-IN") : String(value),
              props?.payload?.fullLabel ?? name,
            ] as [string, string]}
            cursor={{ fill: "rgba(255,107,53,0.08)" }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
