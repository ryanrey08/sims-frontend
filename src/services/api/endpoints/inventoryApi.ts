import type { ListParams, Paginated } from "@/types/api";
import type { StockLevel, StockMovement } from "@/types/models";
import { cleanParams } from "@/lib/utils/query";
import { baseApi } from "../baseApi";

export interface AdjustmentRequest {
  productId: string;
  warehouseId: string;
  direction: "in" | "out";
  quantity: number;
  reason: string;
}

export interface TransferRequest {
  productId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  quantity: number;
  reason: string;
}

/** Every stock change refreshes stock-dependent views across modules. */
const STOCK_CHANGED = ["Stock", "Movement", "Dashboard", "Report", "Activity", "Requisition"] as const;

export const inventoryApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getStockLevels: build.query<Paginated<StockLevel>, ListParams>({
      query: (params) => ({ url: "/inventory/stock", params: cleanParams(params) }),
      providesTags: ["Stock"],
    }),
    getMovements: build.query<Paginated<StockMovement>, ListParams>({
      query: (params) => ({ url: "/inventory/movements", params: cleanParams(params) }),
      providesTags: ["Movement"],
    }),
    getAvailability: build.query<{ productId: string; warehouseId: string; quantity: number }, { productId: string; warehouseId: string }>({
      query: (params) => ({ url: "/inventory/availability", params }),
      providesTags: ["Stock"],
    }),
    createAdjustment: build.mutation<StockMovement, AdjustmentRequest>({
      query: (body) => ({ url: "/inventory/adjustments", method: "POST", body }),
      invalidatesTags: [...STOCK_CHANGED],
    }),
    createTransfer: build.mutation<StockMovement, TransferRequest>({
      query: (body) => ({ url: "/inventory/transfers", method: "POST", body }),
      invalidatesTags: [...STOCK_CHANGED],
    }),
  }),
});

export const {
  useGetStockLevelsQuery,
  useGetMovementsQuery,
  useLazyGetMovementsQuery,
  useGetAvailabilityQuery,
  useCreateAdjustmentMutation,
  useCreateTransferMutation,
} = inventoryApi;
