import type { ListParams, MessageResponse, Paginated } from "@/types/api";
import type { Product, StockLevel, StockMovement } from "@/types/models";
import { cleanParams } from "@/lib/utils/query";
import { baseApi } from "../baseApi";
import { LIST_ID, provideListTags } from "../apiTags";

export type ProductInput = Omit<Product, "id" | "createdAt" | "updatedAt" | "categoryName" | "supplierName" | "totalStock" | "reservedStock" | "stockValue" | "stockStatus">;

export const productsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getProducts: build.query<Paginated<Product>, ListParams>({
      query: (params) => ({ url: "/products", params: cleanParams(params) }),
      providesTags: (result) => [...provideListTags("Product", result?.data), "Stock"],
    }),
    getProduct: build.query<Product, string>({
      query: (id) => `/products/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Product", id }, "Stock"],
    }),
    getProductStock: build.query<StockLevel[], string>({
      query: (id) => `/products/${id}/stock`,
      providesTags: ["Stock"],
    }),
    getProductMovements: build.query<StockMovement[], { id: string; limit?: number }>({
      query: ({ id, limit }) => ({ url: `/products/${id}/movements`, params: cleanParams({ limit }) }),
      providesTags: ["Movement"],
    }),
    createProduct: build.mutation<Product, ProductInput>({
      query: (body) => ({ url: "/products", method: "POST", body }),
      invalidatesTags: [{ type: "Product", id: LIST_ID }, { type: "Category", id: LIST_ID }, "Dashboard", "Activity"],
    }),
    updateProduct: build.mutation<Product, { id: string; body: ProductInput }>({
      query: ({ id, body }) => ({ url: `/products/${id}`, method: "PUT", body }),
      invalidatesTags: [{ type: "Product", id: LIST_ID }, { type: "Category", id: LIST_ID }, "Stock", "Dashboard", "Report", "Activity"],
      // Manual cache update: write the saved record into the detail cache immediately.
      async onQueryStarted({ id }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(productsApi.util.upsertQueryData("getProduct", id, data));
        } catch {
          // form shows the error
        }
      },
    }),
    updateProductStatus: build.mutation<Product, { id: string; status: Product["status"] }>({
      query: ({ id, status }) => ({ url: `/products/${id}/status`, method: "PATCH", body: { status } }),
      invalidatesTags: [{ type: "Product", id: LIST_ID }, "Dashboard", "Activity"],
      // Optimistic update, rolled back if the request fails.
      async onQueryStarted({ id, status }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          productsApi.util.updateQueryData("getProduct", id, (draft) => {
            draft.status = status;
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),
    deleteProduct: build.mutation<MessageResponse, string>({
      query: (id) => ({ url: `/products/${id}`, method: "DELETE" }),
      invalidatesTags: (_result, _error, id) => [{ type: "Product", id }, { type: "Product", id: LIST_ID }, { type: "Category", id: LIST_ID }, "Stock", "Dashboard", "Activity"],
    }),
  }),
});

export const {
  useGetProductsQuery,
  useLazyGetProductsQuery,
  useGetProductQuery,
  useGetProductStockQuery,
  useGetProductMovementsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useUpdateProductStatusMutation,
  useDeleteProductMutation,
} = productsApi;
