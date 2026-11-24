import type { Metadata } from "next";
import { MovementsView } from "@/features/inventory/components/MovementsView";

export const metadata: Metadata = { title: "Stock movements" };

export default function Page() {
  return <MovementsView />;
}
