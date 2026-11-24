import { createListenerMiddleware, isAnyOf } from "@reduxjs/toolkit";
import { STORAGE_KEYS } from "@/constants/storage";
import { writeStorage, removeStorage } from "@/lib/utils/storage";
import { credentialsSet, loggedOut, sessionExpired, userUpdated, type AuthState } from "@/store/features/authSlice";
import { sidebarToggled, type UiState } from "@/store/features/uiSlice";
import { warehouseSelected, type AppContextState } from "@/store/features/appContextSlice";

type PersistedState = { auth: AuthState; ui: UiState; appContext: AppContextState };

/** Persists selected client state to storage as a side effect, outside reducers. */
export const listenerMiddleware = createListenerMiddleware();

listenerMiddleware.startListening({
  matcher: isAnyOf(credentialsSet, userUpdated),
  effect: (_action, api) => {
    const { auth } = api.getState() as PersistedState;
    if (auth.user && auth.token) writeStorage(STORAGE_KEYS.session, { user: auth.user, token: auth.token });
  },
});

listenerMiddleware.startListening({
  matcher: isAnyOf(loggedOut, sessionExpired),
  effect: () => removeStorage(STORAGE_KEYS.session),
});

listenerMiddleware.startListening({
  actionCreator: sidebarToggled,
  effect: (_action, api) => {
    const { ui } = api.getState() as PersistedState;
    writeStorage(STORAGE_KEYS.uiPreferences, { sidebarCollapsed: ui.sidebarCollapsed });
  },
});

listenerMiddleware.startListening({
  actionCreator: warehouseSelected,
  effect: (_action, api) => {
    const { appContext } = api.getState() as PersistedState;
    writeStorage(STORAGE_KEYS.appContext, appContext);
  },
});
