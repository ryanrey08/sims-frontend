import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import type { ApiError } from "@/types/api";

export function isApiError(error: unknown): error is ApiError {
  return typeof error === "object" && error !== null && "message" in error && "status" in error;
}

export function getErrorMessage(error: unknown, fallback = "Something went wrong. Please try again.") {
  if (isApiError(error)) return error.message || fallback;
  if (error instanceof Error) return error.message;
  return fallback;
}

/** Copies server-side validation errors onto React Hook Form fields. Returns true if any were applied. */
export function applyServerErrors<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>) {
  if (!isApiError(error) || !error.errors) return false;
  let applied = false;
  for (const [field, messages] of Object.entries(error.errors)) {
    if (messages?.length) {
      setError(field as Path<T>, { type: "server", message: messages[0] });
      applied = true;
    }
  }
  return applied;
}

/** Returns the error only when it is not a field-level validation error (those are shown inline). */
export function nonFieldError(error: unknown) {
  if (!error) return null;
  return isApiError(error) && error.errors ? null : error;
}
