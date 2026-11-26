/** Keys used for browser storage. Only non-sensitive UI/session data is stored. */
export const STORAGE_KEYS = {
  session: "sims.session",
  uiPreferences: "sims.ui",
  appContext: "sims.context",
  mockDatabase: "sims.inventory.mockdb.v7",
} as const;
