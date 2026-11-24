import type { Metadata } from "next";
import { ReportsView } from "@/features/reports/components/ReportsView";

export const metadata: Metadata = { title: "Reports" };

export default function Page() {
  return <ReportsView />;
}
