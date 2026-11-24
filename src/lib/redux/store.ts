import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { baseApi } from "@/services/api/baseApi";
import authReducer from "@/store/features/authSlice";
import uiReducer from "@/store/features/uiSlice";
import appContextReducer from "@/store/features/appContextSlice";
import { listenerMiddleware } from "./listeners";

const rootReducer = combineReducers({
  auth: authReducer,
  ui: uiReducer,
  appContext: appContextReducer,
  [baseApi.reducerPath]: baseApi.reducer,
});

/** Creates a new store. Called once per browser session from the Provider (App Router safe). */
export function makeStore() {
  const store = configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().prepend(listenerMiddleware.middleware).concat(baseApi.middleware),
    devTools: process.env.NODE_ENV !== "production",
  });
  // Enables refetchOnFocus / refetchOnReconnect.
  setupListeners(store.dispatch);
  return store;
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = AppStore["dispatch"];
