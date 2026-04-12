/**
 * 设置页面
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  SettingOutlined,
  GlobalOutlined,
  MoonOutlined,
  SunOutlined,
  DesktopOutlined,
  CodeOutlined,
  BellOutlined,
  DatabaseOutlined,
  DownloadOutlined,
  UploadOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import {
  Card,
  Radio,
  Switch,
  Button,
  Divider,
  Typography,
  Space,
  Tag,
  Alert,
  Avatar,
  Descriptions,
  Menu,
} from "antd";
import type { MenuProps } from "antd";
import { useAppStore, type SupportedLanguage } from "../../stores/useAppStore";
import { supportedLanguages } from "../../i18n";
import { getShortcutDefinitions } from "../../hooks/useKeyboardShortcuts";

const { Title, Text, Paragraph } = Typography;

type SettingsTab = "general" | "appearance" | "shortcuts" | "data" | "about";

export default function SettingsPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");

  const menuItems: MenuProps["items"] = [
    {
      key: "general",
      icon: <SettingOutlined />,
      label: t("settings.general"),
    },
    {
      key: "appearance",
      icon: <MoonOutlined />,
      label: t("settings.appearance"),
    },
    {
      key: "shortcuts",
      icon: <CodeOutlined />,
      label: t("settings.keyboardShortcuts"),
    },
    {
      key: "data",
      icon: <DatabaseOutlined />,
      label: t("settings.data"),
    },
    {
      key: "about",
      icon: <InfoCircleOutlined />,
      label: t("settings.about"),
    },
  ];

  return (
    <div className="h-full flex">
      {/* 左侧导航 */}
      <div className="w-64 border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
        <div className="p-4">
          <Title level={5} style={{ marginBottom: 16 }}>
            {t("settings.title")}
          </Title>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[activeTab]}
          onClick={(e) => setActiveTab(e.key as SettingsTab)}
          items={menuItems}
          style={{ borderRight: 0 }}
        />
      </div>

      {/* 右侧内容 */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === "general" && <GeneralSettings />}
        {activeTab === "appearance" && <AppearanceSettings />}
        {activeTab === "shortcuts" && <ShortcutsSettings />}
        {activeTab === "data" && <DataSettings />}
        {activeTab === "about" && <AboutSettings />}
      </div>
    </div>
  );
}

// 通用设置
function GeneralSettings() {
  const { t } = useTranslation();
  const { language, setLanguage } = useAppStore();
  const { i18n } = useTranslation();

  const handleLanguageChange = (lang: SupportedLanguage) => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
  };

  return (
    <div className="space-y-6">
      <Title level={4}>{t("settings.general")}</Title>

      {/* 语言设置 */}
      <Card
        title={
          <Space>
            <Avatar
              size="small"
              style={{ backgroundColor: "var(--color-primary)" }}
              icon={<GlobalOutlined />}
            />
            <span>{t("settings.language")}</span>
          </Space>
        }
        extra={<Text type="secondary">Choose your preferred language</Text>}
      >
        <Radio.Group
          value={language}
          onChange={(e) => handleLanguageChange(e.target.value)}
          style={{ width: "100%" }}
        >
          <Space direction="vertical" style={{ width: "100%" }} size="small">
            {supportedLanguages.map((lang) => (
              <Radio
                key={lang.code}
                value={lang.code}
                style={{ width: "100%" }}
              >
                <Space>
                  <Text>{lang.nativeName}</Text>
                  <Text type="secondary">({lang.name})</Text>
                </Space>
              </Radio>
            ))}
          </Space>
        </Radio.Group>
      </Card>

      {/* 通知设置 */}
      <Card
        title={
          <Space>
            <Avatar
              size="small"
              style={{ backgroundColor: "var(--color-primary)" }}
              icon={<BellOutlined />}
            />
            <span>{t("settings.notifications")}</span>
          </Space>
        }
        extra={<Text type="secondary">Configure notification preferences</Text>}
      >
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <NotificationToggle
            label="Desktop notifications"
            description="Show desktop notifications for important events"
            defaultChecked
          />
          <Divider style={{ margin: "8px 0" }} />
          <NotificationToggle
            label="Sound effects"
            description="Play sound when receiving messages"
            defaultChecked={false}
          />
          <Divider style={{ margin: "8px 0" }} />
          <NotificationToggle
            label="Email notifications"
            description="Receive email notifications for critical alerts"
            defaultChecked={false}
          />
        </Space>
      </Card>
    </div>
  );
}

// 外观设置
function AppearanceSettings() {
  const { t } = useTranslation();
  const { theme, setTheme } = useAppStore();

  const themeOptions = [
    {
      id: "light",
      label: t("settings.themeOptions.light"),
      icon: SunOutlined,
      description: "Light background",
    },
    {
      id: "dark",
      label: t("settings.themeOptions.dark"),
      icon: MoonOutlined,
      description: "Dark background",
    },
    {
      id: "system",
      label: t("settings.themeOptions.system"),
      icon: DesktopOutlined,
      description: "Follow system settings",
    },
  ];

  return (
    <div className="space-y-6">
      <Title level={4}>{t("settings.appearance")}</Title>

      <Card
        title={
          <Space>
            <Avatar
              size="small"
              style={{ backgroundColor: "var(--color-primary)" }}
              icon={<MoonOutlined />}
            />
            <span>{t("settings.theme")}</span>
          </Space>
        }
        extra={<Text type="secondary">Choose your preferred theme</Text>}
      >
        <Radio.Group
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          style={{ width: "100%" }}
        >
          <Space size="middle" wrap>
            {themeOptions.map((option) => {
              const Icon = option.icon;
              return (
                <Radio.Button
                  key={option.id}
                  value={option.id}
                  style={{ height: "auto", padding: "16px 24px" }}
                >
                  <Space direction="vertical" align="center" size={4}>
                    <Icon style={{ fontSize: 24 }} />
                    <Text strong>{option.label}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {option.description}
                    </Text>
                  </Space>
                </Radio.Button>
              );
            })}
          </Space>
        </Radio.Group>
      </Card>
    </div>
  );
}

// 快捷键设置
function ShortcutsSettings() {
  const { t } = useTranslation();
  const shortcuts = getShortcutDefinitions();

  return (
    <div className="space-y-6">
      <Title level={4}>{t("settings.keyboardShortcuts")}</Title>

      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        {shortcuts.map((category) => (
          <Card
            key={category.category}
            title={
              <Space>
                <Tag color="blue">{category.category}</Tag>
              </Space>
            }
            size="small"
          >
            <Descriptions column={1} size="small">
              {category.shortcuts.map((shortcut, index) => (
                <Descriptions.Item key={index} label={shortcut.description}>
                  <Space size={2}>
                    {shortcut.keys.map((key, keyIndex) => (
                      <Tag
                        key={keyIndex}
                        style={{
                          fontFamily: "monospace",
                          margin: 0,
                          background: "var(--color-bg-tertiary)",
                          border: "1px solid var(--color-border)",
                        }}
                      >
                        {key}
                      </Tag>
                    ))}
                  </Space>
                </Descriptions.Item>
              ))}
            </Descriptions>
          </Card>
        ))}
      </Space>
    </div>
  );
}

// 数据设置
function DataSettings() {
  const { t } = useTranslation();

  const handleExport = () => {
    // 导出所有数据
    const data = {
      conversations: JSON.parse(
        localStorage.getItem("AMOS-claw-conversations") || "[]",
      ),
      agents: JSON.parse(localStorage.getItem("AMOS-claw-agents") || "[]"),
      prompts: JSON.parse(localStorage.getItem("AMOS-claw-prompts") || "[]"),
      settings: JSON.parse(localStorage.getItem("AMOS-claw-app-store") || "{}"),
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AMOS-claw-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          if (data.conversations) {
            localStorage.setItem(
              "AMOS-claw-conversations",
              JSON.stringify(data.conversations),
            );
          }
          if (data.agents) {
            localStorage.setItem(
              "AMOS-claw-agents",
              JSON.stringify(data.agents),
            );
          }
          if (data.prompts) {
            localStorage.setItem(
              "AMOS-claw-prompts",
              JSON.stringify(data.prompts),
            );
          }
          if (data.settings) {
            localStorage.setItem(
              "AMOS-claw-app-store",
              JSON.stringify(data.settings),
            );
          }
          alert("Data imported successfully! Please refresh the page.");
        } catch {
          alert("Failed to import data. Please check the file format.");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="space-y-6">
      <Title level={4}>{t("settings.data")}</Title>

      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        {/* 备份数据 */}
        <Card
          title={
            <Space>
              <Avatar
                size="small"
                style={{ backgroundColor: "var(--color-primary)" }}
                icon={<DownloadOutlined />}
              />
              <span>{t("settings.backup")}</span>
            </Space>
          }
          extra={
            <Text type="secondary">Export all your data to a JSON file</Text>
          }
        >
          <Space direction="vertical" style={{ width: "100%" }}>
            <Paragraph type="secondary">
              Export all your conversations, agents, prompts, and settings to a
              JSON file for backup.
            </Paragraph>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleExport}
            >
              Export Data
            </Button>
          </Space>
        </Card>

        {/* 恢复数据 */}
        <Card
          title={
            <Space>
              <Avatar
                size="small"
                style={{ backgroundColor: "#fa8c16" }}
                icon={<UploadOutlined />}
              />
              <span>{t("settings.restore")}</span>
            </Space>
          }
          extra={<Text type="secondary">Import data from a backup file</Text>}
        >
          <Space direction="vertical" style={{ width: "100%" }}>
            <Paragraph type="secondary">
              Import your data from a previously exported backup file.
            </Paragraph>
            <Alert
              message="Warning"
              description="Importing data will overwrite existing data. Please make sure to backup your current data first."
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Button icon={<UploadOutlined />} onClick={handleImport}>
              Import Data
            </Button>
          </Space>
        </Card>
      </Space>
    </div>
  );
}

// 关于页面
function AboutSettings() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <Title level={4}>{t("settings.about")}</Title>

      <Card>
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <Avatar
            size={80}
            style={{
              backgroundColor: "var(--color-primary)",
              marginBottom: 16,
            }}
          >
            <span style={{ fontSize: 40 }}>🤖</span>
          </Avatar>
          <Title level={3} style={{ marginBottom: 8 }}>
            AMOS
          </Title>
          <Text type="secondary">AI Dialogue Platform</Text>

          <Divider />

          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <Tag color="blue" style={{ padding: "4px 12px", fontSize: 14 }}>
              {t("settings.version")}: 0.1.0
            </Tag>

            <Paragraph
              type="secondary"
              style={{ maxWidth: 400, margin: "0 auto" }}
            >
              A powerful AI dialogue platform desktop client built with Tauri,
              React, and TypeScript. Manage agents, prompts, skills, and more
              with an intuitive interface.
            </Paragraph>

            <Descriptions
              column={1}
              size="small"
              bordered
              style={{ maxWidth: 400, margin: "0 auto", textAlign: "left" }}
            >
              <Descriptions.Item label="Framework">
                Tauri + React
              </Descriptions.Item>
              <Descriptions.Item label="Language">TypeScript</Descriptions.Item>
              <Descriptions.Item label="UI Library">
                Ant Design
              </Descriptions.Item>
              <Descriptions.Item label="State">Zustand</Descriptions.Item>
            </Descriptions>

            <Divider style={{ margin: "16px 0" }} />

            <Text type="secondary" style={{ fontSize: 12 }}>
              Built with ❤️ using Tauri + React + TypeScript
            </Text>
          </Space>
        </div>
      </Card>
    </div>
  );
}

// 通知开关组件
function NotificationToggle({
  label,
  description,
  defaultChecked,
}: {
  label: string;
  description: string;
  defaultChecked: boolean;
}) {
  const [enabled, setEnabled] = useState(defaultChecked);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div>
        <Text strong>{label}</Text>
        <br />
        <Text type="secondary" style={{ fontSize: 12 }}>
          {description}
        </Text>
      </div>
      <Switch checked={enabled} onChange={setEnabled} />
    </div>
  );
}
