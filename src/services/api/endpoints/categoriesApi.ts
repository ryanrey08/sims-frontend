import type { ListParams, MessageResponse, Paginated } from "@/types/api";
import type { Category } from "@/types/models";
import { cleanParams } from "@/lib/utils/query";
import { baseApi } from "../baseApi";
import { LIST_ID, provideListTags } from "../apiTags";

export type CategoryInput = Pick<Category, "code" | "name" | "description" | "status">;

export const categoriesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getCategories: build.query<Paginated<Category>, ListParams | void>({
      query: (params) => ({ url: "/categories", params: cleanParams(params ?? { pageSize: 100 }) }),
      providesTags: (result) => provideListTags("Category", result?.data),
    }),
    createCategory: build.mutation<Category, CategoryInput>({
      query: (body) => ({ url: "/categories", method: "POST", body }),
      invalidatesTags: [{ type: "Category", id: LIST_ID }, "Activity"],
    }),
    updateCategory: build.mutation<Category, { id: string; body: CategoryInput }>({
      query: ({ id, body }) => ({ url: `/categories/${id}`, method: "PUT", body }),
      invalidatesTags: (_result, _error, { id }) => [{ type: "Category", id }, { type: "Category", id: LIST_ID }, { type: "Product", id: LIST_ID }, "Report"],
    }),
    deleteCategory: build.mutation<MessageResponse, string>({
      query: (id) => ({ url: `/categories/${id}`, method: "DELETE" }),
      invalidatesTags: (_result, _error, id) => [{ type: "Category", id }, { type: "Category", id: LIST_ID }],
    }),
  }),
});

export const { useGetCategoriesQuery, useCreateCategoryMutation, useUpdateCategoryMutation, useDeleteCategoryMutation } = categoriesApi;
