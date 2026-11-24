import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getReportForm, REPORT_FORMS } from "@/config/reportForms";
import { ReportFormView } from "@/features/report-forms/components/ReportFormView";

export function generateStaticParams() {
  return REPORT_FORMS.map((item) => ({ code: item.code }));
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  return { title: getReportForm(code)?.title ?? "Not found" };
}

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!getReportForm(code)) notFound();
  return <ReportFormView code={code} />;
}
