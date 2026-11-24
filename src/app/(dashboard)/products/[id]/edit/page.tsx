import type { Metadata } from "next";
import { EditProductView } from "@/features/products/components/EditProductView";

export const metadata: Metadata = { title: "Edit product" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditProductView id={id} />;
}
