"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/Skeleton";

const ChartSkeleton = () => <Skeleton className="h-[260px] w-full" />;

/** Charts are code-split and rendered client-side only (Recharts measures the DOM). */
export const BarChartView = dynamic(() => import("./BarChartView"), { ssr: false, loading: ChartSkeleton });
export const LineChartView = dynamic(() => import("./LineChartView"), { ssr: false, loading: ChartSkeleton });
export const PieChartView = dynamic(() => import("./PieChartView"), { ssr: false, loading: ChartSkeleton });
