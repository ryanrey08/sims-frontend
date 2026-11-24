import type { Metadata } from "next";
import { WarehousesListView } from "@/features/warehouses/components/WarehousesListView";

export const metadata: Metadata = { title: "Warehouses" };

export default function Page() {
  return <WarehousesListView />;
}
