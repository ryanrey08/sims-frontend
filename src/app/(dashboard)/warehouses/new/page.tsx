import type { Metadata } from "next";
import { WarehouseForm } from "@/features/warehouses/components/WarehouseForm";

export const metadata: Metadata = { title: "New warehouse" };

export default function Page() {
  return <WarehouseForm />;
}
