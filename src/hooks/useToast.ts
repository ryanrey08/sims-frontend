"use client";

import { useMemo } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { getErrorMessage } from "@/lib/utils/errors";
import { toastAdded } from "@/store/features/uiSlice";

/** Convenience wrapper for showing toast notifications from anywhere. */
export function useToast() {
  const dispatch = useAppDispatch();
  return useMemo(
    () => ({
      success: (title: string, description?: string) => dispatch(toastAdded({ tone: "success", title, description })),
      info: (title: string, description?: string) => dispatch(toastAdded({ tone: "info", title, description })),
      warning: (title: string, description?: string) => dispatch(toastAdded({ tone: "warning", title, description })),
      error: (title: string, error?: unknown) =>
        dispatch(toastAdded({ tone: "error", title, description: error === undefined ? undefined : getErrorMessage(error) })),
    }),
    [dispatch],
  );
}
