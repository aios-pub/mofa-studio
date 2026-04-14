/**
 * Auth 真实 API
 * 后端端点: /api/auth/...
 */

import { apiClient } from "../api/apiClient";
import type {
  SignInReq,
  SignUpReq,
  SignInRes,
  UserToken,
  UserInfo,
} from "../../types/user";

// 后端返回的原始数据格式
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

// 转换后端数据为前端格式
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
   * 登录
   */
  signin: async (data: SignInReq): Promise<SignInRes> => {
    const res = await apiClient.post<BackendSignInResponse>(
      "/api/auth/login",
      data,
    );
    return transformSignInResponse(res);
  },

  /**
   * 注册
   */
  signup: (data: SignUpReq): Promise<SignInRes> =>
    apiClient.post<SignInRes>("/api/auth/register", data),

  /**
   * 登出
   */
  logout: (): Promise<void> => apiClient.post("/api/auth/logout"),

  /**
   * 刷新 Token
   */
  refresh: (refreshToken: string): Promise<UserToken> =>
    apiClient.post<UserToken>("/api/auth/refresh_token", {
      refresh_token: refreshToken,
    }),

  /**
   * 获取当前用户信息
   */
  getCurrentUser: (): Promise<UserInfo> =>
    apiClient.post<UserInfo>("/api/auth/current_user"),

  /**
   * 重置密码
   */
  resetPassword: (newPassword: string, token?: string): Promise<void> =>
    apiClient.post("/api/auth/reset_password", {
      token: token || "",
      new_password: newPassword,
    }),

  /**
   * 修改密码（需当前密码验证）
   */
  changePassword: (currentPassword: string, newPassword: string): Promise<void> =>
    apiClient.post("/api/auth/reset_password", {
      current_password: currentPassword,
      new_password: newPassword,
    }),
};

export default authRealApi;
