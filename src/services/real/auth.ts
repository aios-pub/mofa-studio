/**
 * Auth real API
 * Backend endpoints: /api/auth/...
 */

import { apiClient } from "../api/apiClient";
import type {
  SignInReq,
  SignUpReq,
  SignInRes,
  UserToken,
  UserInfo,
} from "../../types/user";

// Raw data format returned by the backend
interface BackendSignInResponse {
  access_token: string;
  refresh_token: string;
  user: {
    avatar: string | null;
    email: string;
    email_verified: boolean;
    username: string;
  };
}

// Convert backend data to frontend format
function transformSignInResponse(data: BackendSignInResponse): SignInRes {
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    user: {
      username: data.user.username,
      email: data.user.email,
      avatar: data.user.avatar,
      emailVerified: data.user.email_verified,
    },
  };
}

const authRealApi = {
  /**
   * Login
   */
  signin: async (data: SignInReq): Promise<SignInRes> => {
    const res = await apiClient.post<BackendSignInResponse>(
      "/api/auth/login",
      data,
    );
    return transformSignInResponse(res);
  },

  /**
   * Register
   */
  signup: (data: SignUpReq): Promise<SignInRes> =>
    apiClient.post<SignInRes>("/api/auth/register", data),

  /**
   * Logout
   */
  logout: (): Promise<void> => apiClient.post("/api/auth/logout"),

  /**
   * Refresh token
   */
  refresh: (refreshToken: string): Promise<UserToken> =>
    apiClient.post<UserToken>("/api/auth/refresh_token", {
      refresh_token: refreshToken,
    }),

  /**
   * Get current user information
   */
  getCurrentUser: (): Promise<UserInfo> =>
    apiClient.post<UserInfo>("/api/auth/current_user"),

  /**
   * Reset password
   */
  resetPassword: (newPassword: string, token?: string): Promise<void> =>
    apiClient.post("/api/auth/reset_password", {
      token: token || "",
      new_password: newPassword,
    }),

  /**
   * Change password (requires current password verification)
   */
  changePassword: (currentPassword: string, newPassword: string): Promise<void> =>
    apiClient.post("/api/auth/reset_password", {
      current_password: currentPassword,
      new_password: newPassword,
    }),
};

export default authRealApi;
