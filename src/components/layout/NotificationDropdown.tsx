/**
 * 通知下拉面板组件
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Dropdown, Badge, Button, Tabs, List, Avatar, Empty, Spin, Tag } from 'antd';
import {
  BellOutlined,
  CheckOutlined,
  DeleteOutlined,
  ReadOutlined,
  SettingOutlined,
  MessageOutlined,
  AlertOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import type { NotificationItem, NotificationType } from '@/types/notification';
import {
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getUnreadCount,
} from '@/services/mock/notification';
import { formatRelativeTime } from '@/utils';

// 通知类型图标和颜色
const notificationTypeConfig: Record<
  NotificationType,
  { icon: React.ReactNode; color: string }
> = {
  system: { icon: <ToolOutlined />, color: 'blue' },
  message: { icon: <MessageOutlined />, color: 'green' },
  alert: { icon: <AlertOutlined />, color: 'orange' },
  task: { icon: <CheckOutlined />, color: 'purple' },
};

export default function NotificationDropdown() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');

  // 加载通知
  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // 未读数量
  const unreadCount = getUnreadCount(notifications);

  // 过滤后的通知
  const filteredNotifications =
    activeTab === 'unread'
      ? notifications.filter((n) => !n.read)
      : notifications;

  // 标记已读
  const handleMarkAsRead = async (id: string) => {
    await markNotificationAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  // 全部标记已读
  const handleMarkAllAsRead = async () => {
    await markAllNotificationsAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  // 删除通知
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteNotification(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // 点击通知
  const handleClickNotification = (notification: NotificationItem) => {
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
      setOpen(false);
    }
  };

  // 下拉菜单内容
  const dropdownContent = (
    <div className="w-[380px] max-h-[500px] bg-[var(--color-bg-paper)] border border-[var(--color-border)] rounded-lg shadow-lg overflow-hidden">
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
        <span className="font-medium text-[var(--color-text-primary)]">
          {t('notifications.title', '通知')}
        </span>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              type="text"
              size="small"
              icon={<ReadOutlined />}
              onClick={handleMarkAllAsRead}
              className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            >
              {t('notifications.markAllRead', '全部已读')}
            </Button>
          )}
          <Button
            type="text"
            size="small"
            icon={<SettingOutlined />}
            onClick={() => {
              navigate('/system/settings');
              setOpen(false);
            }}
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          />
        </div>
      </div>

      {/* 标签页 */}
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as 'all' | 'unread')}
        size="small"
        className="px-4 pt-2"
        items={[
          {
            key: 'all',
            label: t('notifications.all', '全部'),
          },
          {
            key: 'unread',
            label: (
              <Badge count={unreadCount} size="small" offset={[8, 0]}>
                {t('notifications.unread', '未读')}
              </Badge>
            ),
          },
        ]}
      />

      {/* 通知列表 */}
      <div className="max-h-[340px] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spin />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={t('notifications.empty', '暂无通知')}
            className="py-12"
          />
        ) : (
          <List
            dataSource={filteredNotifications}
            renderItem={(item) => {
              const typeConfig = notificationTypeConfig[item.type];
              return (
                <List.Item
                  className={`
                    px-4 py-3 cursor-pointer transition-colors
                    hover:bg-[var(--color-action-hover)]
                    ${!item.read ? 'bg-[var(--color-primary)]/5' : ''}
                  `}
                  onClick={() => handleClickNotification(item)}
                >
                  <div className="flex gap-3 w-full">
                    {/* 图标/头像 */}
                    <div className="flex-shrink-0">
                      {item.avatar ? (
                        <Avatar src={item.avatar} size={40} />
                      ) : (
                        <Avatar
                          size={40}
                          className="flex items-center justify-center"
                          style={{ backgroundColor: `var(--color-${typeConfig.color})` }}
                        >
                          {typeConfig.icon}
                        </Avatar>
                      )}
                    </div>

                    {/* 内容 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-sm font-medium truncate ${
                            !item.read
                              ? 'text-[var(--color-text-primary)]'
                              : 'text-[var(--color-text-secondary)]'
                          }`}
                        >
                          {item.title}
                        </span>
                        {item.priority === 'urgent' && (
                          <Tag color="red" className="text-xs px-1 py-0 leading-4">
                            {t('notifications.urgent', '紧急')}
                        </Tag>
                        )}
                      </div>
                      <p className="text-xs text-[var(--color-text-tertiary)] line-clamp-2 mb-1">
                        {item.content}
                      </p>
                      <span className="text-xs text-[var(--color-text-tertiary)]">
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>

                    {/* 操作 */}
                    <div className="flex-shrink-0 flex flex-col items-end gap-1">
                      {!item.read && (
                        <div className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />
                      )}
                      <Button
                        type="text"
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={(e) => handleDelete(item.id, e)}
                        className="text-[var(--color-text-tertiary)] hover:text-[var(--color-error)] opacity-0 group-hover:opacity-100"
                        style={{ opacity: 1 }}
                      />
                    </div>
                  </div>
                </List.Item>
              );
            }}
          />
        )}
      </div>

      {/* 底部 */}
      {notifications.length > 0 && (
        <div className="flex items-center justify-center py-3 border-t border-[var(--color-border)]">
          <Button
            type="link"
            size="small"
            onClick={() => {
              navigate('/notifications');
              setOpen(false);
            }}
          >
            {t('notifications.viewAll', '查看全部通知')}
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      dropdownRender={() => dropdownContent}
      trigger={['click']}
      placement="bottomRight"
      arrow={false}
    >
      <Button
        type="text"
        className="rounded-full hover:bg-[var(--color-action-hover)]"
        icon={
          <Badge count={unreadCount} size="small" offset={[2, -2]}>
            <BellOutlined className="text-lg" />
          </Badge>
        }
      />
    </Dropdown>
  );
}
