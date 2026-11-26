import type { Metadata } from "next";
import { ReorderView } from "@/features/inventory/components/ReorderView";

export const metadata: Metadata = { title: "Reorder Management" };

export default function Page() {
  return <ReorderView />;
}
