import { useTranslation } from "react-i18next";
/**
 * Octos profile skills management
 * Integrates system skills management with recommended installation
 */

import { useState, useEffect, useCallback } from "react";
import {
  Button,
  Modal,
  Tabs,
  Tag,
  Typography,
  message,
  Empty,
  Spin,
  Space,
  Card,
  Alert,
  Popconfirm,
  Switch,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  AppstoreOutlined,
  ThunderboltOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import type { OctosSkillEntry } from "@/types/octos";
import { OctosApiClient } from "@/services/real/octos";
import { skillApi } from "@/services";
import type { Skill } from "@/services";

const { Text, Title } = Typography;

interface Props {
  profileId: string;
  apiClient: OctosApiClient | any;
}

// Mapping from system skills to Octos skill repositories
const SKILL_TO_OCTOS_REPO: Record<
  string,
  { repo: string; branch?: string; name: string }
> = {
  web_search: {
    repo: "github.com/octos/skills",
    branch: "main",
    name: "web-search",
  },
  web_fetch: {
    repo: "github.com/octos/skills",
    branch: "main",
    name: "web-fetch",
  },
  memory_search: {
    repo: "github.com/octos/skills",
    branch: "main",
    name: "memory",
  },
  file_reader: {
    repo: "github.com/octos/skills",
    branch: "main",
    name: "file-ops",
  },
  file_writer: {
    repo: "github.com/octos/skills",
    branch: "main",
    name: "file-ops",
  },
  code_exec: {
    repo: "github.com/octos/skills",
    branch: "main",
    name: "code-exec",
  },
  data_query: {
    repo: "github.com/octos/skills",
    branch: "main",
    name: "database",
  },
  api_call: {
    repo: "github.com/octos/skills",
    branch: "main",
    name: "http-client",
  },
};

export default function OctosSkillsTab({ profileId, apiClient }: Props) {  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<"installed" | "recommend">(
    "installed",
  );
  const [loading, setLoading] = useState(true);
  const [installedSkills, setInstalledSkills] = useState<OctosSkillEntry[]>([]);
  const [systemSkills, setSystemSkills] = useState<Skill[]>([]);
  const [installing, setInstalling] = useState<string | null>(null);

  const fetchInstalledSkills = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.listProfileSkills(profileId);
      setInstalledSkills(data.skills || []);
    } catch (e: any) {
      message.error(e?.message || "加载 Skills 失败");
    } finally {
      setLoading(false);
    }
  }, [apiClient, profileId]);

  const fetchSystemSkills = useCallback(async () => {
    try {
      const data = await skillApi.getAll();
      setSystemSkills(data.filter((s) => s.enabled)); // only show enabled skills
    } catch (e: any) {
      console.error("Failed to load system skills:", e);
    }
  }, []);

  useEffect(() => {
    fetchInstalledSkills();
    fetchSystemSkills();
  }, [fetchInstalledSkills, fetchSystemSkills]);

  const handleInstall = async (skillKey: string) => {
    const repoInfo = SKILL_TO_OCTOS_REPO[skillKey];
    if (!repoInfo) {
      message.error(t("未找到对应的 Octos Skill 仓库"));
      return;
    }

    setInstalling(skillKey);
    try {
      const result = await apiClient.installProfileSkill(profileId, {
        repo: repoInfo.repo,
        branch: repoInfo.branch || "main",
        force: false,
      });
      if (result.ok) {
        message.success(`安装成功: ${result.installed.join(", ")}`);
        if (result.skipped.length > 0) {
          message.info(`跳过: ${result.skipped.join(", ")}`);
        }
        fetchInstalledSkills();
      } else {
        message.error(t("安装失败"));
      }
    } catch (e: any) {
      message.error(e?.message || "安装失败");
    } finally {
      setInstalling(null);
    }
  };

  const handleRemove = async (skillName: string) => {
    try {
      await apiClient.removeProfileSkill(profileId, skillName);
      message.success(t("已卸载"));
      fetchInstalledSkills();
    } catch (e: any) {
      message.error(e?.message || "卸载失败");
    }
  };

  // Get recommended skills (enabled in system but not installed in Octos)
  const recommendedSkills = systemSkills.filter((skill) => {
    const repoInfo = SKILL_TO_OCTOS_REPO[skill.id];
    if (!repoInfo) return false;
    // Check whether installed
    return !installedSkills.some((s) => s.name === repoInfo.name);
  });

  return (
    <div className="space-y-4">
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as typeof activeTab)}
        items={[
          {
            key: "installed",
            label: (
              <span>
                <AppstoreOutlined /> 已安装 ({installedSkills.length})
              </span>
            ),
          },
          {
            key: "recommend",
            label: (
              <span>
                <ThunderboltOutlined /> 推荐安装 ({recommendedSkills.length})
              </span>
            ),
          },
        ]}
      />

      {activeTab === "installed" && (
        <InstalledSkillsView
          skills={installedSkills}
          loading={loading}
          onRemove={handleRemove}
        />
      )}

      {activeTab === "recommend" && (
        <RecommendSkillsView
          systemSkills={systemSkills}
          recommendedSkills={recommendedSkills}
          installedSkills={installedSkills}
          installing={installing}
          onInstall={handleInstall}
        />
      )}
    </div>
  );
}

// Installed skills view
function InstalledSkillsView({
  skills,
  loading,
  onRemove,
}: {
  skills: OctosSkillEntry[];
  loading: boolean;
  onRemove: (name: string) => void;
}) {  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Space>
          <Spin />
          <span className="text-[var(--color-text-secondary)]">{t("加载中...")}</span>
        </Space>
      </div>
    );
  }

  if (skills.length === 0) {
    return (
      <Empty
        description={t("暂无已安装 Skills")}
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      >
        <Alert
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
          title={t("提示")}
          description={t("前往「推荐安装」标签页，从系统 Skills 中选择要安装的 Skills")}
          className="mt-4 text-left"
        />
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {skills.map((skill) => (
        <div
          key={skill.name}
          className="flex items-center justify-between p-3 border border-(--color-border) rounded hover:bg-[var(--color-action-hover)] transition-colors"
        >
          <div className="flex-1">
            <Space>
              <Text strong>{skill.name}</Text>
              {skill.version && <Tag color="blue">{skill.version}</Tag>}
            </Space>
            <Space orientation="vertical" size={0}>
              {skill.source_repo && (
                <Text type="secondary" className="text-xs">
                  来源: {skill.source_repo}
                </Text>
              )}
              <Text type="secondary" className="text-xs">
                工具数量: {skill.tool_count}
              </Text>
            </Space>
          </div>
          <Popconfirm
            title={t("确认卸载此 Skill？")}
            onConfirm={() => onRemove(skill.name)}
          >
            <Button type="text" danger size="small" icon={<DeleteOutlined />}>
              卸载
            </Button>
          </Popconfirm>
        </div>
      ))}
    </div>
  );
}

// Recommended skills view
function RecommendSkillsView({
  systemSkills,
  recommendedSkills,
  installedSkills,
  installing,
  onInstall,
}: {
  systemSkills: Skill[];
  recommendedSkills: Skill[];
  installedSkills: OctosSkillEntry[];
  installing: string | null;
  onInstall: (skillKey: string) => void;
}) {  const { t } = useTranslation();

  // List of installed skill names
  const installedNames = new Set(
    installedSkills
      .map((s) => {
        const entry = Object.entries(SKILL_TO_OCTOS_REPO).find(
          ([, v]) => v.name === s.name,
        );
        return entry?.[0];
      })
      .filter(Boolean),
  );

  if (systemSkills.length === 0) {
    return (
      <Empty
        description={t("系统中暂无已启用的 Skills")}
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      >
        <Alert
          type="info"
          showIcon
          title={t("提示")}
          description={t("请先在 Skills 管理页面添加并启用 Skills")}
          className="mt-4 text-left"
        />
      </Empty>
    );
  }

  return (
    <div className="space-y-4">
      {recommendedSkills.length === 0 ? (
        <Alert
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
          title={t("所有推荐的 Skills 都已安装")}
          description={t("系统中已启用的 Skills 都已在此 Profile 中安装")}
        />
      ) : (
        <Alert
          type="info"
          showIcon
          title={t("发现 {{p0}} 个可安装的 Skills", { p0: recommendedSkills.length })}
          description={t("以下 Skills 在系统中已启用，建议安装到 Octos 以获得完整功能")}
        />
      )}

      <div className="grid grid-cols-2 gap-3">
        {systemSkills.map((skill) => {
          const repoInfo = SKILL_TO_OCTOS_REPO[skill.id];
          const isInstalled = installedNames.has(skill.id);
          const isRecommended = recommendedSkills.some(
            (s) => s.id === skill.id,
          );

          if (!repoInfo) {
            return null; // hide skills without a matching repository
          }

          return (
            <Card
              key={skill.id}
              size="small"
              className={`transition-all ${
                isInstalled
                  ? "border-green-500 bg-green-50"
                  : isRecommended
                    ? "border-(--color-primary) bg-(--color-primary-bg)"
                    : "border-(--color-border) bg-[var(--color-bg-secondary)]"
              }`}
            >
              <Space orientation="vertical" size={8} className="w-full">
                <div className="flex items-start justify-between">
                  <Space>
                    <span className="text-xl">⚡</span>
                    <div>
                      <Text strong className="text-[var(--color-text-primary)]">
                        {skill.name}
                      </Text>
                      <Tag
                        color={skill.type === "builtin" ? "blue" : "green"}
                        className="ml-2 text-xs"
                      >
                        {skill.type === "builtin" ? "内置" : "自定义"}
                      </Tag>
                    </div>
                  </Space>
                  {isInstalled ? (
                    <Tag color="success" icon={<CheckCircleOutlined />}>
                      已安装
                    </Tag>
                  ) : (
                    <Button
                      type="primary"
                      size="small"
                      icon={<DownloadOutlined />}
                      loading={installing === skill.id}
                      onClick={() => onInstall(skill.id)}
                      disabled={!isRecommended}
                    >
                      安装
                    </Button>
                  )}
                </div>

                <Text type="secondary" className="text-xs line-clamp-2">
                  {skill.description}
                </Text>

                <div className="flex items-center gap-2">
                  <Tag color="default" className="text-xs">
                    {skill.category}
                  </Tag>
                  {repoInfo.repo && (
                    <Tag color="default" className="text-xs font-mono">
                      {repoInfo.repo.split("/").pop()}
                    </Tag>
                  )}
                </div>

                {isRecommended && !isInstalled && (
                  <Alert
                    type="info"
                    showIcon
                    title={t("推荐安装")}
                    className="text-xs py-1"
                  />
                )}
              </Space>
            </Card>
          );
        })}
      </div>

      {/* Installation instructions */}
      <Alert
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        title={t("Skills 说明")}
        description={
          <ul className="text-xs space-y-1 mt-2 list-disc pl-4">
            <li>{t("绿色卡片表示已安装的 Skills")}</li>
            <li>{t("蓝色卡片表示推荐安装的 Skills（系统已启用但未安装）")}</li>
            <li>{t("灰色卡片表示暂不推荐或已禁用的 Skills")}</li>
            <li>{t("点击\"安装\"按钮将从 Octos Skills 仓库安装对应的 Python 包")}</li>
          </ul>
        }
      />
    </div>
  );
}
