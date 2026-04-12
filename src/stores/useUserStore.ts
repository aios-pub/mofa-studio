/**
 * 用户状态管理
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { UserInfo, UserToken } from "../types/user";

type UserStore = {
  userInfo: Partial<UserInfo>;
  userToken: UserToken;
  actions: {
    setUserInfo: (userInfo: UserInfo) => void;
    setUserToken: (token: UserToken) => void;
    clearUserInfoAndToken: () => void;
  };
};

const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      userInfo: {},
      userToken: {},
      actions: {
        setUserInfo: (userInfo) => {
          set({ userInfo });
        },
        setUserToken: (userToken) => {
          set({ userToken });
        },
        clearUserInfoAndToken() {
          set({ userInfo: {}, userToken: {} });
        },
      },
    }),
    {
      name: "AMOS-claw-user-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        userInfo: state.userInfo,
        userToken: state.userToken,
      }),
    },
  ),
);

export const useUserInfo = () => useUserStore((state) => state.userInfo);
export const useUserToken = () => useUserStore((state) => state.userToken);
export const useUserPermissions = () =>
  useUserStore((state) => state.userInfo.permissions || []);
export const useUserRoles = () =>
  useUserStore((state) => state.userInfo.roles || []);
export const useUserActions = () => useUserStore((state) => state.actions);

// 检查是否已登录
export const useIsAuthenticated = () => {
  const { accessToken } = useUserToken();
  return !!accessToken;
};

export default useUserStore;
