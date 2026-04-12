/**
 * 侧边栏导航组件
 * 支持桌面端固定侧边栏和移动端抽屉模式
 */

import { useNavigate, useLocation } from "react-router-dom";
import { Layout, Menu, Button } from "antd";
import {
  RobotOutlined,
  LeftOutlined,
  RightOutlined,
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
  FolderOutlined,
  FileSearchOutlined,
  PieChartOutlined,
  MenuOutlined,
  TeamOutlined,
  SettingOutlined,
  LinkOutlined,
  BranchesOutlined,
  DatabaseOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { useAppStore, useSettings } from "../../stores";
import { useTheme } from "../../hooks";

const { Sider } = Layout;

interface SidebarProps {
  isMobile?: boolean;
}

// 菜单配置 - 使用 Ant Design 图标组件
const menuItems: MenuProps["items"] = [
  {
    key: "workbench",
    label: "工作台",
    type: "group",
  },
  {
    key: "/",
    icon: <DashboardOutlined />,
    label: "仪表盘",
  },
  {
    key: "/conversation",
    icon: <MessageOutlined />,
    label: "对话",
  },
  { type: "divider" },
  {
    key: "management",
    label: "管理",
    type: "group",
  },
  {
    key: "/management/agents",
    icon: <RobotOutlined />,
    label: "Agent 管理",
  },
  {
    key: "/management/prompts",
    icon: <FileTextOutlined />,
    label: "提示词管理",
  },
  {
    key: "/management/skills",
    icon: <ThunderboltOutlined />,
    label: "Skills 管理",
  },
  {
    key: "/management/test-sets",
    icon: <ExperimentOutlined />,
    label: "测试集管理",
  },
  {
    key: "/management/providers",
    icon: <CloudServerOutlined />,
    label: "Provider 管理",
  },
  {
    key: "/management/channels",
    icon: <LinkOutlined />,
    label: "渠道管理",
  },
  {
    key: "/management/tasks",
    icon: <ClockCircleOutlined />,
    label: "定时任务",
  },
  { type: "divider" },
  {
    key: "workflow",
    label: "工作流",
    type: "group",
  },
  {
    key: "/workflow",
    icon: <BranchesOutlined />,
    label: "工作流编辑",
  },
  {
    key: "knowledge",
    label: "知识库",
    type: "group",
  },
  {
    key: "/knowledge",
    icon: <DatabaseOutlined />,
    label: "知识库管理",
  },
  { type: "divider" },
  {
    key: "monitoring",
    label: "监控",
    type: "group",
  },
  {
    key: "/analytics",
    icon: <BarChartOutlined />,
    label: "统计分析",
  },
  {
    key: "/monitoring",
    icon: <EyeOutlined />,
    label: "实时监控",
  },
  { type: "divider" },
  {
    key: "tracing",
    label: "追踪与评估",
    type: "group",
  },
  {
    key: "/tracing",
    icon: <ApiOutlined />,
    label: "追踪分析",
  },
  {
    key: "/evaluation",
    icon: <AuditOutlined />,
    label: "Agent 评估",
  },
  { type: "divider" },
  {
    key: "organization",
    label: "组织",
    type: "group",
  },
  {
    key: "/organization/users",
    icon: <UserOutlined />,
    label: "用户管理",
  },
  {
    key: "/organization/departments",
    icon: <ApartmentOutlined />,
    label: "部门管理",
  },
  { type: "divider" },
  {
    key: "system",
    label: "系统",
    type: "group",
  },
  {
    key: "/system/resources",
    icon: <FolderOutlined />,
    label: "资源管理",
  },
  {
    key: "/system/audit-logs",
    icon: <FileSearchOutlined />,
    label: "审计日志",
  },
  {
    key: "/system/insight",
    icon: <PieChartOutlined />,
    label: "洞察分析",
  },
  {
    key: "/system/menu",
    icon: <MenuOutlined />,
    label: "菜单管理",
  },
  {
    key: "/system/role",
    icon: <TeamOutlined />,
    label: "角色管理",
  },
  {
    key: "/system/settings",
    icon: <SettingOutlined />,
    label: "系统设置",
  },
];

export default function Sidebar({ isMobile = false }: SidebarProps) {
  const { sidebarCollapsed, toggleSidebar, setSidebarCollapsed } =
    useAppStore();
  const settings = useSettings();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const isMini = isMobile
    ? false
    : settings.themeLayout === "mini" || sidebarCollapsed;
  const isHorizontal = settings.themeLayout === "horizontal";

  // 主题相关样式
  const siderBg = isDark ? "#001529" : "#ffffff";
  const borderColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const logoTextColor = isDark
    ? "text-white"
    : "text-[var(--color-text-primary)]";

  const handleMenuClick: MenuProps["onClick"] = ({ key }) => {
    navigate(key);
    // 移动端点击菜单后自动关闭抽屉
    if (isMobile) {
      setSidebarCollapsed(true);
    }
  };

  // 水平布局且非移动端时不显示侧边栏
  if (isHorizontal && !isMobile) {
    return null;
  }

  // 移动端模式 - 渲染为普通 div（在 Drawer 中使用）
  if (isMobile) {
    return (
      <div
        className="h-full flex flex-col"
        style={{ backgroundColor: siderBg }}
      >
        {/* Logo 区域 */}
        <div
          className="flex items-center gap-2 h-[var(--layout-header-height)] px-4 border-b"
          style={{ borderColor }}
        >
          <RobotOutlined className="text-2xl text-[var(--color-primary)]" />
          <span className={`text-lg font-bold ${logoTextColor}`}>AMOS</span>
        </div>

        {/* 菜单列表 */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-2">
          <Menu
            theme={isDark ? "dark" : "light"}
            mode="inline"
            selectedKeys={[location.pathname]}
            onClick={handleMenuClick}
            items={menuItems}
            className="!border-none"
          />
        </div>
      </div>
    );
  }

  return (
    <Sider
      collapsible
      collapsed={isMini}
      onCollapse={toggleSidebar}
      width={224}
      collapsedWidth={64}
      className="h-screen overflow-hidden relative transition-all duration-300 ease-in-out border-r"
      style={{ backgroundColor: siderBg, borderColor: borderColor }}
      trigger={null}
    >
      <div
        className="relative flex items-center h-[var(--layout-header-height)] px-2 border-b transition-all duration-300 cursor-pointer"
        style={{ borderColor }}
        onClick={() => navigate("/")}
      >
        <div
          className={`flex items-center ${isMini ? "justify-center w-full" : ""}`}
        >
          <RobotOutlined className="text-2xl text-[var(--color-primary)] flex-shrink-0" />
          <span
            className="text-lg font-bold transition-all duration-300 ease-in-out whitespace-nowrap"
            style={{
              opacity: isMini ? 0 : 1,
              width: isMini ? 0 : "auto",
              marginLeft: isMini ? 0 : "8px",
              overflow: "hidden",
              color: isDark ? "#fff" : "var(--color-text-primary)",
            }}
          >
            AMOS
          </span>
        </div>

        <Button
          type="text"
          size="small"
          onClick={toggleSidebar}
          className="!absolute !right-0 translate-x-1/2 !w-7 !h-7 !rounded-full !border !border-[var(--color-border)] !bg-[var(--color-bg-base)] hover:!bg-[var(--color-bg-secondary)] z-10 flex items-center justify-center"
          icon={
            isMini ? (
              <RightOutlined className="text-xs" />
            ) : (
              <LeftOutlined className="text-xs" />
            )
          }
        />
      </div>

      {/* 菜单列表 - 使用自定义滚动条 */}
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
          items={menuItems}
          className="!border-none"
        />
      </div>
    </Sider>
  );
}
