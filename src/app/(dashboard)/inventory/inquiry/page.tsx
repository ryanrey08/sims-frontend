import type { Metadata } from "next";
import { StockInquiryView } from "@/features/inventory/components/StockInquiryView";

export const metadata: Metadata = { title: "Stock Inquiry" };

export default function Page() {
  return <StockInquiryView />;
}
