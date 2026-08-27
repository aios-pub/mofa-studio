/**
 * Sidebar navigation component
 * Supports fixed sidebar on desktop and drawer mode on mobile
 * Supports drag-to-resize width
 */

import { useNavigate, useLocation } from "react-router-dom";
import { Layout, Menu, Button, Switch } from "antd";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import {
  CloudDownloadOutlined,
  SolutionOutlined,
  CustomerServiceOutlined,
  SearchOutlined,
  AudioOutlined,
  RobotOutlined,
  DashboardOutlined,
  MessageOutlined,
  FileTextOutlined,
  ThunderboltOutlined,
  ExperimentOutlined,
  CloudServerOutlined,
  ClockCircleOutlined,
  BarChartOutlined,
  EyeOutlined,
  ApiOutlined,
  AuditOutlined,
  UserOutlined,
  ApartmentOutlined,
  LineChartOutlined,
  FolderOutlined,
  FileSearchOutlined,
  PieChartOutlined,
  MenuOutlined,
  TeamOutlined,
  SettingOutlined,
  LinkOutlined,
  BranchesOutlined,
  DatabaseOutlined,
  ProjectOutlined,
  CrownOutlined,
  FileDoneOutlined,
  AppstoreOutlined,
  PictureOutlined,
  BulbOutlined,
  HistoryOutlined,
  VideoCameraOutlined,
  FileImageOutlined,
  TableOutlined,
  ToolOutlined,
  EditOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { useAppStore, useSettings, useSettingActions } from "../../stores";
import { hasFirstOutput } from "../onboarding/firstRunCases";
import { useTheme } from "../../hooks";
import TrafficLights from "./TrafficLights";
import { useState, useRef, useEffect, useCallback } from "react";

const { Sider } = Layout;

interface SidebarProps {
  isMobile?: boolean;
}

// Menu configuration - Ant Design icon components; labels resolve through
// i18n so the language toggle covers the whole navigation
const coreMenuItems = (t: TFunction): MenuProps["items"] => [
  {
    key: "/",
    icon: <DashboardOutlined />,
    label: t("nav.dashboard", "仪表盘"),
  },
  {
    key: "/inspiration",
    icon: <BulbOutlined />,
    label: t("nav.inspiration", "灵感广场"),
  },
  {
    key: "/conversation",
    icon: <MessageOutlined />,
    label: t("nav.conversation", "对话"),
  },
  {
    key: "/projects",
    icon: <ProjectOutlined />,
    label: t("nav.projects", "项目"),
  },
  {
    key: "/deliverables",
    icon: <FileDoneOutlined />,
    label: t("nav.deliverables", "产物中心"),
  },
  {
    key: "/creation/image-gen",
    icon: <PictureOutlined />,
    label: t("nav.imageGen", "图像生成"),
  },
  {
    key: "/creation/history",
    icon: <HistoryOutlined />,
    label: t("nav.generationHistory", "生成历史"),
  },
  {
    key: "/creation/video-gen",
    icon: <VideoCameraOutlined />,
    label: t("nav.videoGen", "视频生成"),
  },
  {
    key: "/creation/music",
    icon: <CustomerServiceOutlined />,
    label: t("nav.musicGen", "音乐生成"),
  },
  {
    key: "/creation/ppt",
    icon: <FileImageOutlined />,
    label: t("nav.pptGen", "PPT 生成"),
  },
  {
    key: "/creation/sheets",
    icon: <TableOutlined />,
    label: t("nav.aiSheets", "AI 表格"),
  },
  {
    key: "/creation/media",
    icon: <ToolOutlined />,
    label: t("nav.mediaTools", "媒体处理"),
  },
  {
    key: "/creation/research",
    icon: <SearchOutlined />,
    label: t("nav.research", "深入研究"),
  },
  {
    key: "/creation/transcription",
    icon: <AudioOutlined />,
    label: t("nav.transcription", "录音转写"),
  },
  {
    key: "/creation/solver",
    icon: <SolutionOutlined />,
    label: t("nav.solver", "解题答疑"),
  },
  {
    key: "/creation/podcast",
    icon: <AudioOutlined />,
    label: t("nav.podcast", "播客工坊"),
  },
  {
    key: "/creation/writing",
    icon: <EditOutlined />,
    label: t("nav.aiWriting", "AI 写作"),
  },
  {
    key: "/gallery",
    icon: <PictureOutlined />,
    label: t("nav.gallery", "作品画廊"),
  },
  {
    key: "/flow",
    icon: <ApartmentOutlined />,
    label: t("nav.flowCanvas", "工作流画布"),
  },
  {
    key: "/apps",
    icon: <AppstoreOutlined />,
    label: t("nav.apps", "应用"),
  },
  {
    key: "/usage",
    icon: <LineChartOutlined />,
    label: t("nav.usage", "用量与日志"),
  },
  {
    key: "/models",
    icon: <CloudDownloadOutlined />,
    label: t("nav.models", "模型中心"),
  },
  {
    key: "/storage",
    icon: <DatabaseOutlined />,
    label: t("nav.storage", "存储管理"),
  },
  {
    key: "/memory",
    icon: <CrownOutlined />,
    label: t("nav.memory", "记忆"),
  },
  {
    key: "/experts",
    icon: <TeamOutlined />,
    label: t("nav.experts", "专家"),
  },
  {
    key: "/connectors",
    icon: <ApiOutlined />,
    label: t("nav.connectors", "连接器"),
  },
  {
    key: "/skills",
    icon: <ThunderboltOutlined />,
    label: t("nav.skillsHub", "技能"),
  },
  { type: "divider" },
  {
    key: "/management/providers",
    icon: <CloudServerOutlined />,
    label: t("nav.providers", "Provider"),
  },
  {
    key: "/management/prompts",
    icon: <FileTextOutlined />,
    label: t("nav.prompts", "提示词"),
  },
  {
    key: "/management/skills",
    icon: <ThunderboltOutlined />,
    label: t("nav.skills", "Skills"),
  },
  { type: "divider" },
  {
    key: "/scheduler",
    icon: <ClockCircleOutlined />,
    label: t("nav.scheduler", "调度"),
  },
  { type: "divider" },
  {
    key: "/workflow",
    icon: <BranchesOutlined />,
    label: t("nav.workflow", "工作流"),
  },
  {
    key: "/knowledge",
    icon: <DatabaseOutlined />,
    label: t("nav.knowledge", "知识库"),
  },
  { type: "divider" },
];

/** PLAT-14: B-end modules, mounted under /expert/* and only offered when
 * expert mode is on (persisted in the settings store). */
const expertMenuItems = (t: TFunction): MenuProps["items"] => [
  { type: "divider" },
  {
    key: "expert",
    label: t("nav.expertMode", "专家模式"),
    type: "group",
  },
  {
    key: "/expert/management/agents",
    icon: <RobotOutlined />,
    label: t("nav.agents", "Agent 管理"),
  },
  {
    key: "/expert/management/test-sets",
    icon: <ExperimentOutlined />,
    label: t("nav.testSets", "测试集管理"),
  },
  {
    key: "/expert/management/load-test",
    icon: <BarChartOutlined />,
    label: t("nav.loadTest", "压测管理"),
  },
  {
    key: "/expert/management/channels",
    icon: <LinkOutlined />,
    label: t("nav.channels", "渠道管理"),
  },
  {
    key: "/expert/system/resources",
    icon: <FolderOutlined />,
    label: t("nav.resources", "资源管理"),
  },
  {
    key: "/expert/analytics",
    icon: <BarChartOutlined />,
    label: t("nav.analytics", "统计分析"),
  },
  {
    key: "/expert/monitoring",
    icon: <EyeOutlined />,
    label: t("nav.monitoring", "实时监控"),
  },
  { type: "divider" },
  {
    key: "/expert/tracing",
    icon: <ApiOutlined />,
    label: t("nav.tracing", "追踪分析"),
  },
  {
    key: "/expert/evaluation",
    icon: <AuditOutlined />,
    label: t("nav.evaluation", "Agent 评估"),
  },
  { type: "divider" },
  {
    key: "/expert/organization/users",
    icon: <UserOutlined />,
    label: t("nav.users", "用户管理"),
  },
  {
    key: "/expert/organization/departments",
    icon: <ApartmentOutlined />,
    label: t("nav.departments", "部门管理"),
  },
  { type: "divider" },
  {
    key: "/expert/system/audit-logs",
    icon: <FileSearchOutlined />,
    label: t("nav.auditLogs", "审计日志"),
  },
  {
    key: "/expert/system/insight",
    icon: <PieChartOutlined />,
    label: t("nav.insight", "洞察"),
  },
  {
    key: "/expert/system/menu",
    icon: <MenuOutlined />,
    label: t("nav.menu", "菜单管理"),
  },
  {
    key: "/expert/system/role",
    icon: <TeamOutlined />,
    label: t("nav.role", "角色管理"),
  },
  {
    key: "/expert/system/settings",
    icon: <SettingOutlined />,
    label: t("nav.settings", "系统设置"),
  },
];
;

const MIN_WIDTH = 150;
const MAX_WIDTH = 400;

// Expanded width adapts to the window (16% of it), clamped to a sane
// range; a manual drag takes over from the adaptive value.
const adaptiveWidth = () =>
  Math.min(240, Math.max(176, Math.round(window.innerWidth * 0.16)));

export default function Sidebar({ isMobile = false }: SidebarProps) {
  const { t } = useTranslation();
  const expertMode = useSettings().expertMode;
  // PLAT-13: the assistant entry carries an unread-inspiration dot until
  // the first successful output (maturity-funnel nudge).
  const coreItems = (coreMenuItems(t) ?? []).map((item) => {
    const chat = item as { key?: string; label?: React.ReactNode };
    if (chat?.key === "/conversation" && !hasFirstOutput()) {
      return {
        ...item,
        label: (
          <span className="relative">
            {chat.label}
            <span className="absolute -right-2 top-0 inline-block w-2 h-2 rounded-full bg-red-500" />
          </span>
        ),
      };
    }
    return item;
  });
  const visibleMenuItems: MenuProps["items"] = (
    expertMode ? [...coreItems, ...(expertMenuItems(t) ?? [])] : coreItems
  ).filter(Boolean) as MenuProps["items"];

  const { sidebarCollapsed, toggleSidebar, setSidebarCollapsed } =
    useAppStore();
  const { toggleExpertMode } = useSettingActions();
  const settings = useSettings();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const isMini = isMobile
    ? false
    : settings.themeLayout === "mini" || sidebarCollapsed;
  const isHorizontal = settings.themeLayout === "horizontal";

  const [siderWidth, setSiderWidth] = useState(adaptiveWidth);
  const [isResizing, setIsResizing] = useState(false);
  // Once the user drags the edge, their width wins over the adaptive one
  const userResizedRef = useRef(false);
  const siderRef = useRef<HTMLDivElement>(null);

  // Keep the adaptive width in sync with window resizes until overridden
  useEffect(() => {
    const onResize = () => {
      if (!userResizedRef.current) setSiderWidth(adaptiveWidth());
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (siderRef.current) {
        const newWidth = e.clientX;
        if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
          userResizedRef.current = true;
          setSiderWidth(newWidth);
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  // Theme-related styles
  const siderBg = isDark ? "#001529" : "#ffffff";
  const borderColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";

  const handleMenuClick: MenuProps["onClick"] = ({ key }) => {
    navigate(key);
    // Auto-close the drawer after tapping a menu item on mobile
    if (isMobile) {
      setSidebarCollapsed(true);
    }
  };

  // Hide the sidebar in horizontal layout on non-mobile
  if (isHorizontal && !isMobile) {
    return null;
  }

  // Mobile mode - render as a plain div (used inside a drawer)
  if (isMobile) {
    return (
      <div
        className="h-full flex flex-col"
        style={{ backgroundColor: siderBg }}
      >
        {/* Logo area — kept as an empty spacing strip */}
        <div
          className="flex items-center h-[var(--layout-header-height)] px-4 border-b"
          style={{ borderColor }}
        />

        {/* Menu list */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-2">
          <Menu
            theme={isDark ? "dark" : "light"}
            mode="inline"
            selectedKeys={[location.pathname]}
            onClick={handleMenuClick}
            items={visibleMenuItems}
            className="!border-none"
          />
        </div>
      </div>
    );
  }

  return (
    <Sider
      ref={siderRef}
      collapsible
      collapsed={isMini}
      onCollapse={toggleSidebar}
      width={isMini ? 64 : siderWidth}
      collapsedWidth={64}
      className="h-screen overflow-hidden relative transition-all duration-300 ease-in-out border-r"
      style={{
        backgroundColor: siderBg,
        borderColor: borderColor,
        transition: isResizing ? "none" : undefined,
      }}
      trigger={null}
    >
      <div
        className="relative flex items-center h-[var(--layout-header-height)] pr-2 border-b transition-all duration-300"
        style={{ borderColor }}
      >
        {/* Inline traffic lights + drag surface keep everything on the
            title line regardless of utility-class availability */}
        <TrafficLights leftInset={isMini ? 4 : 16} />
        <div
          data-window-drag-region
          className="flex-1 self-stretch"
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Menu list - custom scrollbar */}
      <div
        className="h-[calc(100vh-var(--layout-header-height))] overflow-y-auto scrollbar-thin px-2"
        style={{
          scrollbarColor: isDark
            ? "rgba(255,255,255,0.2) transparent"
            : "rgba(0,0,0,0.2) transparent",
        }}
      >
        <Menu
          theme={isDark ? "dark" : "light"}
          mode="inline"
          inlineCollapsed={isMini}
          selectedKeys={[location.pathname]}
          onClick={handleMenuClick}
          items={visibleMenuItems}
          className="!border-none"
        />
      </div>

      {/* PLAT-14: expert-mode switch — B-end modules under /expert/* */}
      {!isMini && (
        <div className="px-4 py-3 border-t border-[var(--color-border)] flex items-center justify-between">
          <span className="text-xs text-[var(--color-text-tertiary)]">
            {t("nav.expertMode", "专家模式")}
          </span>
          <Switch
            size="small"
            checked={expertMode}
            onChange={toggleExpertMode}
            aria-label={t("专家模式开关")}
          />
        </div>
      )}

      {/* Drag handle for resizing width */}
      {!isMini && (
        <div
          className="absolute top-0 right-0 w-1 h-full cursor-col-resize z-20 hover:bg-[var(--color-primary)]/30 transition-colors"
          style={{
            backgroundColor: isResizing
              ? "var(--color-primary)"
              : "transparent",
            opacity: isResizing ? 0.5 : 1,
          }}
          onMouseDown={handleMouseDown}
        />
      )}
    </Sider>
  );
}
