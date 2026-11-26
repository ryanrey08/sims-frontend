import type { Metadata } from "next";
import { WarehousesListView } from "@/features/warehouses/components/WarehousesListView";

export const metadata: Metadata = { title: "Edit warehouse" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WarehousesListView initialForm="edit" editId={id} />;
}
