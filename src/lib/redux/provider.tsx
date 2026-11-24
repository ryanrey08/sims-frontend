"use client";

import { useEffect, useState } from "react";
import { Provider } from "react-redux";
import { STORAGE_KEYS } from "@/constants/storage";
import { readStorage } from "@/lib/utils/storage";
import { sessionRestored } from "@/store/features/authSlice";
import { preferencesRestored } from "@/store/features/uiSlice";
import { contextRestored, type AppContextState } from "@/store/features/appContextSlice";
import type { AuthUser } from "@/types/models";
import { makeStore, type AppStore } from "./store";

/**
 * Creates the store once per client and restores persisted state after mount,
 * so server and first client render match (no hydration mismatch).
 */
export function ReduxProvider({ children }: { children: React.ReactNode }) {
  const [store] = useState<AppStore>(() => makeStore());

  useEffect(() => {
    store.dispatch(preferencesRestored(readStorage<{ sidebarCollapsed: boolean }>(STORAGE_KEYS.uiPreferences)));
    store.dispatch(contextRestored(readStorage<AppContextState>(STORAGE_KEYS.appContext)));
    store.dispatch(sessionRestored(readStorage<{ user: AuthUser; token: string }>(STORAGE_KEYS.session)));
  }, [store]);

  return <Provider store={store}>{children}</Provider>;
}
