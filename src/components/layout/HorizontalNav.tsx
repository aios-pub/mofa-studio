/**
 * 水平导航组件
 */

import { useNavigate, useLocation } from "react-router-dom";
import { Menu } from "antd";
import type { MenuProps } from "antd";

// 水平菜单配置
const horizontalMenuItems: MenuProps["items"] = [
  {
    key: "/",
    label: "仪表盘",
    icon: <span className="i-lucide-layout-dashboard w-4 h-4" />,
  },
  {
    key: "/conversation",
    label: "对话",
    icon: <span className="i-lucide-message-square w-4 h-4" />,
  },
  {
    key: "management",
    label: "管理",
    icon: <span className="i-lucide-folder w-4 h-4" />,
    children: [
      {
        key: "/management/providers",
        label: "Provider 管理",
        icon: <span className="i-lucide-server w-4 h-4" />,
      },
      {
        key: "/management/prompts",
        label: "提示词管理",
        icon: <span className="i-lucide-file-text w-4 h-4" />,
      },
      {
        key: "/management/skills",
        label: "Skills 管理",
        icon: <span className="i-lucide-zap w-4 h-4" />,
      },
      {
        key: "/management/agents",
        label: "Agent 管理",
        icon: <span className="i-lucide-bot w-4 h-4" />,
      },
      {
        key: "/management/test-sets",
        label: "测试集管理",
        icon: <span className="i-lucide-flask-conical w-4 h-4" />,
      },
      {
        key: "/management/tasks",
        label: "定时任务",
        icon: <span className="i-lucide-clock w-4 h-4" />,
      },
      {
        key: "/system/resources",
        label: "资源管理",
        icon: <span className="i-lucide-file-box w-4 h-4" />,
      },
    ],
  },
  {
    key: "monitoring",
    label: "监控",
    icon: <span className="i-lucide-eye w-4 h-4" />,
    children: [
      {
        key: "/analytics",
        label: "统计分析",
        icon: <span className="i-lucide-bar-chart-3 w-4 h-4" />,
      },
      {
        key: "/monitoring",
        label: "实时监控",
        icon: <span className="i-lucide-eye w-4 h-4" />,
      },
    ],
  },
  {
    key: "tracing",
    label: "追踪评估",
    icon: <span className="i-lucide-activity w-4 h-4" />,
    children: [
      {
        key: "/tracing",
        label: "追踪分析",
        icon: <span className="i-lucide-activity w-4 h-4" />,
      },
      {
        key: "/evaluation",
        label: "Agent 评估",
        icon: <span className="i-lucide-clipboard-check w-4 h-4" />,
      },
    ],
  },
  {
    key: "organization",
    label: "组织",
    icon: <span className="i-lucide-building-2 w-4 h-4" />,
    children: [
      {
        key: "/organization/users",
        label: "用户管理",
        icon: <span className="i-lucide-users w-4 h-4" />,
      },
      {
        key: "/organization/departments",
        label: "部门管理",
        icon: <span className="i-lucide-building-2 w-4 h-4" />,
      },
    ],
  },
  {
    key: "system",
    label: "系统",
    icon: <span className="i-lucide-settings w-4 h-4" />,
    children: [
      {
        key: "/system/audit-logs",
        label: "审计日志",
        icon: <span className="i-lucide-scroll-text w-4 h-4" />,
      },
      {
        key: "/system/settings",
        label: "设置",
        icon: <span className="i-lucide-settings w-4 h-4" />,
      },
    ],
  },
];

interface HorizontalNavProps {
  dark?: boolean;
}

export default function HorizontalNav({ dark = false }: HorizontalNavProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleMenuClick: MenuProps["onClick"] = ({ key }) => {
    navigate(key);
  };

  // 获取当前选中的菜单键
  const getSelectedKeys = () => {
    const pathname = location.pathname;
    // 直接匹配
    return [pathname];
  };

  return (
    <Menu
      mode="horizontal"
      theme={dark ? "dark" : "light"}
      selectedKeys={getSelectedKeys()}
      onClick={handleMenuClick}
      items={horizontalMenuItems}
      className="!border-none flex-1"
      style={{ minWidth: 0 }}
    />
  );
}
