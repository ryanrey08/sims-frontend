import type { Metadata } from "next";
import { ReportFormsIndexView } from "@/features/report-forms/components/ReportFormView";

export const metadata: Metadata = { title: "Forms and Reports" };

export default function Page() {
  return <ReportFormsIndexView />;
}
