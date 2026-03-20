/**
 * Mock 认证服务
 */

import type {
  UserInfo,
  SignInReq,
  SignUpReq,
  SignInRes,
  UserToken,
} from "../../types/user";

// Mock 用户数据
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

// 生成 Mock Token
const generateMockToken = (userId: string): string => {
  return `mock_access_token_${userId}_${Date.now()}`;
};

const generateMockRefreshToken = (userId: string): string => {
  return `mock_refresh_token_${userId}_${Date.now()}`;
};

// 模拟延迟
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const authApi = {
  /**
   * 登录
   */
  signin: async (data: SignInReq): Promise<SignInRes> => {
    await delay(500); // 模拟网络延迟

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
   * 注册
   */
  signup: async (data: SignUpReq): Promise<SignInRes> => {
    await delay(500);

    // 检查用户名是否已存在
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

    // 添加到 Mock 数据（实际应用中会写入数据库）
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
   * 登出
   */
  logout: async (): Promise<void> => {
    await delay(200);
    // Mock 登出，实际应用中会调用后端 API
  },

  /**
   * 刷新 Token
   */
  refresh: async (refreshToken: string): Promise<UserToken> => {
    await delay(300);

    // 解析 refresh token 获取用户 ID
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
};

export default authApi;
