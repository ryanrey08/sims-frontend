import type { Metadata } from "next";
import { SuppliersListView } from "@/features/suppliers/components/SuppliersListView";

export const metadata: Metadata = { title: "Suppliers" };

export default function Page() {
  return <SuppliersListView />;
}
