/**
 * Auth 真实 API
 * 后端端点: /api/auth/...
 */

import { apiClient } from "../api/apiClient";
import type { SignInReq, SignUpReq, SignInRes, UserToken, UserInfo } from "../../types/user";

const authRealApi = {
  /**
   * 登录
   */
  signin: (data: SignInReq): Promise<SignInRes> =>
    apiClient.post<SignInRes>("/api/auth/login", data),

  /**
   * 注册
   */
  signup: (data: SignUpReq): Promise<SignInRes> =>
    apiClient.post<SignInRes>("/api/auth/register", data),

  /**
   * 登出
   */
  logout: (): Promise<void> =>
    apiClient.post("/api/auth/logout"),

  /**
   * 刷新 Token
   */
  refresh: (refreshToken: string): Promise<UserToken> =>
    apiClient.post<UserToken>("/api/auth/refresh_token", { refresh_token: refreshToken }),

  /**
   * 获取当前用户信息
   */
  getCurrentUser: (): Promise<UserInfo> =>
    apiClient.post<UserInfo>("/api/auth/current_user"),
};

export default authRealApi;
