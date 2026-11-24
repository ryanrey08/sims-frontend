import type { Metadata } from "next";
import { EditRoleView } from "@/features/roles/components/EditRoleView";

export const metadata: Metadata = { title: "Edit role" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditRoleView id={id} />;
}
