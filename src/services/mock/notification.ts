/**
 * Mock 通知数据
 */

import type { NotificationItem, NotificationGroup } from '@/types/notification';

// 生成随机时间
function randomTime(hoursAgo: number): string {
  const now = new Date();
  const randomHours = Math.floor(Math.random() * hoursAgo);
  now.setHours(now.getHours() - randomHours);
  return now.toISOString();
}

// Mock 通知数据
export const mockNotifications: NotificationItem[] = [
  {
    id: '1',
    type: 'system',
    title: '系统更新',
    content: '系统将于今晚 22:00 进行维护升级，届时服务将暂停约 30 分钟。',
    priority: 'high',
    read: false,
    createdAt: randomTime(2),
  },
  {
    id: '2',
    type: 'message',
    title: '新消息',
    content: '张三 向您发送了一条消息："请查看最新的 Agent 配置方案"',
    priority: 'normal',
    read: false,
    createdAt: randomTime(4),
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhang',
  },
  {
    id: '3',
    type: 'task',
    title: '任务完成',
    content: 'Agent "客服助手" 的测试任务已完成，成功率 98.5%',
    priority: 'normal',
    read: false,
    createdAt: randomTime(6),
    link: '/evaluation',
  },
  {
    id: '4',
    type: 'alert',
    title: '性能警告',
    content: 'Agent "数据分析" 响应时间超过阈值，请检查配置',
    priority: 'urgent',
    read: true,
    createdAt: randomTime(12),
    link: '/monitoring',
  },
  {
    id: '5',
    type: 'message',
    title: '评论回复',
    content: '李四 回复了您的评论："这个方案很棒，我同意实施"'
    ,
    priority: 'normal',
    read: true,
    createdAt: randomTime(24),
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=li',
  },
  {
    id: '6',
    type: 'system',
    title: '权限变更',
    content: '您已被授予 "Agent 管理员" 角色，现在可以管理所有 Agent',
    priority: 'high',
    read: true,
    createdAt: randomTime(48),
  },
  {
    id: '7',
    type: 'task',
    title: '定时任务执行',
    content: '定时任务 "每日数据备份" 已成功执行',
    priority: 'low',
    read: true,
    createdAt: randomTime(72),
    link: '/management/tasks',
  },
];

// 按日期分组
export function groupNotificationsByDate(
  notifications: NotificationItem[]
): NotificationGroup[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const groups: Map<string, NotificationItem[]> = new Map();
  const labelMap: Map<string, string> = new Map();

  for (const notification of notifications) {
    const date = new Date(notification.createdAt);
    let key: string;
    let label: string;

    if (date >= today) {
      key = 'today';
      label = '今天';
    } else if (date >= yesterday) {
      key = 'yesterday';
      label = '昨天';
    } else if (date >= weekAgo) {
      key = 'week';
      label = '本周';
    } else {
      key = 'older';
      label = '更早';
    }

    labelMap.set(key, label);

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(notification);
  }

  const order = ['today', 'yesterday', 'week', 'older'];
  const result: NotificationGroup[] = [];

  for (const key of order) {
    if (groups.has(key)) {
      result.push({
        date: key,
        label: labelMap.get(key) || key,
        items: groups.get(key)!,
      });
    }
  }

  return result;
}

// 模拟 API 获取通知
export async function fetchNotifications(): Promise<NotificationItem[]> {
  // 模拟网络延迟
  await new Promise((resolve) => setTimeout(resolve, 500));
  return mockNotifications;
}

// 模拟 API 标记已读
export async function markNotificationAsRead(id: string): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  const notification = mockNotifications.find((n) => n.id === id);
  if (notification) {
    notification.read = true;
  }
}

// 模拟 API 全部标记已读
export async function markAllNotificationsAsRead(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  mockNotifications.forEach((n) => {
    n.read = true;
  });
}

// 模拟 API 删除通知
export async function deleteNotification(id: string): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  const index = mockNotifications.findIndex((n) => n.id === id);
  if (index > -1) {
    mockNotifications.splice(index, 1);
  }
}

// 获取未读数量
export function getUnreadCount(notifications: NotificationItem[]): number {
  return notifications.filter((n) => !n.read).length;
}
