import type { Metadata } from "next";
import { ReportHubView } from "@/features/property/components/ReportHubView";

export const metadata: Metadata = { title: "Property Reports" };

export default function Page() {
  return <ReportHubView />;
}
