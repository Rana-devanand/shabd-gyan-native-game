import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQuery";

export const api = createApi({
  reducerPath: "api",
  tagTypes: ["ME"],
  baseQuery: baseQueryWithReauth,
  endpoints: (builder) => ({
    me: builder.query<ApiResponse<User>, void>({
      query: () => `/users/me`,
      providesTags: ["ME"],
    }),
    login: builder.mutation<
      ApiResponse<{ accessToken: string; refreshToken: string }>,
      { email: string; password: string }
    >({
      query: (body) => {
        return { url: `/users/login`, method: "POST", body };
      },
    }),
    register: builder.mutation<
      ApiResponse<User>,
      Omit<User, "_id" | "active" | "role" | "provider"> & {
        confirmPassword: string;
      }
    >({
      query: (body) => {
        return { url: `/users/register`, method: "POST", body };
      },
    }),
    inviteUser: builder.mutation<
      ApiResponse<User>,
      Omit<User, "_id" | "active" | "role" | "provider"> & {
        confirmPassword: string;
      }
    >({
      query: (body) => {
        return { url: `/users/invite`, method: "POST", body };
      },
    }),
    updateUser: builder.mutation<ApiResponse<User>, User>({
      query: (body) => {
        return { url: `/users/${body._id}`, method: "PUT", body };
      },
    }),
    logout: builder.mutation<void, void>({
      query: () => {
        return { url: `/users/logout`, method: "POST" };
      },
    }),
    loginByApple: builder.mutation<
      ApiResponse<{ accessToken: string; refreshToken: string }>,
      { id_token: string }
    >({
      query: (body) => {
        return { url: `/users/social/apple`, method: "POST", body };
      },
    }),
    loginByGoogle: builder.mutation<
      ApiResponse<{ accessToken: string; refreshToken: string }>,
      { access_token: string }
    >({
      query: (body) => {
        return { url: `/users/social/google`, method: "POST", body };
      },
    }),
    loginByLinkedIn: builder.mutation<
      ApiResponse<{ accessToken: string; refreshToken: string }>,
      { access_token: string }
    >({
      query: (body) => {
        return { url: `/users/social/linkedin`, method: "POST", body };
      },
    }),
    loginByFacebook: builder.mutation<
      ApiResponse<{ accessToken: string; refreshToken: string }>,
      { access_token: string }
    >({
      query: (body) => {
        return { url: `/users/social/facebook`, method: "POST", body };
      },
    }),
    changePassword: builder.mutation<
      ApiResponse<{}>,
      {
        confirmPassword: string;
        password: string;
        currentPassword?: string | null;
      }
    >({
      query: (body) => {
        return { url: `/users/change-password`, method: "POST", body };
      },
    }),
    resetPassword: builder.mutation<
      ApiResponse<{}>,
      {
        confirmPassword: string;
        password: string;
        token: string;
      }
    >({
      query: (body) => {
        return { url: `/users/reset-password`, method: "POST", body };
      },
    }),
    verfiyInvitation: builder.mutation<
      ApiResponse<{}>,
      {
        confirmPassword: string;
        password: string;
        token: string;
      }
    >({
      query: (body) => {
        return { url: `/users/verify-invitation`, method: "POST", body };
      },
    }),
    forgotPassword: builder.mutation<
      ApiResponse<{}>,
      {
        email: string;
      }
    >({
      query: (body) => {
        return { url: `/users/forgot-password`, method: "POST", body };
      },
    }),
  }),
});
export const {
  useMeQuery,
  useLoginMutation,
  useLogoutMutation,
  useRegisterMutation,
  useInviteUserMutation,
  useUpdateUserMutation,
  useLoginByAppleMutation,
  useLoginByFacebookMutation,
  useLoginByGoogleMutation,
  useLoginByLinkedInMutation,
  useChangePasswordMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useVerfiyInvitationMutation,
} = api;
