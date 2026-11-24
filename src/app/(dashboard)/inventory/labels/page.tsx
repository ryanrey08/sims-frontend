import type { Metadata } from "next";
import { LabelsView } from "@/features/inventory/components/LabelsView";

export const metadata: Metadata = { title: "Barcode and QR Code" };

export default function Page() {
  return <LabelsView />;
}
