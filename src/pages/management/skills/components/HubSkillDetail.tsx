/**
 * Hub Skill 详情组件
 */

import { useState } from "react";
import {
  Button,
  Tag,
  Rate,
  Typography,
  Card,
  Statistic,
  Tabs,
  message,
} from "antd";
import {
  DownloadOutlined,
  LoadingOutlined,
  UserOutlined,
  ClockCircleOutlined,
  TagOutlined,
  SettingOutlined,
  FileTextOutlined,
  CheckOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import type { HubSkill } from "../../../../types/skill";

const { Text, Title, Paragraph } = Typography;

interface HubSkillDetailProps {
  skill: HubSkill;
  isInstalled?: boolean;
  isInstalling?: boolean;
  onInstall?: () => Promise<boolean>;
  onBack?: () => void;
}

export function HubSkillDetail({
  skill,
  isInstalled,
  isInstalling,
  onInstall,
  onBack: _onBack,
}: HubSkillDetailProps) {
  const [activeTab, setActiveTab] = useState<"params" | "readme">("params");
  const [localInstalling, setLocalInstalling] = useState(false);

  const handleInstall = async () => {
    setLocalInstalling(true);
    try {
      const success = await onInstall?.();
      if (success) {
        message.success("安装成功");
      } else {
        message.error("安装失败");
      }
    } finally {
      setLocalInstalling(false);
    }
  };

  const getTypeTag = (type: HubSkill["type"]) => {
    const config: Record<HubSkill["type"], { color: string; label: string }> = {
      builtin: { color: "blue", label: "内置" },
      custom: { color: "purple", label: "自定义" },
      api: { color: "orange", label: "API" },
    };
    return <Tag color={config[type].color}>{config[type].label}</Tag>;
  };

  const formatDownloads = (num: number) => {
    if (num >= 10000) {
      return `${(num / 10000).toFixed(1)}万`;
    }
    return num.toString();
  };

  const tabs = [
    { key: "params", label: "参数配置", icon: SettingOutlined },
    { key: "readme", label: "README", icon: FileTextOutlined },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* 头部 */}
      <div className="p-6 border-b border-[var(--color-border)]">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Title level={4} style={{ margin: 0 }}>
                {skill.name}
              </Title>
              {getTypeTag(skill.type)}
              <Tag color="cyan">v{skill.version}</Tag>
            </div>
            <Paragraph type="secondary" style={{ margin: 0 }}>
              {skill.description}
            </Paragraph>
          </div>
          <Button
            type={isInstalled ? "default" : "primary"}
            icon={
              isInstalling || localInstalling ? (
                <LoadingOutlined />
              ) : (
                <DownloadOutlined />
              )
            }
            disabled={isInstalled || isInstalling || localInstalling}
            onClick={handleInstall}
          >
            {isInstalling || localInstalling
              ? "安装中..."
              : isInstalled
                ? "已安装"
                : "安装"}
          </Button>
        </div>

        {/* 元信息 */}
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-1 text-[var(--color-text-secondary)]">
            <UserOutlined />
            <span>{skill.author}</span>
          </div>
          <div className="flex items-center gap-1 text-[var(--color-text-secondary)]">
            <DownloadOutlined />
            <span>{formatDownloads(skill.downloads)} 下载</span>
          </div>
          <div className="flex items-center gap-1">
            <Rate
              disabled
              value={skill.rating}
              allowHalf
              style={{ fontSize: 12 }}
            />
            <span className="text-[var(--color-text-secondary)]">
              {skill.rating.toFixed(1)}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[var(--color-text-tertiary)]">
            <ClockCircleOutlined />
            <span>
              更新于 {new Date(skill.updatedAt).toLocaleDateString("zh-CN")}
            </span>
          </div>
        </div>

        {/* 标签 */}
        <div className="flex items-center gap-2 mt-3">
          <TagOutlined className="text-[var(--color-text-tertiary)]" />
          <div className="flex flex-wrap gap-1">
            {skill.tags.map((tag) => (
              <Tag key={tag} style={{ fontSize: 11 }}>
                {tag}
              </Tag>
            ))}
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4 p-6 pb-4">
        <Card
          size="small"
          variant="borderless"
          style={{ background: "var(--color-bg-secondary)" }}
        >
          <Statistic
            title={
              <Text type="secondary" style={{ fontSize: 12 }}>
                分类
              </Text>
            }
            value={skill.category}
            valueStyle={{ fontSize: 14 }}
          />
        </Card>
        <Card
          size="small"
          variant="borderless"
          style={{ background: "var(--color-bg-secondary)" }}
        >
          <Statistic
            title={
              <Text type="secondary" style={{ fontSize: 12 }}>
                超时时间
              </Text>
            }
            value={skill.timeout / 1000}
            suffix="s"
            valueStyle={{ fontSize: 14 }}
          />
        </Card>
        <Card
          size="small"
          bordered={false}
          style={{ background: "var(--color-bg-secondary)" }}
        >
          <Statistic
            title={
              <Text type="secondary" style={{ fontSize: 12 }}>
                参数数量
              </Text>
            }
            value={
              Array.isArray(skill.parameters) ? skill.parameters.length : 0
            }
            valueStyle={{ fontSize: 14 }}
          />
        </Card>
        <Card
          size="small"
          variant="borderless"
          style={{ background: "var(--color-bg-secondary)" }}
        >
          <Statistic
            title={
              <Text type="secondary" style={{ fontSize: 12 }}>
                发布时间
              </Text>
            }
            value={new Date(skill.publishedAt).toLocaleDateString("zh-CN")}
            valueStyle={{ fontSize: 14 }}
          />
        </Card>
      </div>

      {/* 标签栏 */}
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as typeof activeTab)}
        items={tabs.map((tab) => ({
          key: tab.key,
          label: (
            <span className="flex items-center gap-2">
              <tab.icon />
              {tab.label}
            </span>
          ),
        }))}
        className="px-6"
      />

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === "params" && (
          <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] overflow-hidden">
            <div className="p-3 border-b border-[var(--color-border)] bg-[var(--color-bg-tertiary)]">
              <span className="text-sm font-medium text-[var(--color-text-primary)]">
                参数定义
              </span>
            </div>
            {(Array.isArray(skill.parameters) ? skill.parameters : [])
              .length === 0 ? (
              <div className="p-4 text-center text-[var(--color-text-tertiary)]">
                暂无参数
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="text-left py-2 px-4 text-[var(--color-text-tertiary)]">
                      参数名
                    </th>
                    <th className="text-left py-2 px-4 text-[var(--color-text-tertiary)]">
                      类型
                    </th>
                    <th className="text-left py-2 px-4 text-[var(--color-text-tertiary)]">
                      描述
                    </th>
                    <th className="text-left py-2 px-4 text-[var(--color-text-tertiary)]">
                      默认值
                    </th>
                    <th className="text-left py-2 px-4 text-[var(--color-text-tertiary)]">
                      必填
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(skill.parameters)
                    ? skill.parameters
                    : []
                  ).map((param) => (
                    <tr
                      key={param.name}
                      className="border-b border-[var(--color-border)]/50"
                    >
                      <td className="py-2 px-4">
                        <code className="text-[var(--color-primary)]">
                          {param.name}
                        </code>
                      </td>
                      <td className="py-2 px-4 text-[var(--color-text-secondary)]">
                        {param.type}
                      </td>
                      <td className="py-2 px-4 text-[var(--color-text-secondary)]">
                        {param.description}
                      </td>
                      <td className="py-2 px-4 text-[var(--color-text-secondary)]">
                        {param.defaultValue !== undefined
                          ? JSON.stringify(param.defaultValue)
                          : "-"}
                      </td>
                      <td className="py-2 px-4">
                        {param.required ? (
                          <CheckOutlined className="text-green-500" />
                        ) : (
                          <CloseOutlined className="text-[var(--color-text-tertiary)]" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === "readme" && (
          <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] overflow-hidden">
            <div className="p-3 border-b border-[var(--color-border)] bg-[var(--color-bg-tertiary)]">
              <span className="text-sm font-medium text-[var(--color-text-primary)]">
                README
              </span>
            </div>
            <div className="p-4">
              {skill.readme ? (
                <pre className="whitespace-pre-wrap text-sm text-[var(--color-text-primary)] font-mono">
                  {skill.readme}
                </pre>
              ) : (
                <div className="text-center text-[var(--color-text-tertiary)]">
                  暂无 README
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
