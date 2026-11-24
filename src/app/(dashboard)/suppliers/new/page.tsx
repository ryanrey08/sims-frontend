import type { Metadata } from "next";
import { SupplierForm } from "@/features/suppliers/components/SupplierForm";

export const metadata: Metadata = { title: "New supplier" };

export default function Page() {
  return <SupplierForm />;
}
