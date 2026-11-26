import type { Metadata } from "next";
import { MaintenanceView } from "@/features/property/components/MaintenanceView";

export const metadata: Metadata = { title: "Maintenance" };

export default function Page() {
  return <MaintenanceView />;
}
