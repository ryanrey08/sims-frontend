import type { Metadata } from "next";
import { StockLevelsView } from "@/features/inventory/components/StockLevelsView";

export const metadata: Metadata = { title: "Stock Management" };

export default function Page() {
  return <StockLevelsView />;
}
