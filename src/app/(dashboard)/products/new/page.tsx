import type { Metadata } from "next";
import { NewProductView } from "@/features/products/components/NewProductView";

export const metadata: Metadata = { title: "New Item" };

export default function Page() {
  return <NewProductView />;
}
