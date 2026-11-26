import type { Metadata } from "next";
import { ProductsListView } from "@/features/products/components/ProductsListView";

export const metadata: Metadata = { title: "Item Master" };

export default function Page() {
  return <ProductsListView />;
}
