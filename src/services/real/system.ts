/**
 * System 真实 API
 * 后端端点: /api/role/... 和 /api/menu/...
 */

import { apiClient } from "../api/apiClient";

interface Role {
  id: string;
  name: string;
  code: string;
  permissions: string[];
}

interface Menu {
  id: string;
  name: string;
  path: string;
  icon?: string;
  parentId?: string;
  order: number;
}

const roleRealApi = {
  getAll: (): Promise<Role[]> =>
    apiClient.get("/api/role"),

  getPage: (params?: { page?: number; size?: number }): Promise<{ data: Role[]; total: number }> =>
    apiClient.get("/api/role/page", { params }),

  getById: (id: string): Promise<Role> =>
    apiClient.get(`/api/role/${id}`),

  getByName: (name: string): Promise<Role> =>
    apiClient.get(`/api/role/name/${name}`),

  getByCode: (code: string): Promise<Role> =>
    apiClient.get(`/api/role/code/${code}`),

  getByStatus: (status: string): Promise<Role[]> =>
    apiClient.get(`/api/role/status/${status}`),

  create: (data: Partial<Role>): Promise<Role> =>
    apiClient.post("/api/role", data),

  update: (id: string, data: Partial<Role>): Promise<Role> =>
    apiClient.put(`/api/role/${id}`, data),

  delete: (id: string): Promise<void> =>
    apiClient.delete(`/api/role/${id}`),
};

const menuRealApi = {
  getAll: (): Promise<Menu[]> =>
    apiClient.get("/api/menu"),

  getPage: (params?: { page?: number; size?: number }): Promise<{ data: Menu[]; total: number }> =>
    apiClient.get("/api/menu/page", { params }),

  getById: (id: string): Promise<Menu> =>
    apiClient.get(`/api/menu/${id}`),

  getByName: (name: string): Promise<Menu> =>
    apiClient.get(`/api/menu/name/${name}`),

  getByParent: (parentId?: string): Promise<Menu[]> =>
    parentId
      ? apiClient.get(`/api/menu/parent?parent_id=${parentId}`)
      : apiClient.get("/api/menu"),

  create: (data: Partial<Menu>): Promise<Menu> =>
    apiClient.post("/api/menu", data),

  update: (id: string, data: Partial<Menu>): Promise<Menu> =>
    apiClient.put(`/api/menu/${id}`, data),

  delete: (id: string): Promise<void> =>
    apiClient.delete(`/api/menu/${id}`),

  // 别名方法
  getFlatList: async (): Promise<Menu[]> => {
    const menus = await apiClient.get<Menu[]>("/api/menu");
    // 扁平化菜单树
    const flatten = (items: Menu[]): Menu[] => {
      return items.reduce<Menu[]>((acc, item) => {
        acc.push(item);
        return acc;
      }, []);
    };
    return flatten(menus);
  },

  // 兼容旧接口
  getTree: (): Promise<Menu[]> =>
    apiClient.get("/api/menu"),
};

export { roleRealApi, menuRealApi };
