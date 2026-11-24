import type { Metadata } from "next";
import { UserForm } from "@/features/users/components/UserForm";

export const metadata: Metadata = { title: "New user" };

export default function Page() {
  return <UserForm />;
}
