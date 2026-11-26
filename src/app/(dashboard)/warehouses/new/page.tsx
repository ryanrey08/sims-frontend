import type { Metadata } from "next";
import { WarehousesListView } from "@/features/warehouses/components/WarehousesListView";

export const metadata: Metadata = { title: "Add warehouse" };

export default function Page() {
  return <WarehousesListView initialForm="new" />;
}
