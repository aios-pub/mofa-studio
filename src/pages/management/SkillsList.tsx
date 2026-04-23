/**
 * Skills 管理页面
 * 横向菜单布局：按技能使用流程分组
 */

import { useState } from "react";
import { Typography, Dropdown, Button } from "antd";
import type { MenuProps } from "antd";
import {
  ThunderboltOutlined,
  CloudOutlined,
  CloudUploadOutlined,
  AuditOutlined,
  SettingOutlined,
  KeyOutlined,
  TeamOutlined,
  StarOutlined,
  FileTextOutlined,
  InboxOutlined,
  AppstoreOutlined,
  DownOutlined,
  RocketOutlined,
} from "@ant-design/icons";
import {
  LocalSkillsList,
  HubSkillsView,
  PublishSkillView,
  MySkillsPage,
  MyStarsPage,
  ReviewQueue,
  GovernanceInbox,
  ApiTokenManagement,
  NamespaceManager,
  PromotionQueue,
} from "./skills";
import { SkillDetail } from "./SkillDetail";
import type { Skill } from "@/services";
import { skillApi } from "@/services";

const { Text, Title } = Typography;

type TabKey =
  | "local"
  | "hub"
  | "publish"
  | "my-skills"
  | "my-stars"
  | "governance"
  | "review"
  | "promotion"
  | "namespaces"
  | "tokens";

interface MenuItem {
  key: TabKey;
  label: string;
  icon: React.ReactNode;
}

interface MenuGroup {
  key: string;
  label: string;
  icon: React.ReactNode;
  items: MenuItem[];
}

export default function SkillsListPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("local");
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);

  const handleToggleEnabled = async (skill: Skill) => {
    try {
      const updated = await skillApi.update(skill.id, {
        enabled: !skill.enabled,
      });
      if (updated) {
        setSelectedSkill(updated);
      }
    } catch (error) {
      console.error("Failed to toggle skill:", error);
    }
  };

  // 菜单分组定义：按技能使用流程排序
  const menuGroups: MenuGroup[] = [
    {
      key: "browse",
      label: "浏览发现",
      icon: <AppstoreOutlined />,
      items: [
        { key: "local", label: "本地 Skills", icon: <ThunderboltOutlined /> },
        { key: "hub", label: "Skill Hub", icon: <CloudOutlined /> },
        { key: "my-stars", label: "我的收藏", icon: <StarOutlined /> },
      ],
    },
    {
      key: "create",
      label: "创作发布",
      icon: <CloudUploadOutlined />,
      items: [
        { key: "namespaces", label: "命名空间", icon: <TeamOutlined /> },
        { key: "publish", label: "发布 Skill", icon: <CloudUploadOutlined /> },
        { key: "my-skills", label: "我的技能", icon: <FileTextOutlined /> },
      ],
    },
    {
      key: "manage",
      label: "管理审核",
      icon: <SettingOutlined />,
      items: [
        { key: "tokens", label: "API 令牌", icon: <KeyOutlined /> },
        { key: "review", label: "审核队列", icon: <AuditOutlined /> },
        { key: "promotion", label: "推广队列", icon: <RocketOutlined /> },
        { key: "governance", label: "治理收件箱", icon: <InboxOutlined /> },
      ],
    },
  ];

  // 创建下拉菜单
  const createDropdownMenu = (items: MenuItem[]): MenuProps => ({
    items: items.map((item) => ({
      key: item.key,
      label: (
        <span className="flex items-center gap-2">
          {item.icon}
          {item.label}
        </span>
      ),
      onClick: () => setActiveTab(item.key),
    })),
    selectedKeys: [activeTab],
  });

  const renderContent = () => {
    if (activeTab === "local") {
      return (
        <div className="flex h-full">
          {/* 本地技能列表 */}
          <div className="w-80 border-r border-(--color-border) flex flex-col bg-[var(--color-bg-secondary)]">
            <LocalSkillsList
              selectedSkill={selectedSkill}
              onSelectSkill={setSelectedSkill}
            />
          </div>
          {/* 技能详情 */}
          <div className="flex-1 overflow-y-auto">
            {selectedSkill ? (
              <SkillDetail
                skill={selectedSkill}
                onToggleEnabled={handleToggleEnabled}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <ThunderboltOutlined
                    style={{
                      fontSize: 48,
                      color: "var(--color-text-tertiary)",
                      marginBottom: 16,
                    }}
                  />
                  <Title level={5} type="secondary">
                    选择一个 Skill
                  </Title>
                  <Text type="secondary">从左侧列表中选择查看详情</Text>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case "hub":
        return <HubSkillsView />;
      case "publish":
        return (
          <PublishSkillView
            onSwitchToNamespaces={() => setActiveTab("namespaces")}
          />
        );
      case "my-skills":
        return <MySkillsPage />;
      case "my-stars":
        return <MyStarsPage />;
      case "governance":
        return <GovernanceInbox />;
      case "review":
        return <ReviewQueue />;
      case "promotion":
        return <PromotionQueue />;
      case "namespaces":
        return <NamespaceManager />;
      case "tokens":
        return <ApiTokenManagement />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* 顶部横向菜单 */}
      <div className="border-b border-(--color-border) bg-[var(--color-bg-secondary)]">
        <div className="flex items-center gap-1 px-4 py-2">
          <div className="flex gap-2">
            {menuGroups.map((group) => (
              <Dropdown
                key={group.key}
                menu={createDropdownMenu(group.items)}
                trigger={["hover"]}
                placement="bottomLeft"
              >
                <Button
                  type="text"
                  className={
                    group.items.some((item) => item.key === activeTab)
                      ? "text-[var(--color-primary)]"
                      : ""
                  }
                >
                  <span className="flex items-center gap-2">
                    {group.icon}
                    {group.label}
                    <DownOutlined className="text-xs" />
                  </span>
                </Button>
              </Dropdown>
            ))}
          </div>
        </div>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-hidden">{renderContent()}</div>
    </div>
  );
}
