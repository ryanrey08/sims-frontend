import type { Metadata } from "next";
import { PurchaseOrderDetailView } from "@/features/purchase-orders/components/PurchaseOrderDetailView";

export const metadata: Metadata = { title: "Purchase order details" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PurchaseOrderDetailView id={id} />;
}
