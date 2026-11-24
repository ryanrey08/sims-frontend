import type { ListParams, MessageResponse, Paginated } from "@/types/api";
import type { User } from "@/types/models";
import { cleanParams } from "@/lib/utils/query";
import { baseApi } from "../baseApi";
import { LIST_ID, provideListTags } from "../apiTags";

export interface UserInput {
  name: string;
  email: string;
  roleId: string;
  department: string;
  status: User["status"];
  /** Only sent on create: the initial password. */
  password?: string;
}

export const usersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getUsers: build.query<Paginated<User>, ListParams>({
      query: (params) => ({ url: "/users", params: cleanParams(params) }),
      providesTags: (result) => provideListTags("User", result?.data),
    }),
    getUser: build.query<User, string>({
      query: (id) => `/users/${id}`,
      providesTags: (_result, _error, id) => [{ type: "User", id }],
    }),
    createUser: build.mutation<User, UserInput>({
      query: (body) => ({ url: "/users", method: "POST", body }),
      invalidatesTags: [{ type: "User", id: LIST_ID }, { type: "Role", id: LIST_ID }, "Activity"],
    }),
    updateUser: build.mutation<User, { id: string; body: UserInput }>({
      query: ({ id, body }) => ({ url: `/users/${id}`, method: "PUT", body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "User", id },
        { type: "User", id: LIST_ID },
        { type: "Role", id: LIST_ID },
        "Auth",
        "Activity",
      ],
    }),
    updateUserStatus: build.mutation<User, { id: string; status: User["status"] }>({
      query: ({ id, status }) => ({ url: `/users/${id}/status`, method: "PATCH", body: { status } }),
      invalidatesTags: (_result, _error, { id }) => [{ type: "User", id }, { type: "User", id: LIST_ID }, "Activity"],
    }),
    deleteUser: build.mutation<MessageResponse, string>({
      query: (id) => ({ url: `/users/${id}`, method: "DELETE" }),
      invalidatesTags: (_result, _error, id) => [
        { type: "User", id },
        { type: "User", id: LIST_ID },
        { type: "Role", id: LIST_ID },
        "Activity",
      ],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useGetUserQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useUpdateUserStatusMutation,
  useDeleteUserMutation,
} = usersApi;
