import type { Metadata } from "next";
import { PropertyListView } from "@/features/property/components/PropertyListView";

export const metadata: Metadata = { title: "Property Master" };

export default function Page() {
  return <PropertyListView variant="master" />;
}
