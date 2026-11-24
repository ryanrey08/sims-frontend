import { ShieldAlert } from "lucide-react";
import { ButtonLink } from "@/components/ui/ButtonLink";

export function Unauthorized({ homeHref = "/dashboard" }: { homeHref?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="mb-4 rounded-full bg-amber-50 p-4 text-amber-600">
        <ShieldAlert className="h-8 w-8" />
      </div>
      <h1 className="text-xl font-bold text-ink">Access restricted</h1>
      <p className="mt-2 max-w-md text-sm text-muted">
        Your role does not include permission to view this page. Contact your administrator if you need access.
      </p>
      <ButtonLink href={homeHref} className="mt-6">
        Go to my home page
      </ButtonLink>
    </div>
  );
}
