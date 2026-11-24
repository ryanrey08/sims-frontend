import type { Metadata } from "next";
import { RequisitionForm } from "@/features/requisitions/components/RequisitionForm";

export const metadata: Metadata = { title: "New requisition" };

export default function Page() {
  return <RequisitionForm />;
}
