import type { Metadata } from "next";
import { UserDetailView } from "@/features/users/components/UserDetailView";

export const metadata: Metadata = { title: "User details" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <UserDetailView id={id} />;
}
