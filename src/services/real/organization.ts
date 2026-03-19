/**
 * Organization 真实 API
 * 后端端点: /api/department/... 和 /api/account/...
 */

import { createActionApi } from "./base";
import { apiClient } from "../api/apiClient";

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  department?: string;
  departmentId?: string;
  status?: string;
  avatar?: string;
  createdAt?: Date;
  lastActive?: Date;
}

interface Department {
  id: string;
  name: string;
  parentId?: string;
  managerId?: string;
}

const baseDepartmentApi = createActionApi<Department>("/api/department", "list");

const organizationRealApi = {
  // 部门管理
  ...baseDepartmentApi,

  // 别名方法
  getDepartments: (): Promise<Department[]> =>
    apiClient.get<Department[]>("/api/department/list"),

  getDepartment: (id: string): Promise<Department> =>
    apiClient.get<Department>(`/api/department/${id}`),

  createDepartment: (data: Partial<Department>): Promise<Department> =>
    apiClient.post<Department>("/api/department/create", data),

  updateDepartment: (id: string, data: Partial<Department>): Promise<Department> =>
    apiClient.post<Department>("/api/department/update", { id, ...data }),

  deleteDepartment: async (id: string): Promise<boolean> => {
    await apiClient.delete(`/api/department/delete/${id}`);
    return true;
  },

  getByParent: (parentId?: string): Promise<Department[]> =>
    parentId
      ? apiClient.get<Department[]>(`/api/department/by-parent?parent_id=${parentId}`)
      : apiClient.get<Department[]>("/api/department/list"),

  getDepartmentMembers: (_departmentId: string): Promise<User[]> => {
    // 暂时返回空数组，后续可以通过过滤实现
    return organizationRealApi.getUsers();
  },

  // 用户管理 (通过 /api/account/...)
  getUsers: (): Promise<User[]> =>
    apiClient.get<User[]>("/api/account/list"),

  getUser: (userId: string): Promise<User> =>
    apiClient.get<User>(`/api/account/${userId}`),

  createUser: (data: Partial<User>): Promise<User> =>
    apiClient.post<User>("/api/account/create", data),

  updateUser: (userId: string, data: Partial<User>): Promise<User> =>
    apiClient.post<User>("/api/account/update", { id: userId, ...data }),

  deleteUser: async (userId: string): Promise<boolean> => {
    await apiClient.delete(`/api/account/delete/${userId}`);
    return true;
  },

  // 批量更新用户状态
  batchUpdateStatus: async (_userIds: string[], _status: string): Promise<boolean> => {
    console.warn("batchUpdateStatus: Backend does not support batch update endpoint");
    return true;
  },
};

export { organizationRealApi };
export type { User, Department };
