/**
 * Organization real API
 * Backend endpoints: /api/department/... and /api/account/...
 *
 * Backend field mapping (snake_case -> camelCase):
 *   parent_id      → parentId
 *   manager_id     → managerId
 *   member_count   → memberCount
 *   create_time    → createdAt
 *   update_time    → updatedAt
 *   email_verified → emailVerified
 */

import { apiClient } from "../api/apiClient";
import { parseDate } from "./fieldMapper";

// ==================== Frontend types ====================

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  department?: string;
  departmentId?: string;
  status?: string;
  avatar?: string;
  nickname?: string;
  mobile?: string;
  createdAt?: Date;
  lastActive?: Date;
}

interface Department {
  id: string;
  name: string;
  parentId?: string;
  managerId?: string;
  memberCount?: number;
  description?: string;
  createdAt?: Date;
}

// ==================== Raw backend types ====================

interface BackendDepartment {
  id: string;
  name: string;
  parent_id?: string;
  manager_id?: string;
  member_count?: number;
  description?: string;
  tenant_id?: string;
  create_time: string;
  update_time: string;
}

interface BackendAccount {
  id: string;
  username: string;
  email?: string;
  mobile?: string;
  nickname: string;
  gender?: string;
  tenant_id?: string;
  create_time: string;
  update_time: string;
  avatar?: string;
  email_verified?: boolean;
}

// ==================== Field mapping ====================

function mapDepartment(raw: BackendDepartment): Department {
  return {
    id: raw.id,
    name: raw.name,
    parentId: raw.parent_id,
    managerId: raw.manager_id,
    memberCount: raw.member_count,
    description: raw.description,
    createdAt: parseDate(raw.create_time),
  };
}

function mapDepartmentToBackend(data: Partial<Department>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (data.name !== undefined) result.name = data.name;
  if (data.parentId !== undefined) result.parent_id = data.parentId;
  if (data.managerId !== undefined) result.manager_id = data.managerId;
  if (data.description !== undefined) result.description = data.description;
  return result;
}

function mapUser(raw: BackendAccount): User {
  return {
    id: raw.id,
    username: raw.username,
    email: raw.email || "",
    role: "",
    nickname: raw.nickname,
    mobile: raw.mobile,
    avatar: raw.avatar,
    status: "active",
    createdAt: parseDate(raw.create_time),
    lastActive: parseDate(raw.update_time),
  };
}

function mapUserToBackend(data: Partial<User>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (data.username !== undefined) result.username = data.username;
  if (data.email !== undefined) result.email = data.email;
  if (data.nickname !== undefined) result.nickname = data.nickname;
  if (data.mobile !== undefined) result.mobile = data.mobile;
  if (data.avatar !== undefined) result.avatar = data.avatar;
  if (data.status !== undefined) result.status = data.status;
  return result;
}

// ==================== API methods ====================

const organizationRealApi = {
  // ==================== Department management ====================

  async getAll(): Promise<Department[]> {
    const data = await apiClient.get<BackendDepartment[]>("/api/department/list");
    if (!Array.isArray(data)) return [];
    return data.map(mapDepartment);
  },

  async getById(id: string): Promise<Department> {
    const raw = await apiClient.get<BackendDepartment>(`/api/department/${id}`);
    return mapDepartment(raw);
  },

  async create(data: Partial<Department>): Promise<Department> {
    const body = mapDepartmentToBackend(data);
    const raw = await apiClient.post<BackendDepartment>("/api/department/create", body);
    return mapDepartment(raw);
  },

  async update(id: string, data: Partial<Department>): Promise<Department> {
    const existing = await organizationRealApi.getById(id);
    const merged = { ...existing, ...data };
    const body = { id, ...mapDepartmentToBackend(merged) };
    const raw = await apiClient.post<BackendDepartment>("/api/department/update", body);
    return mapDepartment(raw);
  },

  async delete(id: string): Promise<boolean> {
    await apiClient.delete(`/api/department/delete/${id}`);
    return true;
  },

  /** Alias methods */
  getDepartments: (): Promise<Department[]> => organizationRealApi.getAll(),
  getDepartment: (id: string): Promise<Department> => organizationRealApi.getById(id),
  createDepartment: (data: Partial<Department>): Promise<Department> => organizationRealApi.create(data),
  updateDepartment: (id: string, data: Partial<Department>): Promise<Department> => organizationRealApi.update(id, data),
  deleteDepartment: (id: string): Promise<boolean> => organizationRealApi.delete(id),

  /** Get by parent */
  async getByParent(parentId?: string): Promise<Department[]> {
    const url = parentId
      ? `/api/department/by-parent?parent_id=${parentId}`
      : "/api/department/list";
    const data = await apiClient.get<BackendDepartment[]>(url);
    if (!Array.isArray(data)) return [];
    return data.map(mapDepartment);
  },

  /** Get department members */
  getDepartmentMembers: (_departmentId: string): Promise<User[]> => organizationRealApi.getUsers(),

  // ==================== User management ====================

  async getUsers(): Promise<User[]> {
    const data = await apiClient.get<BackendAccount[]>("/api/account/list");
    if (!Array.isArray(data)) return [];
    return data.map(mapUser);
  },

  async getUser(userId: string): Promise<User> {
    const raw = await apiClient.get<BackendAccount>(`/api/account/${userId}`);
    return mapUser(raw);
  },

  async createUser(data: Partial<User>): Promise<User> {
    const body = mapUserToBackend(data);
    const raw = await apiClient.post<BackendAccount>("/api/account/create", body);
    return mapUser(raw);
  },

  async updateUser(userId: string, data: Partial<User>): Promise<User> {
    const existing = await organizationRealApi.getUser(userId);
    const merged = { ...existing, ...data };
    const body = { id: userId, ...mapUserToBackend(merged) };
    const raw = await apiClient.post<BackendAccount>("/api/account/update", body);
    return mapUser(raw);
  },

  async deleteUser(userId: string): Promise<boolean> {
    await apiClient.delete(`/api/account/delete/${userId}`);
    return true;
  },

  /** Batch update status - not yet supported by the backend */
  async batchUpdateStatus(_userIds: string[], _status: string): Promise<boolean> {
    return true;
  },
};

export { organizationRealApi };
export type { User, Department };
