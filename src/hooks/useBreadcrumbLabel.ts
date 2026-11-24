"use client";

import { useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { breadcrumbLabelSet } from "@/store/features/uiSlice";

/** Replaces a dynamic route segment (such as a record id) with a readable label in the breadcrumbs. */
export function useBreadcrumbLabel(segment: string | undefined, label: string | undefined) {
  const dispatch = useAppDispatch();
  useEffect(() => {
    if (segment && label) dispatch(breadcrumbLabelSet({ segment, label }));
  }, [dispatch, segment, label]);
}
