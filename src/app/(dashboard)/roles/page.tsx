import type { Metadata } from "next";
import { RolesListView } from "@/features/roles/components/RolesListView";

export const metadata: Metadata = { title: "Roles & permissions" };

export default function Page() {
  return <RolesListView />;
}
