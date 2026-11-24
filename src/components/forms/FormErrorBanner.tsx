import { AlertCircle } from "lucide-react";
import { getErrorMessage } from "@/lib/utils/errors";

/** Shows a non-field error returned by the API at the top of a form. */
export function FormErrorBanner({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <div role="alert" className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{getErrorMessage(error)}</span>
    </div>
  );
}
