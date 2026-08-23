/**
 * Notification real API
 * Backend endpoints: /api/notification/...
 *
 * Backend field mapping (snake_case -> camelCase):
 *   notification_type → type
 *   create_time       → createdAt
 *   update_time       → updatedAt
 */

import { apiClient } from "../api/apiClient";

// ==================== Frontend types ====================

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

// ==================== Raw backend types ====================

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

// ==================== Field mapping ====================

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

// ==================== API methods ====================

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
    const existing = await notificationRealApi.getById(id);
    const merged = { ...existing, ...data };
    const body: Record<string, unknown> = { id };
    body.notification_type = merged.type;
    body.title = merged.title;
    body.content = merged.content;
    body.read = merged.read;
    if (merged.priority !== undefined) body.priority = merged.priority;
    if (merged.link !== undefined) body.link = merged.link;
    const raw = await apiClient.post<BackendNotification>("/api/notification/update", body);
    return mapNotification(raw);
  },

  async delete(id: string): Promise<boolean> {
    await apiClient.delete(`/api/notification/delete/${id}`);
    return true;
  },

  /** Alias methods */
  fetchNotifications: (): Promise<Notification[]> => notificationRealApi.getAll(),

  /** Get unread */
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
// Export grouping functions from mock
export { groupNotificationsByDate, getUnreadCount } from "../mock/notification";
