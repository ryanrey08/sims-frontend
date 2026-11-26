import type { Metadata } from "next";
import { PropertyTransactionsView } from "@/features/property/components/PropertyTransactionsView";

export const metadata: Metadata = { title: "Property Transactions" };

export default function Page() {
  return <PropertyTransactionsView />;
}
