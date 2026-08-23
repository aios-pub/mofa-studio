/**
 * Mock auth service
 */

import type {
  UserInfo,
  SignInReq,
  SignUpReq,
  SignInRes,
  UserToken,
} from "../../types/user";

// Mock user data
const MOCK_USERS: Array<{
  username: string;
  password: string;
  userInfo: UserInfo;
}> = [
  {
    username: "admin",
    password: "123456",
    userInfo: {
      id: "1",
      username: "admin",
      email: "admin@aios.pub",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=admin",
      roles: [{ code: "admin", name: "管理员" }],
      permissions: [
        { code: "user.create", name: "创建用户" },
        { code: "user.edit", name: "编辑用户" },
        { code: "user.delete", name: "删除用户" },
        { code: "user.view", name: "查看用户" },
        { code: "agent.create", name: "创建Agent" },
        { code: "agent.edit", name: "编辑Agent" },
        { code: "agent.delete", name: "删除Agent" },
        { code: "agent.view", name: "查看Agent" },
        { code: "prompt.create", name: "创建提示词" },
        { code: "prompt.edit", name: "编辑提示词" },
        { code: "prompt.delete", name: "删除提示词" },
        { code: "prompt.view", name: "查看提示词" },
        { code: "system.settings", name: "系统设置" },
        { code: "system.audit", name: "审计日志" },
      ],
    },
  },
  {
    username: "user",
    password: "123456",
    userInfo: {
      id: "2",
      username: "user",
      email: "user@aios.pub",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=user",
      roles: [{ code: "user", name: "普通用户" }],
      permissions: [
        { code: "agent.view", name: "查看Agent" },
        { code: "prompt.view", name: "查看提示词" },
        { code: "conversation.create", name: "创建对话" },
      ],
    },
  },
];

// Generate mock tokens
const generateMockToken = (userId: string): string => {
  return `mock_access_token_${userId}_${Date.now()}`;
};

const generateMockRefreshToken = (userId: string): string => {
  return `mock_refresh_token_${userId}_${Date.now()}`;
};

// Simulated latency
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const authApi = {
  /**
   * Login
   */
  signin: async (data: SignInReq): Promise<SignInRes> => {
    await delay(500); // simulate network latency

    const user = MOCK_USERS.find(
      (u) => u.username === data.username && u.password === data.password,
    );

    if (!user) {
      throw new Error("用户名或密码错误");
    }

    return {
      accessToken: generateMockToken(user.userInfo.id || user.username),
      refreshToken: generateMockRefreshToken(user.userInfo.id || user.username),
      user: user.userInfo,
    };
  },

  /**
   * Register
   */
  signup: async (data: SignUpReq): Promise<SignInRes> => {
    await delay(500);

    // Check whether the username already exists
    const existingUser = MOCK_USERS.find((u) => u.username === data.username);
    if (existingUser) {
      throw new Error("用户名已存在");
    }

    const newUser: UserInfo = {
      id: `${MOCK_USERS.length + 1}`,
      username: data.username,
      email: data.email,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.username}`,
      roles: [{ code: "user", name: "普通用户" }],
      permissions: [
        { code: "agent.view", name: "查看Agent" },
        { code: "prompt.view", name: "查看提示词" },
        { code: "conversation.create", name: "创建对话" },
      ],
    };

    // Add to mock data (real app would write to the database)
    MOCK_USERS.push({
      username: data.username,
      password: data.password,
      userInfo: newUser,
    });

    return {
      accessToken: generateMockToken(newUser.id || newUser.username),
      refreshToken: generateMockRefreshToken(newUser.id || newUser.username),
      user: newUser,
    };
  },

  /**
   * Logout
   */
  logout: async (): Promise<void> => {
    await delay(200);
    // Mock logout; real app would call the backend API
  },

  /**
   * Refresh token
   */
  refresh: async (refreshToken: string): Promise<UserToken> => {
    await delay(300);

    // Parse the refresh token to get the user ID
    const match = refreshToken.match(/mock_refresh_token_(\d+)_/);
    if (!match) {
      throw new Error("无效的 refresh token");
    }

    const userId = match[1];
    const user = MOCK_USERS.find((u) => u.userInfo.id === userId);
    if (!user) {
      throw new Error("用户不存在");
    }

    return {
      accessToken: generateMockToken(userId),
      refreshToken: generateMockRefreshToken(userId),
    };
  },

  /**
   * Reset password
   */
  resetPassword: async (_newPassword: string, _token?: string): Promise<void> => {
    await delay(300);
  },

  /**
   * Change password
   */
  changePassword: async (_currentPassword: string, _newPassword: string): Promise<void> => {
    await delay(300);
  },
};

export default authApi;
