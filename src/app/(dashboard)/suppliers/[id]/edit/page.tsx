import type { Metadata } from "next";
import { EditSupplierView } from "@/features/suppliers/components/EditSupplierView";

export const metadata: Metadata = { title: "Edit supplier" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditSupplierView id={id} />;
}
