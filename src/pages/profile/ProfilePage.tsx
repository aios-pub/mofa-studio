/**
 * Personal center page
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  UserOutlined,
  LockOutlined,
  BellOutlined,
  SafetyOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import { message } from "antd";
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

  const tabs = [
    {
      key: "profile" as TabKey,
      icon: UserOutlined,
      label: t("profile.basicInfo", "基本信息"),
    },
    {
      key: "security" as TabKey,
      icon: LockOutlined,
      label: t("profile.security", "安全设置"),
    },
    {
      key: "notifications" as TabKey,
      icon: BellOutlined,
      label: t("profile.notifications", "通知设置"),
    },
  ];

  return (
    <div className="h-full overflow-auto p-6 bg-[var(--color-bg-base)]">
      <div className="max-w-4xl mx-auto">
        {/* Page title */}
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-6">
          {t("profile.title", "个人中心")}
        </h1>

        <div className="flex gap-6">
          {/* Left tabs */}
          <div className="w-48 flex-shrink-0">
            <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-(--color-border) p-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                      activeTab === tab.key
                        ? "bg-[var(--color-primary)] text-white"
                        : "text-[var(--color-text-secondary)] hover:bg-(--color-bg-tertiary)"
                    }`}
                  >
                    <Icon />
                    <span className="text-sm">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right content area */}
          <div className="flex-1">
            <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-(--color-border) p-6">
              {/* Basic information */}
              {activeTab === "profile" && (
                <div className="space-y-6">
                  <h2 className="text-lg font-medium text-[var(--color-text-primary)]">
                    {t("profile.basicInfo", "基本信息")}
                  </h2>

                  {/* Avatar */}
                  <div className="flex items-center gap-4">
                    <img
                      src={
                        profileForm.avatar ||
                        "https://api.dicebear.com/7.x/avataaars/svg?seed=default"
                      }
                      alt={profileForm.username}
                      className="w-20 h-20 rounded-full"
                    />
                    <div>
                      <button className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm hover:opacity-90 transition-opacity">
                        {t("profile.changeAvatar", "更换头像")}
                      </button>
                      <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
                        {t(
                          "profile.avatarHint",
                          "支持 JPG、PNG 格式，大小不超过 2MB",
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Username */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                      {t("auth.username", "用户名")}
                    </label>
                    <input
                      type="text"
                      value={profileForm.username}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          username: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 rounded-lg border border-(--color-border) bg-[var(--color-bg-base)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                      {t("auth.email", "邮箱")}
                    </label>
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          email: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 rounded-lg border border-(--color-border) bg-[var(--color-bg-base)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                  </div>

                  {/* Role information */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                      {t("profile.roles", "角色")}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {userInfo.roles?.map((role) => (
                        <span
                          key={role.code}
                          className="px-3 py-1 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-sm"
                        >
                          {role.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Save button */}
                  <div className="pt-4">
                    <button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      <SaveOutlined />
                      {saving
                        ? t("common.saving", "保存中...")
                        : t("common.save", "保存")}
                    </button>
                  </div>
                </div>
              )}

              {/* Security settings */}
              {activeTab === "security" && (
                <div className="space-y-6">
                  <h2 className="text-lg font-medium text-[var(--color-text-primary)]">
                    {t("profile.security", "安全设置")}
                  </h2>

                  <div className="p-4 rounded-lg bg-(--color-bg-tertiary) flex items-center gap-3">
                    <SafetyOutlined className="text-green-500" />
                    <span className="text-sm text-[var(--color-text-secondary)]">
                      {t(
                        "profile.passwordHint",
                        "定期修改密码可以提高账户安全性",
                      )}
                    </span>
                  </div>

                  {/* Current password */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                      {t("profile.currentPassword", "当前密码")}
                    </label>
                    <input
                      type="password"
                      value={securityForm.currentPassword}
                      onChange={(e) =>
                        setSecurityForm({
                          ...securityForm,
                          currentPassword: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 rounded-lg border border-(--color-border) bg-[var(--color-bg-base)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                  </div>

                  {/* New password */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                      {t("profile.newPassword", "新密码")}
                    </label>
                    <input
                      type="password"
                      value={securityForm.newPassword}
                      onChange={(e) =>
                        setSecurityForm({
                          ...securityForm,
                          newPassword: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 rounded-lg border border-(--color-border) bg-[var(--color-bg-base)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                  </div>

                  {/* Confirm new password */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                      {t("profile.confirmNewPassword", "确认新密码")}
                    </label>
                    <input
                      type="password"
                      value={securityForm.confirmPassword}
                      onChange={(e) =>
                        setSecurityForm({
                          ...securityForm,
                          confirmPassword: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 rounded-lg border border-(--color-border) bg-[var(--color-bg-base)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                  </div>

                  {/* Change password button */}
                  <div className="pt-4">
                    <button
                      onClick={handleChangePassword}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      <LockOutlined />
                      {saving
                        ? t("common.saving", "修改中...")
                        : t("profile.changePassword", "修改密码")}
                    </button>
                  </div>
                </div>
              )}

              {/* Notification settings */}
              {activeTab === "notifications" && (
                <div className="space-y-6">
                  <h2 className="text-lg font-medium text-[var(--color-text-primary)]">
                    {t("profile.notifications", "通知设置")}
                  </h2>

                  {/* Email notifications */}
                  <div className="flex items-center justify-between py-3 border-b border-(--color-border)">
                    <div>
                      <div className="text-sm font-medium text-[var(--color-text-primary)]">
                        {t("profile.emailNotifications", "邮件通知")}
                      </div>
                      <div className="text-xs text-[var(--color-text-tertiary)]">
                        {t(
                          "profile.emailNotificationsDesc",
                          "接收重要更新和提醒邮件",
                        )}
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifications.email}
                        onChange={(e) =>
                          setNotifications({
                            ...notifications,
                            email: e.target.checked,
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-(--color-bg-tertiary) peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--color-primary)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
                    </label>
                  </div>

                  {/* Browser notifications */}
                  <div className="flex items-center justify-between py-3 border-b border-(--color-border)">
                    <div>
                      <div className="text-sm font-medium text-[var(--color-text-primary)]">
                        {t("profile.browserNotifications", "浏览器通知")}
                      </div>
                      <div className="text-xs text-[var(--color-text-tertiary)]">
                        {t(
                          "profile.browserNotificationsDesc",
                          "在浏览器中接收实时通知",
                        )}
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifications.browser}
                        onChange={(e) =>
                          setNotifications({
                            ...notifications,
                            browser: e.target.checked,
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-(--color-bg-tertiary) peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--color-primary)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
                    </label>
                  </div>

                  {/* Marketing notifications */}
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <div className="text-sm font-medium text-[var(--color-text-primary)]">
                        {t("profile.marketingNotifications", "营销通知")}
                      </div>
                      <div className="text-xs text-[var(--color-text-tertiary)]">
                        {t(
                          "profile.marketingNotificationsDesc",
                          "接收产品更新和促销信息",
                        )}
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifications.marketing}
                        onChange={(e) =>
                          setNotifications({
                            ...notifications,
                            marketing: e.target.checked,
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-(--color-bg-tertiary) peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--color-primary)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
