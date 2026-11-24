import type { Metadata } from "next";
import { SupplierDetailView } from "@/features/suppliers/components/SupplierDetailView";

export const metadata: Metadata = { title: "Supplier details" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SupplierDetailView id={id} />;
}
