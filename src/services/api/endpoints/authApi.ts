import type { MessageResponse } from "@/types/api";
import type { AuthUser } from "@/types/models";
import { credentialsSet, loggedOut, userUpdated } from "@/store/features/authSlice";
import { baseApi } from "../baseApi";

export interface LoginRequest {
  email: string;
  password: string;
}
export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation<LoginResponse, LoginRequest>({
      query: (body) => ({ url: "/auth/login", method: "POST", body }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(credentialsSet(data));
        } catch {
          // Error is surfaced by the form through the mutation result.
        }
      },
    }),
    logout: build.mutation<MessageResponse, void>({
      query: () => ({ url: "/auth/logout", method: "POST" }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        // Clear the client session whether or not the server call succeeds.
        await queryFulfilled.catch(() => undefined);
        dispatch(loggedOut());
        dispatch(baseApi.util.resetApiState());
      },
    }),
    getMe: build.query<AuthUser, void>({
      query: () => "/auth/me",
      providesTags: ["Auth"],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(userUpdated(data));
        } catch {
          // 401 is handled globally by the base query.
        }
      },
    }),
    updateProfile: build.mutation<AuthUser, { name: string; email: string }>({
      query: (body) => ({ url: "/auth/profile", method: "PUT", body }),
      invalidatesTags: ["User"],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(userUpdated(data));
          dispatch(authApi.util.upsertQueryData("getMe", undefined, data));
        } catch {
          // handled by the form
        }
      },
    }),
    changePassword: build.mutation<MessageResponse, { currentPassword: string; newPassword: string }>({
      query: (body) => ({ url: "/auth/password", method: "PUT", body }),
    }),
    forgotPassword: build.mutation<MessageResponse, { email: string }>({
      query: (body) => ({ url: "/auth/forgot-password", method: "POST", body }),
    }),
    resetPassword: build.mutation<MessageResponse, { token: string; password: string }>({
      query: (body) => ({ url: "/auth/reset-password", method: "POST", body }),
    }),
  }),
});

export const {
  useLoginMutation,
  useLogoutMutation,
  useGetMeQuery,
  useUpdateProfileMutation,
  useChangePasswordMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
} = authApi;
