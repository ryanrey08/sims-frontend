import type { Metadata } from "next";
import { DisposalTransferView } from "@/features/property/components/DisposalTransferView";

export const metadata: Metadata = { title: "Disposal / Transfer" };

export default function Page() {
  return <DisposalTransferView />;
}
