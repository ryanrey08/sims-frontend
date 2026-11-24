import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMasterData, MASTER_DATA } from "@/config/masterData";
import { MasterDataView } from "@/features/masters/components/MasterDataView";

export function generateStaticParams() {
  return MASTER_DATA.map((item) => ({ resource: item.key }));
}

export async function generateMetadata({ params }: { params: Promise<{ resource: string }> }): Promise<Metadata> {
  const { resource } = await params;
  return { title: getMasterData(resource)?.title ?? "Not found" };
}

export default async function Page({ params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params;
  if (!getMasterData(resource)) notFound();
  return <MasterDataView resource={resource} />;
}
