import type { Metadata } from "next";
import { EditUserView } from "@/features/users/components/EditUserView";

export const metadata: Metadata = { title: "Edit user" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditUserView id={id} />;
}
