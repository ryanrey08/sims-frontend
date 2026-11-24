import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DOCUMENTS, getDocumentDef } from "@/config/documents";
import { DocumentFormView } from "@/features/documents/components/DocumentFormView";

export function generateStaticParams() {
  return DOCUMENTS.map((item) => ({ type: item.key }));
}

export async function generateMetadata({ params }: { params: Promise<{ type: string }> }): Promise<Metadata> {
  const { type } = await params;
  return { title: getDocumentDef(type)?.title ?? "Not found" };
}

export default async function Page({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  if (!getDocumentDef(type)) notFound();
  return <DocumentFormView type={type} />;
}
