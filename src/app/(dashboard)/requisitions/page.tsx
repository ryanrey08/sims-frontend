import type { Metadata } from "next";
import { RequisitionsListView } from "@/features/requisitions/components/RequisitionsListView";

export const metadata: Metadata = { title: "Requisitions" };

export default function Page() {
  return <RequisitionsListView />;
}
