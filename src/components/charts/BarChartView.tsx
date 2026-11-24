"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ChartPoint } from "@/types/models";
import { CHART_COLORS, STATUS_COLORS } from "./palette";

export interface BarChartViewProps {
  data: ChartPoint[];
  series: { key: string; label?: string }[];
  height?: number;
  stacked?: boolean;
  layout?: "horizontal" | "vertical";
  yDomain?: [number, number];
  valueSuffix?: string;
}

const compactFormatter = new Intl.NumberFormat("en-PH", { notation: "compact", maximumFractionDigits: 1 });
const compact = (value: number) => compactFormatter.format(value);

export default function BarChartView({ data, series, height = 280, stacked, layout = "horizontal", yDomain, valueSuffix = "" }: BarChartViewProps) {
  const vertical = layout === "vertical";
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout={vertical ? "vertical" : "horizontal"} margin={{ top: 8, right: 16, left: vertical ? 0 : -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e3e8f0" vertical={vertical} horizontal={!vertical} />
        {/* Recharts reads axes from direct children, so no fragments here. */}
        {vertical && <XAxis type="number" domain={yDomain} tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={compact} />}
        {vertical && <YAxis type="category" dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} width={130} />}
        {!vertical && <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />}
        {!vertical && <YAxis domain={yDomain} tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} tickFormatter={compact} />}
        <Tooltip
          cursor={{ fill: "rgba(30,58,138,0.06)" }}
          contentStyle={{ borderRadius: 10, border: "1px solid #e3e8f0", fontSize: 12 }}
          formatter={(value) => `${typeof value === "number" ? value.toLocaleString("en-PH") : value}${valueSuffix}`}
        />
        {series.length > 1 && <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />}
        {series.map((item, index) => (
          <Bar
            key={item.key}
            dataKey={item.key}
            name={item.label ?? item.key}
            stackId={stacked ? "stack" : undefined}
            fill={STATUS_COLORS[item.key] ?? CHART_COLORS[index % CHART_COLORS.length]}
            radius={stacked ? 0 : vertical ? [0, 4, 4, 0] : [4, 4, 0, 0]}
            maxBarSize={36}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
