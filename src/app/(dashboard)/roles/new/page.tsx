import type { Metadata } from "next";
import { RoleForm } from "@/features/roles/components/RoleForm";

export const metadata: Metadata = { title: "New role" };

export default function Page() {
  return <RoleForm />;
}
