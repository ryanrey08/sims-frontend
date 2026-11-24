import type { Metadata } from "next";
import { AdjustStockView } from "@/features/inventory/components/AdjustStockView";

export const metadata: Metadata = { title: "Adjust stock" };

export default function Page() {
  return <AdjustStockView />;
}
