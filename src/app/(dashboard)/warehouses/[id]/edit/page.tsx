import type { Metadata } from "next";
import { EditWarehouseView } from "@/features/warehouses/components/EditWarehouseView";

export const metadata: Metadata = { title: "Edit warehouse" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditWarehouseView id={id} />;
}
