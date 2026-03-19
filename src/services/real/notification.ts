/**
 * Notification 真实 API
 * 后端端点: /api/notification/...
 */

import { createActionApi } from "./base";
import { apiClient } from "../api/apiClient";

interface Notification {
  id: string;
  type: string;
  title: string;
  content: string;
  read: boolean;
  createdAt: string;
}

const baseApi = createActionApi<Notification>("/api/notification", "list");

const notificationRealApi = {
  ...baseApi,

  // 别名方法
  fetchNotifications: (): Promise<Notification[]> =>
    apiClient.get<Notification[]>("/api/notification/list"),

  getUnread: (): Promise<Notification[]> =>
    apiClient.get<Notification[]>("/api/notification/unread"),

  markAsRead: (notificationId: string): Promise<void> =>
    apiClient.post(`/api/notification/mark-read/${notificationId}`),

  markNotificationAsRead: (notificationId: string): Promise<void> =>
    apiClient.post(`/api/notification/mark-read/${notificationId}`),

  markAllNotificationsAsRead: async (): Promise<void> => {
    // 后端可能没有批量标记接口，逐个标记
    const unread = await apiClient.get<Notification[]>("/api/notification/unread");
    for (const n of unread) {
      await apiClient.post(`/api/notification/mark-read/${n.id}`);
    }
  },

  deleteNotification: async (id: string): Promise<boolean> => {
    await apiClient.delete(`/api/notification/delete/${id}`);
    return true;
  },

  getUnreadCount: async (): Promise<number> => {
    const unread = await apiClient.get<Notification[]>("/api/notification/unread");
    return unread.length;
  },
};

export { notificationRealApi };
// 从 mock 导出分组函数
export { groupNotificationsByDate, getUnreadCount } from "../mock/notification";
