import type { Metadata } from "next";
import { PurchaseOrderForm } from "@/features/purchase-orders/components/PurchaseOrderForm";

export const metadata: Metadata = { title: "New purchase order" };

export default function Page() {
  return <PurchaseOrderForm />;
}
