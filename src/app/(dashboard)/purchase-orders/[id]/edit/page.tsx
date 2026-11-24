import type { Metadata } from "next";
import { EditPurchaseOrderView } from "@/features/purchase-orders/components/EditPurchaseOrderView";

export const metadata: Metadata = { title: "Edit purchase order" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditPurchaseOrderView id={id} />;
}
