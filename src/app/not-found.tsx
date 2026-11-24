import { Compass } from "lucide-react";
import { ButtonLink } from "@/components/ui/ButtonLink";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 text-center">
      <div className="mb-4 rounded-full bg-brand-50 p-4 text-brand-900">
        <Compass className="h-8 w-8" />
      </div>
      <p className="text-sm font-semibold text-brand-700">404</p>
      <h1 className="mt-1 text-2xl font-bold text-ink">Page not found</h1>
      <p className="mt-2 max-w-md text-sm text-muted">The page you are looking for doesn&apos;t exist or has been moved.</p>
      <ButtonLink href="/dashboard" className="mt-6">
        Back to dashboard
      </ButtonLink>
    </div>
  );
}
