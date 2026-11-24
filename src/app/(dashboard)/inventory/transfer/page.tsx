import type { Metadata } from "next";
import { TransferStockView } from "@/features/inventory/components/TransferStockView";

export const metadata: Metadata = { title: "Transfer stock" };

export default function Page() {
  return <TransferStockView />;
}
