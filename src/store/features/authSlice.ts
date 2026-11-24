import { createSelector, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Permission } from "@/constants/permissions";
import type { AuthUser } from "@/types/models";

export type AuthStatus = "unknown" | "authenticated" | "unauthenticated";

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  status: AuthStatus;
  /** Set when the API reports an expired or invalid session. */
  sessionExpired: boolean;
}

const initialState: AuthState = { user: null, token: null, status: "unknown", sessionExpired: false };

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    /** Restores a persisted session on the client after hydration. */
    sessionRestored(state, action: PayloadAction<{ user: AuthUser; token: string } | null>) {
      if (action.payload) {
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.status = "authenticated";
      } else {
        state.status = "unauthenticated";
      }
    },
    credentialsSet(state, action: PayloadAction<{ user: AuthUser; token: string }>) {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.status = "authenticated";
      state.sessionExpired = false;
    },
    userUpdated(state, action: PayloadAction<AuthUser>) {
      state.user = action.payload;
    },
    loggedOut(state) {
      state.user = null;
      state.token = null;
      state.status = "unauthenticated";
    },
    sessionExpired(state) {
      state.user = null;
      state.token = null;
      state.status = "unauthenticated";
      state.sessionExpired = true;
    },
  },
});

export const { sessionRestored, credentialsSet, userUpdated, loggedOut, sessionExpired } = authSlice.actions;
export default authSlice.reducer;

type WithAuth = { auth: AuthState };
export const selectAuth = (state: WithAuth) => state.auth;
export const selectCurrentUser = (state: WithAuth) => state.auth.user;
export const selectAuthToken = (state: WithAuth) => state.auth.token;
export const selectAuthStatus = (state: WithAuth) => state.auth.status;
export const selectPermissionSet = createSelector(
  [selectCurrentUser],
  (user) => new Set<Permission>(user?.permissions ?? []),
);
