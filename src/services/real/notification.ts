/**
 * Notification 真实 API
 * 后端端点: /api/notification/...
 *
 * 后端字段映射 (snake_case → camelCase):
 *   notification_type → type
 *   create_time       → createdAt
 *   update_time       → updatedAt
 */

import { apiClient } from "../api/apiClient";

// ==================== 前端类型 ====================

interface Notification {
  id: string;
  type: string;
  title: string;
  content: string;
  read: boolean;
  priority?: string;
  link?: string;
  avatar?: string;
  createdAt: string | Date;
}

// ==================== 后端原始类型 ====================

interface BackendNotification {
  id: string;
  notification_type: string;
  title: string;
  content: string;
  priority?: string;
  read: boolean;
  link?: string;
  avatar?: string;
  tenant_id?: string;
  create_time: string;
  update_time: string;
}

// ==================== 字段映射 ====================

function mapNotification(raw: BackendNotification): Notification {
  return {
    id: raw.id,
    type: raw.notification_type,
    title: raw.title,
    content: raw.content,
    read: raw.read,
    priority: raw.priority,
    link: raw.link,
    avatar: raw.avatar,
    createdAt: raw.create_time,
  };
}

// ==================== API 方法 ====================

const notificationRealApi = {
  async getAll(): Promise<Notification[]> {
    const data = await apiClient.get<BackendNotification[]>("/api/notification/list");
    if (!Array.isArray(data)) return [];
    return data.map(mapNotification);
  },

  async getById(id: string): Promise<Notification> {
    const raw = await apiClient.get<BackendNotification>(`/api/notification/${id}`);
    return mapNotification(raw);
  },

  async create(data: Partial<Notification>): Promise<Notification> {
    const body: Record<string, unknown> = {};
    if (data.type !== undefined) body.notification_type = data.type;
    if (data.title !== undefined) body.title = data.title;
    if (data.content !== undefined) body.content = data.content;
    if (data.priority !== undefined) body.priority = data.priority;
    if (data.link !== undefined) body.link = data.link;
    const raw = await apiClient.post<BackendNotification>("/api/notification/create", body);
    return mapNotification(raw);
  },

  async update(id: string, data: Partial<Notification>): Promise<Notification> {
    const body: Record<string, unknown> = { id };
    if (data.read !== undefined) body.read = data.read;
    if (data.title !== undefined) body.title = data.title;
    const raw = await apiClient.post<BackendNotification>("/api/notification/update", body);
    return mapNotification(raw);
  },

  async delete(id: string): Promise<boolean> {
    await apiClient.delete(`/api/notification/delete/${id}`);
    return true;
  },

  /** 别名方法 */
  fetchNotifications: (): Promise<Notification[]> => notificationRealApi.getAll(),

  /** 获取未读 */
  async getUnread(): Promise<Notification[]> {
    const data = await apiClient.get<BackendNotification[]>("/api/notification/unread");
    if (!Array.isArray(data)) return [];
    return data.map(mapNotification);
  },

  markAsRead: (notificationId: string): Promise<void> =>
    apiClient.post(`/api/notification/mark-read/${notificationId}`),

  markNotificationAsRead: (notificationId: string): Promise<void> =>
    notificationRealApi.markAsRead(notificationId),

  async markAllNotificationsAsRead(): Promise<void> {
    const unread = await apiClient.get<BackendNotification[]>("/api/notification/unread");
    for (const n of unread) {
      await apiClient.post(`/api/notification/mark-read/${n.id}`);
    }
  },

  deleteNotification: (id: string): Promise<boolean> => notificationRealApi.delete(id),

  async getUnreadCount(): Promise<number> {
    const unread = await apiClient.get<BackendNotification[]>("/api/notification/unread");
    return Array.isArray(unread) ? unread.length : 0;
  },
};

export { notificationRealApi };
// 从 mock 导出分组函数
export { groupNotificationsByDate, getUnreadCount } from "../mock/notification";
