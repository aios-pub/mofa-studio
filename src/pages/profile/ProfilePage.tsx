/**
 * Personal center page
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  UserOutlined,
  LockOutlined,
  BellOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Avatar,
  Button,
  Card,
  Form,
  Input,
  Switch,
  Tabs,
  Tag,
  message,
} from "antd";
import { useUserInfo, useUserActions } from "../../stores/useUserStore";
import { organizationApi, authApi } from "@/services";
import type { UserInfo } from "@/types/user";

type TabKey = "profile" | "security" | "notifications";

export default function ProfilePage() {
  const { t } = useTranslation();
  const userInfo = useUserInfo();
  const { setUserInfo } = useUserActions();
  const [activeTab, setActiveTab] = useState<TabKey>("profile");

  // Personal info form
  const [profileForm, setProfileForm] = useState({
    username: userInfo.username || "",
    email: userInfo.email || "",
    avatar: userInfo.avatar || "",
  });

  // Security settings form
  const [securityForm, setSecurityForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Notification settings
  const [notifications, setNotifications] = useState({
    email: true,
    browser: false,
    marketing: false,
  });

  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await organizationApi.updateUser(userInfo.id, {
        username: profileForm.username,
        email: profileForm.email,
        avatar: profileForm.avatar,
      });
      setUserInfo({
        ...userInfo,
        ...profileForm,
      } as UserInfo);
      message.success(t("common.saveSuccess", "保存成功"));
    } catch (err: any) {
      message.error(err?.message || t("common.saveFailed", "保存失败"));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (securityForm.newPassword !== securityForm.confirmPassword) {
      message.error(t("auth.passwordMismatch", "两次输入的密码不一致"));
      return;
    }
    setSaving(true);
    try {
      await authApi.changePassword(
        securityForm.currentPassword,
        securityForm.newPassword,
      );
      setSecurityForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      message.success(t("common.saveSuccess", "密码修改成功"));
    } catch (err: any) {
      message.error(err?.message || t("common.saveFailed", "密码修改失败"));
    } finally {
      setSaving(false);
    }
  };

  // Notification setting row with a switch
  const renderNotificationRow = (
    key: keyof typeof notifications,
    title: string,
    description: string,
    bordered = true,
  ) => (
    <div
      className={`flex items-center justify-between py-3 ${
        bordered ? "border-b border-(--color-border)" : ""
      }`}
    >
      <div>
        <div className="text-sm font-medium text-[var(--color-text-primary)]">
          {title}
        </div>
        <div className="text-xs text-[var(--color-text-tertiary)]">
          {description}
        </div>
      </div>
      <Switch
        checked={notifications[key]}
        onChange={(checked) =>
          setNotifications({ ...notifications, [key]: checked })
        }
      />
    </div>
  );

  const tabItems = [
    {
      key: "profile",
      label: (
        <span className="flex items-center gap-2">
          <UserOutlined />
          {t("profile.basicInfo", "基本信息")}
        </span>
      ),
      children: (
        <div className="space-y-6 py-2">
          <h2 className="text-lg font-medium text-[var(--color-text-primary)]">
            {t("profile.basicInfo", "基本信息")}
          </h2>

          {/* Avatar */}
          <div className="flex items-center gap-4">
            <Avatar
              size={80}
              src={
                profileForm.avatar ||
                "https://api.dicebear.com/7.x/avataaars/svg?seed=default"
              }
              alt={profileForm.username}
            >
              {profileForm.username?.[0]?.toUpperCase()}
            </Avatar>
            <div>
              <Button type="primary">
                {t("profile.changeAvatar", "更换头像")}
              </Button>
              <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
                {t(
                  "profile.avatarHint",
                  "支持 JPG、PNG 格式，大小不超过 2MB",
                )}
              </p>
            </div>
          </div>

          <Form layout="vertical" className="max-w-md">
            <Form.Item label={t("auth.username", "用户名")}>
              <Input
                value={profileForm.username}
                onChange={(e) =>
                  setProfileForm({
                    ...profileForm,
                    username: e.target.value,
                  })
                }
              />
            </Form.Item>

            <Form.Item label={t("auth.email", "邮箱")}>
              <Input
                type="email"
                value={profileForm.email}
                onChange={(e) =>
                  setProfileForm({
                    ...profileForm,
                    email: e.target.value,
                  })
                }
              />
            </Form.Item>
          </Form>

          {/* Role information */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              {t("profile.roles", "角色")}
            </label>
            <div className="flex flex-wrap gap-2">
              {userInfo.roles?.map((role) => (
                <Tag key={role.code} color="blue">
                  {role.name}
                </Tag>
              ))}
            </div>
          </div>

          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSaveProfile}
            loading={saving}
          >
            {saving
              ? t("common.saving", "保存中...")
              : t("common.save", "保存")}
          </Button>
        </div>
      ),
    },
    {
      key: "security",
      label: (
        <span className="flex items-center gap-2">
          <LockOutlined />
          {t("profile.security", "安全设置")}
        </span>
      ),
      children: (
        <div className="space-y-6 py-2">
          <h2 className="text-lg font-medium text-[var(--color-text-primary)]">
            {t("profile.security", "安全设置")}
          </h2>

          <Alert
            type="info"
            showIcon
            message={t(
              "profile.passwordHint",
              "定期修改密码可以提高账户安全性",
            )}
          />

          <Form layout="vertical" className="max-w-md">
            <Form.Item label={t("profile.currentPassword", "当前密码")}>
              <Input.Password
                value={securityForm.currentPassword}
                onChange={(e) =>
                  setSecurityForm({
                    ...securityForm,
                    currentPassword: e.target.value,
                  })
                }
              />
            </Form.Item>

            <Form.Item label={t("profile.newPassword", "新密码")}>
              <Input.Password
                value={securityForm.newPassword}
                onChange={(e) =>
                  setSecurityForm({
                    ...securityForm,
                    newPassword: e.target.value,
                  })
                }
              />
            </Form.Item>

            <Form.Item label={t("profile.confirmNewPassword", "确认新密码")}>
              <Input.Password
                value={securityForm.confirmPassword}
                onChange={(e) =>
                  setSecurityForm({
                    ...securityForm,
                    confirmPassword: e.target.value,
                  })
                }
              />
            </Form.Item>
          </Form>

          <Button
            type="primary"
            icon={<LockOutlined />}
            onClick={handleChangePassword}
            loading={saving}
          >
            {saving
              ? t("common.saving", "修改中...")
              : t("profile.changePassword", "修改密码")}
          </Button>
        </div>
      ),
    },
    {
      key: "notifications",
      label: (
        <span className="flex items-center gap-2">
          <BellOutlined />
          {t("profile.notifications", "通知设置")}
        </span>
      ),
      children: (
        <div className="space-y-6 py-2">
          <h2 className="text-lg font-medium text-[var(--color-text-primary)]">
            {t("profile.notifications", "通知设置")}
          </h2>

          {renderNotificationRow(
            "email",
            t("profile.emailNotifications", "邮件通知"),
            t("profile.emailNotificationsDesc", "接收重要更新和提醒邮件"),
          )}
          {renderNotificationRow(
            "browser",
            t("profile.browserNotifications", "浏览器通知"),
            t("profile.browserNotificationsDesc", "在浏览器中接收实时通知"),
          )}
          {renderNotificationRow(
            "marketing",
            t("profile.marketingNotifications", "营销通知"),
            t("profile.marketingNotificationsDesc", "接收产品更新和促销信息"),
            false,
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="h-full overflow-auto p-6 bg-[var(--color-bg-base)]">
      <div className="max-w-4xl mx-auto">
        {/* Page title */}
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-6">
          {t("profile.title", "个人中心")}
        </h1>

        <Card>
          <Tabs
            tabPosition="left"
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as TabKey)}
            items={tabItems}
          />
        </Card>
      </div>
    </div>
  );
}
