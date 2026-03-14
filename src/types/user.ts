/**
 * 用户相关类型定义
 */

export interface Role {
  code: string;
  name: string;
}

export interface Permission {
  code: string;
  name: string;
}

export interface UserInfo {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  roles: Role[];
  permissions: Permission[];
  createdAt?: string;
  updatedAt?: string;
}

export interface UserToken {
  accessToken?: string;
  refreshToken?: string;
}

export interface SignInReq {
  username: string;
  password: string;
}

export interface SignUpReq extends SignInReq {
  email: string;
}

export interface SignInRes extends UserToken {
  user: UserInfo;
}
