"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => undefined;

/**
 * False while React hydrates server HTML (and on the server), true afterwards.
 * Components that depend on browser-restored state (session, preferences) render
 * their server markup until this is true, which avoids hydration mismatches even
 * when a Suspense boundary hydrates after the store has been restored.
 */
export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
