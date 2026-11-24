import type { Permission } from "@/constants/permissions";
import type { ListParams, MessageResponse, Paginated } from "@/types/api";
import type { PermissionDefinition, Role } from "@/types/models";
import { cleanParams } from "@/lib/utils/query";
import { baseApi } from "../baseApi";
import { LIST_ID, provideListTags } from "../apiTags";

export interface RoleInput {
  name: string;
  description: string;
  permissions: Permission[];
}

export const rolesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getRoles: build.query<Paginated<Role>, ListParams | void>({
      query: (params) => ({ url: "/roles", params: cleanParams(params ?? undefined) }),
      providesTags: (result) => provideListTags("Role", result?.data),
    }),
    getRole: build.query<Role, string>({
      query: (id) => `/roles/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Role", id }],
    }),
    getPermissions: build.query<PermissionDefinition[], void>({
      query: () => "/permissions",
      keepUnusedDataFor: 600,
    }),
    createRole: build.mutation<Role, RoleInput>({
      query: (body) => ({ url: "/roles", method: "POST", body }),
      invalidatesTags: [{ type: "Role", id: LIST_ID }, "Activity"],
    }),
    updateRole: build.mutation<Role, { id: string; body: RoleInput }>({
      query: ({ id, body }) => ({ url: `/roles/${id}`, method: "PUT", body }),
      // Permissions may change for the signed-in user, so refresh "Auth" too.
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Role", id },
        { type: "Role", id: LIST_ID },
        { type: "User", id: LIST_ID },
        "Auth",
        "Activity",
      ],
    }),
    deleteRole: build.mutation<MessageResponse, string>({
      query: (id) => ({ url: `/roles/${id}`, method: "DELETE" }),
      invalidatesTags: (_result, _error, id) => [{ type: "Role", id }, { type: "Role", id: LIST_ID }, "Activity"],
    }),
  }),
});

export const {
  useGetRolesQuery,
  useGetRoleQuery,
  useGetPermissionsQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
} = rolesApi;
