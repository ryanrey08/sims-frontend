import type { Metadata } from "next";
import { WarehouseDetailView } from "@/features/warehouses/components/WarehouseDetailView";

export const metadata: Metadata = { title: "Warehouse details" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WarehouseDetailView id={id} />;
}
