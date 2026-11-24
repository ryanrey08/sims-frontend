"use client";

import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ChartPoint } from "@/types/models";
import { CHART_COLORS } from "./palette";

export interface LineChartViewProps {
  data: ChartPoint[];
  series: { key: string; label?: string }[];
  height?: number;
  yDomain?: [number | "auto", number | "auto"];
  valueSuffix?: string;
}

const compactFormatter = new Intl.NumberFormat("en-PH", { notation: "compact", maximumFractionDigits: 1 });

export default function LineChartView({ data, series, height = 280, yDomain, valueSuffix = "" }: LineChartViewProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <defs>
          {series.map((item, index) => (
            <linearGradient key={item.key} id={`fill-${item.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS[index % CHART_COLORS.length]} stopOpacity={0.25} />
              <stop offset="100%" stopColor={CHART_COLORS[index % CHART_COLORS.length]} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e3e8f0" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
        <YAxis domain={yDomain} tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(value: number) => compactFormatter.format(value)} />
        <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e3e8f0", fontSize: 12 }} formatter={(value) => `${typeof value === "number" ? value.toLocaleString("en-PH") : value}${valueSuffix}`} />
        {series.length > 1 && <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />}
        {series.map((item, index) => (
          <Area
            key={item.key}
            type="monotone"
            dataKey={item.key}
            name={item.label ?? item.key}
            stroke={CHART_COLORS[index % CHART_COLORS.length]}
            strokeWidth={2}
            fill={`url(#fill-${item.key})`}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
