import type { Metadata } from "next";
import { ProfileView } from "@/features/profile/components/ProfileView";

export const metadata: Metadata = { title: "My profile" };

export default function Page() {
  return <ProfileView />;
}
