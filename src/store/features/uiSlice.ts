import { createSlice, nanoid, type PayloadAction } from "@reduxjs/toolkit";

export type ToastTone = "success" | "error" | "info" | "warning";
export interface Toast {
  id: string;
  tone: ToastTone;
  title: string;
  description?: string;
}

export interface UiState {
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  toasts: Toast[];
  /** Human-readable labels for dynamic route segments (e.g. a record id → its name). */
  breadcrumbLabels: Record<string, string>;
}

const initialState: UiState = { sidebarCollapsed: false, mobileNavOpen: false, toasts: [], breadcrumbLabels: {} };

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    preferencesRestored(state, action: PayloadAction<Partial<Pick<UiState, "sidebarCollapsed">> | null>) {
      if (action.payload?.sidebarCollapsed !== undefined) state.sidebarCollapsed = action.payload.sidebarCollapsed;
    },
    sidebarToggled(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    mobileNavSet(state, action: PayloadAction<boolean>) {
      state.mobileNavOpen = action.payload;
    },
    toastAdded: {
      reducer(state, action: PayloadAction<Toast>) {
        state.toasts = [...state.toasts.slice(-3), action.payload];
      },
      prepare(toast: Omit<Toast, "id">) {
        return { payload: { ...toast, id: nanoid() } };
      },
    },
    toastDismissed(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((toast) => toast.id !== action.payload);
    },
    breadcrumbLabelSet(state, action: PayloadAction<{ segment: string; label: string }>) {
      state.breadcrumbLabels[action.payload.segment] = action.payload.label;
    },
  },
});

export const { preferencesRestored, sidebarToggled, mobileNavSet, toastAdded, toastDismissed, breadcrumbLabelSet } =
  uiSlice.actions;
export default uiSlice.reducer;

type WithUi = { ui: UiState };
export const selectSidebarCollapsed = (state: WithUi) => state.ui.sidebarCollapsed;
export const selectMobileNavOpen = (state: WithUi) => state.ui.mobileNavOpen;
export const selectToasts = (state: WithUi) => state.ui.toasts;
export const selectBreadcrumbLabels = (state: WithUi) => state.ui.breadcrumbLabels;
