import type { Metadata } from "next";
import { WorkOrderDetailView } from "@/features/property/components/WorkOrderDetailView";

export const metadata: Metadata = { title: "Work Order" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WorkOrderDetailView id={id} />;
}
