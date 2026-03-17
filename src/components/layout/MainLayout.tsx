/**
 * 主布局组件
 */

import {
  ReactNode,
  useState,
  createContext,
  useContext,
  useEffect,
} from "react";
import { Layout, Drawer } from "antd";
import { RobotOutlined } from "@ant-design/icons";
import Sidebar from "./Sidebar";
import Header from "./Header";
import HorizontalNav from "./HorizontalNav";
import { useSettings, useAppStore } from "../../stores";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import { SettingsDrawer } from "../settings";
import { RouteLoadingProgress } from "../common";

const { Content } = Layout;

// 设置抽屉上下文
interface SettingsContextType {
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType>({
  settingsOpen: false,
  setSettingsOpen: () => {},
});

export const useSettingsDrawer = () => useContext(SettingsContext);

// 移动端断点
const MOBILE_BREAKPOINT = 1024;

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const settings = useSettings();
  const { sidebarCollapsed, setSidebarCollapsed } = useAppStore();

  // 初始化全局快捷键
  useKeyboardShortcuts();

  // 检测屏幕尺寸
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      if (mobile && !sidebarCollapsed) {
        setSidebarCollapsed(true);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [sidebarCollapsed, setSidebarCollapsed]);

  const isHorizontal = settings.themeLayout === "horizontal";
  const isStretch = settings.themeStretch;

  const contextValue: SettingsContextType = {
    settingsOpen,
    setSettingsOpen,
  };

  // 移动端布局
  if (isMobile) {
    return (
      <SettingsContext.Provider value={contextValue}>
        {/* 路由加载进度条 */}
        <RouteLoadingProgress />
        <Layout className="min-h-screen bg-[var(--color-bg-base)]">
          {/* 移动端头部 - 传入移动端导航作为左侧插槽 */}
          <Header leftSlot={null} />

          {/* 内容区域 */}
          <Content className="overflow-auto bg-[var(--color-bg-base)] p-3">
            {children}
          </Content>

          {/* 移动端侧边栏抽屉 */}
          <Drawer
            placement="left"
            open={!sidebarCollapsed}
            onClose={() => setSidebarCollapsed(true)}
            width={280}
            className="p-0"
            styles={{
              body: { padding: 0 },
              header: { display: "none" },
            }}
          >
            <Sidebar isMobile />
          </Drawer>

          {/* 设置抽屉 */}
          <SettingsDrawer
            open={settingsOpen}
            onClose={() => setSettingsOpen(false)}
          />
        </Layout>
      </SettingsContext.Provider>
    );
  }

  // 水平布局
  if (isHorizontal) {
    return (
      <SettingsContext.Provider value={contextValue}>
        {/* 路由加载进度条 */}
        <RouteLoadingProgress />
        <Layout className="min-h-screen bg-[var(--color-bg-base)]">
          {/* 顶部导航栏 */}
          <Layout.Header className="flex items-center h-14 px-4 bg-[#001529]">
            {/* Logo */}
            <div className="flex items-center gap-2 mr-6">
              <RobotOutlined className="text-2xl text-[var(--color-primary)]" />
              <span className="text-lg font-bold text-white">AmosClaw</span>
            </div>

            {/* 水平菜单 */}
            <HorizontalNav dark />

            {/* 右侧工具栏 */}
            <Header showBreadcrumb={false} />
          </Layout.Header>

          {/* 内容区域 */}
          <Layout
            className={`bg-[var(--color-bg-base)] ${isStretch ? "" : "max-w-[1400px] mx-auto"}`}
          >
            <Content className="overflow-auto bg-[var(--color-bg-base)] p-4">
              {children}
            </Content>
          </Layout>

          {/* 设置抽屉 */}
          <SettingsDrawer
            open={settingsOpen}
            onClose={() => setSettingsOpen(false)}
          />
        </Layout>
      </SettingsContext.Provider>
    );
  }

  // 垂直/迷你布局 (桌面端)
  return (
    <SettingsContext.Provider value={contextValue}>
      {/* 路由加载进度条 */}
      <RouteLoadingProgress />
      <Layout className="min-h-screen bg-[var(--color-bg-base)]">
        {/* 侧边栏 */}
        <Sidebar />

        {/* 主内容区 - 添加过渡动画 */}
        <Layout
          className={`
            bg-[var(--color-bg-base)]
            transition-all duration-300 ease-in-out
            ${isStretch ? "" : "max-w-[1400px] mx-auto"}
          `}
        >
          {/* 头部 */}
          <Header />

          {/* 内容区域 */}
          <Content className="overflow-auto bg-[var(--color-bg-base)] p-4">
            {children}
          </Content>
        </Layout>

        {/* 设置抽屉 */}
        <SettingsDrawer
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
        />
      </Layout>
    </SettingsContext.Provider>
  );
}
