"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { ChartPoint } from "@/types/models";
import { CHART_COLORS, STATUS_COLORS } from "./palette";

export interface PieChartViewProps {
  data: ChartPoint[];
  valueKey?: string;
  height?: number;
}

export default function PieChartView({ data, valueKey = "value", height = 260 }: PieChartViewProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey={valueKey} nameKey="label" innerRadius="55%" outerRadius="80%" paddingAngle={2} stroke="none">
          {data.map((point, index) => (
            <Cell key={String(point.label)} fill={STATUS_COLORS[String(point.label)] ?? CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e3e8f0", fontSize: 12 }} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
