import type { Metadata } from "next";
import { ProductForm } from "@/features/products/components/ProductForm";

export const metadata: Metadata = { title: "New product" };

export default function Page() {
  return <ProductForm />;
}
