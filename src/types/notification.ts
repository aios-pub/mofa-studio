/**
 * 通知类型定义
 */

export type NotificationType = 'system' | 'message' | 'alert' | 'task';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  content: string;
  priority: NotificationPriority;
  read: boolean;
  createdAt: string;
  avatar?: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationGroup {
  date: string;
  label: string;
  items: NotificationItem[];
}
