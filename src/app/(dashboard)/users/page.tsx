import type { Metadata } from "next";
import { UsersListView } from "@/features/users/components/UsersListView";

export const metadata: Metadata = { title: "Users" };

export default function Page() {
  return <UsersListView />;
}
