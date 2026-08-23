/**
 * System real API
 * Backend endpoints: /api/role/... and /api/menu/...
 *
 * Backend field mapping (snake_case -> camelCase):
 *   parent_id      → parentId
 *   create_time    → createdAt
 *   update_time    → updatedAt
 */

import { apiClient } from "../api/apiClient";
import { parseDate } from "./fieldMapper";

// ==================== Frontend types ====================

interface Role {
  id: string;
  name: string;
  code: string;
  permissions: string[];
  status?: string;
  description?: string;
  createdAt?: Date;
}

interface Menu {
  id: string;
  name: string;
  path: string;
  icon?: string;
  parentId?: string;
  order: number;
  children?: Menu[];
  createdAt?: Date;
}

// ==================== Raw backend types ====================

interface BackendRole {
  id: string;
  name: string;
  code: string;
  permissions?: string[];
  status?: string;
  description?: string;
  tenant_id?: string;
  create_time?: string;
  update_time?: string;
}

interface BackendMenu {
  id: string;
  name: string;
  path?: string;
  icon?: string;
  parent_id?: string;
  order?: number;
  children?: BackendMenu[];
  tenant_id?: string;
  create_time?: string;
  update_time?: string;
}

// ==================== Field mapping ====================

function mapRole(raw: BackendRole): Role {
  return {
    id: raw.id,
    name: raw.name,
    code: raw.code,
    permissions: raw.permissions ?? [],
    status: raw.status,
    description: raw.description,
    createdAt: parseDate(raw.create_time),
  };
}

function mapRoleToBackend(data: Partial<Role>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (data.name !== undefined) result.name = data.name;
  if (data.code !== undefined) result.code = data.code;
  if (data.permissions !== undefined) result.permissions = data.permissions;
  if (data.status !== undefined) result.status = data.status;
  if (data.description !== undefined) result.description = data.description;
  return result;
}

function mapMenu(raw: BackendMenu): Menu {
  return {
    id: raw.id,
    name: raw.name,
    path: raw.path || "",
    icon: raw.icon,
    parentId: raw.parent_id,
    order: raw.order ?? 0,
    children: raw.children?.map(mapMenu),
    createdAt: parseDate(raw.create_time),
  };
}

function mapMenuToBackend(data: Partial<Menu>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (data.name !== undefined) result.name = data.name;
  if (data.path !== undefined) result.path = data.path;
  if (data.icon !== undefined) result.icon = data.icon;
  if (data.parentId !== undefined) result.parent_id = data.parentId;
  if (data.order !== undefined) result.order = data.order;
  return result;
}

// ==================== Role API ====================

const roleRealApi = {
  async getAll(): Promise<Role[]> {
    const data = await apiClient.get<BackendRole[]>("/api/role");
    if (!Array.isArray(data)) return [];
    return data.map(mapRole);
  },

  async getPage(params?: { page?: number; size?: number }): Promise<{ data: Role[]; total: number }> {
    const result = await apiClient.get<{ data: BackendRole[]; total: number }>("/api/role/page", { params });
    return {
      data: (result.data ?? []).map(mapRole),
      total: result.total ?? 0,
    };
  },

  async getById(id: string): Promise<Role> {
    const raw = await apiClient.get<BackendRole>(`/api/role/${id}`);
    return mapRole(raw);
  },

  async getByName(name: string): Promise<Role> {
    const raw = await apiClient.get<BackendRole>(`/api/role/name/${name}`);
    return mapRole(raw);
  },

  async getByCode(code: string): Promise<Role> {
    const raw = await apiClient.get<BackendRole>(`/api/role/code/${code}`);
    return mapRole(raw);
  },

  async getByStatus(status: string): Promise<Role[]> {
    const data = await apiClient.get<BackendRole[]>(`/api/role/status/${status}`);
    if (!Array.isArray(data)) return [];
    return data.map(mapRole);
  },

  async create(data: Partial<Role>): Promise<Role> {
    const body = mapRoleToBackend(data);
    const raw = await apiClient.post<BackendRole>("/api/role", body);
    return mapRole(raw);
  },

  async update(id: string, data: Partial<Role>): Promise<Role> {
    const existing = await roleRealApi.getById(id);
    const merged = { ...existing, ...data };
    const body = mapRoleToBackend(merged);
    const raw = await apiClient.put<BackendRole>(`/api/role/${id}`, body);
    return mapRole(raw);
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/api/role/${id}`);
  },
};

// ==================== Menu API ====================

const menuRealApi = {
  async getAll(): Promise<Menu[]> {
    const data = await apiClient.get<BackendMenu[]>("/api/menu");
    if (!Array.isArray(data)) return [];
    return data.map(mapMenu);
  },

  async getPage(params?: { page?: number; size?: number }): Promise<{ data: Menu[]; total: number }> {
    const result = await apiClient.get<{ data: BackendMenu[]; total: number }>("/api/menu/page", { params });
    return {
      data: (result.data ?? []).map(mapMenu),
      total: result.total ?? 0,
    };
  },

  async getById(id: string): Promise<Menu> {
    const raw = await apiClient.get<BackendMenu>(`/api/menu/${id}`);
    return mapMenu(raw);
  },

  async getByName(name: string): Promise<Menu> {
    const raw = await apiClient.get<BackendMenu>(`/api/menu/name/${name}`);
    return mapMenu(raw);
  },

  async getByParent(parentId?: string): Promise<Menu[]> {
    const url = parentId
      ? `/api/menu/parent?parent_id=${parentId}`
      : "/api/menu";
    const data = await apiClient.get<BackendMenu[]>(url);
    if (!Array.isArray(data)) return [];
    return data.map(mapMenu);
  },

  async create(data: Partial<Menu>): Promise<Menu> {
    const body = mapMenuToBackend(data);
    const raw = await apiClient.post<BackendMenu>("/api/menu", body);
    return mapMenu(raw);
  },

  async update(id: string, data: Partial<Menu>): Promise<Menu> {
    const existing = await menuRealApi.getById(id);
    const merged = { ...existing, ...data };
    const body = mapMenuToBackend(merged);
    const raw = await apiClient.put<BackendMenu>(`/api/menu/${id}`, body);
    return mapMenu(raw);
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/api/menu/${id}`);
  },

  /** Flat list */
  async getFlatList(): Promise<Menu[]> {
    const menus = await apiClient.get<BackendMenu[]>("/api/menu");
    if (!Array.isArray(menus)) return [];
    return menus.map(mapMenu);
  },

  /** Tree structure */
  getTree: (): Promise<Menu[]> => menuRealApi.getAll(),
};

export { roleRealApi, menuRealApi };
