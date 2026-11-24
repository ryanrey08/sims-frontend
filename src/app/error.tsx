"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 rounded-full bg-red-50 p-4 text-red-600">
        <AlertTriangle className="h-8 w-8" />
      </div>
      <h1 className="text-xl font-bold text-ink">Something went wrong</h1>
      <p className="mt-2 max-w-md text-sm text-muted">
        An unexpected error occurred while showing this page. {error.digest && <span>Reference: {error.digest}</span>}
      </p>
      <Button className="mt-6" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
