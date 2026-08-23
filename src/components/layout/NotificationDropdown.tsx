/**
 * Notification dropdown panel component
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Dropdown, Badge, Button, Tabs, Avatar, Empty, Spin, Tag } from "antd";
import {
  BellOutlined,
  CheckOutlined,
  DeleteOutlined,
  ReadOutlined,
  SettingOutlined,
  MessageOutlined,
  AlertOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import type { NotificationItem, NotificationType } from "@/types/notification";
import { notificationApi, getUnreadCount } from "@/services";
import { formatRelativeTime } from "@/utils";

// Notification type icon and color
const notificationTypeConfig: Record<
  NotificationType,
  { icon: React.ReactNode; color: string }
> = {
  system: { icon: <ToolOutlined />, color: "blue" },
  message: { icon: <MessageOutlined />, color: "green" },
  alert: { icon: <AlertOutlined />, color: "orange" },
  task: { icon: <CheckOutlined />, color: "purple" },
};

export default function NotificationDropdown() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");

  // Load notifications
  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await notificationApi.fetchNotifications();
      setNotifications(data);
    } catch (error) {
      console.error("Failed to load notifications:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Unread count
  const unreadCount = getUnreadCount(notifications);

  // Filtered notifications
  const filteredNotifications =
    activeTab === "unread"
      ? notifications.filter((n) => !n.read)
      : notifications;

  // Mark as read
  const handleMarkAsRead = async (id: string) => {
    await notificationApi.markNotificationAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    await notificationApi.markAllNotificationsAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  // Delete notification
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await notificationApi.deleteNotification(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // Click notification
  const handleClickNotification = (notification: NotificationItem) => {
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
      setOpen(false);
    }
  };

  // Dropdown content
  const dropdownContent = (
    <div className="w-[380px] max-h-[500px] bg-[var(--color-bg-paper)] border border-(--color-border) rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-(--color-border)">
        <span className="font-medium text-[var(--color-text-primary)]">
          {t("notifications.title", "通知")}
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
              {t("notifications.markAllRead", "全部已读")}
            </Button>
          )}
          <Button
            type="text"
            size="small"
            icon={<SettingOutlined />}
            onClick={() => {
              navigate("/system/settings");
              setOpen(false);
            }}
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as "all" | "unread")}
        size="small"
        className="px-4 pt-2"
        items={[
          {
            key: "all",
            label: t("notifications.all", "全部"),
          },
          {
            key: "unread",
            label: (
              <Badge count={unreadCount} size="small" offset={[8, 0]}>
                {t("notifications.unread", "未读")}
              </Badge>
            ),
          },
        ]}
      />

      {/* Notification list */}
      <div className="max-h-[340px] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spin />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={t("notifications.empty", "暂无通知")}
            className="py-12"
          />
        ) : (
          <div className="flex flex-col">
            {filteredNotifications.map((item) => {
              const typeConfig = notificationTypeConfig[item.type];
              return (
                <div
                  key={item.id}
                  className={`
                    px-4 py-3 cursor-pointer transition-colors
                    hover:bg-[var(--color-action-hover)]
                    ${!item.read ? "bg-[var(--color-primary)]/5" : ""}
                  `}
                  onClick={() => handleClickNotification(item)}
                >
                  <div className="flex gap-3 w-full">
                    {/* Icon/avatar */}
                    <div className="flex-shrink-0">
                      {item.avatar ? (
                        <Avatar src={item.avatar} size={40} />
                      ) : (
                        <Avatar
                          size={40}
                          className="flex items-center justify-center"
                          style={{
                            backgroundColor: `var(--color-${typeConfig.color})`,
                          }}
                        >
                          {typeConfig.icon}
                        </Avatar>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-sm font-medium truncate ${
                            !item.read
                              ? "text-[var(--color-text-primary)]"
                              : "text-[var(--color-text-secondary)]"
                          }`}
                        >
                          {item.title}
                        </span>
                        {item.priority === "urgent" && (
                          <Tag
                            color="red"
                            className="text-xs px-1 py-0 leading-4"
                          >
                            {t("notifications.urgent", "紧急")}
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

                    {/* Actions */}
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
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom */}
      {notifications.length > 0 && (
        <div className="flex items-center justify-center py-3 border-t border-(--color-border)">
          <Button
            type="link"
            size="small"
            onClick={() => {
              navigate("/notifications");
              setOpen(false);
            }}
          >
            {t("notifications.viewAll", "查看全部通知")}
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      popupRender={() => dropdownContent}
      trigger={["click"]}
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
