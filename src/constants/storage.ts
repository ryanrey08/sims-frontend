/** Keys used for browser storage. Only non-sensitive UI/session data is stored. */
export const STORAGE_KEYS = {
  session: "sims.session",
  uiPreferences: "sims.ui",
  appContext: "sims.context",
  mockDatabase: "sims.inventory.mockdb.v6",
} as const;
