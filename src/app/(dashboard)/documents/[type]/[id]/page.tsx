import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDocumentDef } from "@/config/documents";
import { DocumentDetailView } from "@/features/documents/components/DocumentDetailView";

export async function generateMetadata({ params }: { params: Promise<{ type: string; id: string }> }): Promise<Metadata> {
  const { type } = await params;
  return { title: getDocumentDef(type)?.title ?? "Not found" };
}

export default async function Page({ params }: { params: Promise<{ type: string; id: string }> }) {
  const { type, id } = await params;
  if (!getDocumentDef(type)) notFound();
  return (
    <Suspense>
      <DocumentDetailView type={type} id={id} />
    </Suspense>
  );
}
