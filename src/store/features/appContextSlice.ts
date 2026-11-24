import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

/**
 * Application-wide context chosen by the user. The selected warehouse acts as a
 * global filter for stock, movement and dashboard views ("" = all warehouses).
 */
export interface AppContextState {
  warehouseId: string;
}

const initialState: AppContextState = { warehouseId: "" };

const appContextSlice = createSlice({
  name: "appContext",
  initialState,
  reducers: {
    contextRestored(state, action: PayloadAction<Partial<AppContextState> | null>) {
      if (typeof action.payload?.warehouseId === "string") state.warehouseId = action.payload.warehouseId;
    },
    warehouseSelected(state, action: PayloadAction<string>) {
      state.warehouseId = action.payload;
    },
  },
});

export const { contextRestored, warehouseSelected } = appContextSlice.actions;
export default appContextSlice.reducer;

type WithContext = { appContext: AppContextState };
export const selectWarehouseId = (state: WithContext) => state.appContext.warehouseId;
