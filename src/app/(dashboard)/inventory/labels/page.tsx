import type { Metadata } from "next";
import { BarcodeManagementView } from "@/features/labels/components/BarcodeManagementView";

export const metadata: Metadata = { title: "Barcode / QR Management" };

export default function Page() {
  return <BarcodeManagementView />;
}
