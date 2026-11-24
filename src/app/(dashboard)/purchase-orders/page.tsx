import type { Metadata } from "next";
import { PurchaseOrdersListView } from "@/features/purchase-orders/components/PurchaseOrdersListView";

export const metadata: Metadata = { title: "Purchase orders" };

export default function Page() {
  return <PurchaseOrdersListView />;
}
