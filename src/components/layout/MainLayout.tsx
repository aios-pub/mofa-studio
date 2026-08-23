/**
 * Main layout component
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

// Settings drawer context
interface SettingsContextType {
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType>({
  settingsOpen: false,
  setSettingsOpen: () => {},
});

export const useSettingsDrawer = () => useContext(SettingsContext);

// Mobile breakpoint
const MOBILE_BREAKPOINT = 1024;

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const settings = useSettings();
  const { sidebarCollapsed, setSidebarCollapsed } = useAppStore();

  // Initialize global shortcuts
  useKeyboardShortcuts();

  // Detect screen size
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

  // Mobile layout
  if (isMobile) {
    return (
      <SettingsContext.Provider value={contextValue}>
        {/* Route loading progress bar */}
        <RouteLoadingProgress />
        <Layout className="min-h-screen bg-[var(--color-bg-base)]">
          {/* Mobile header - mobile nav passed as left slot */}
          <Header leftSlot={null} />

          {/* Content area */}
          <Content className="overflow-auto bg-[var(--color-bg-base)] p-3">
            {children}
          </Content>

          {/* Mobile sidebar drawer */}
          <Drawer
            placement="left"
            open={!sidebarCollapsed}
            onClose={() => setSidebarCollapsed(true)}
            size={{ width: 280 }}
            className="p-0"
            styles={{
              body: { padding: 0 },
              header: { display: "none" },
            }}
          >
            <Sidebar isMobile />
          </Drawer>

          {/* Settings drawer */}
          <SettingsDrawer
            open={settingsOpen}
            onClose={() => setSettingsOpen(false)}
          />
        </Layout>
      </SettingsContext.Provider>
    );
  }

  // Horizontal layout
  if (isHorizontal) {
    return (
      <SettingsContext.Provider value={contextValue}>
        {/* Route loading progress bar */}
        <RouteLoadingProgress />
        <Layout className="min-h-screen bg-[var(--color-bg-base)]">
          {/* Top navigation bar */}
          <Layout.Header className="flex items-center h-14 px-4 bg-[#001529]">
            {/* Logo */}
            <div className="flex items-center gap-2 mr-6">
              <RobotOutlined className="text-2xl text-[var(--color-primary)]" />
              <span className="text-lg font-bold text-white">mofa-studio</span>
            </div>

            {/* Horizontal menu */}
            <HorizontalNav dark />

            {/* Right toolbar */}
            <Header showBreadcrumb={false} />
          </Layout.Header>

          {/* Content area */}
          <Layout
            className={`bg-[var(--color-bg-base)] ${isStretch ? "" : "max-w-[1400px] mx-auto"}`}
          >
            <Content className="overflow-auto bg-[var(--color-bg-base)] p-4">
              {children}
            </Content>
          </Layout>

          {/* Settings drawer */}
          <SettingsDrawer
            open={settingsOpen}
            onClose={() => setSettingsOpen(false)}
          />
        </Layout>
      </SettingsContext.Provider>
    );
  }

  // Vertical/mini layout (desktop)
  return (
    <SettingsContext.Provider value={contextValue}>
      {/* Route loading progress bar */}
      <RouteLoadingProgress />
      <Layout className="min-h-screen bg-[var(--color-bg-base)]">
        {/* Sidebar */}
        <Sidebar />

        {/* Main content area - with transition animation */}
        <Layout
          className={`
            bg-[var(--color-bg-base)]
            transition-all duration-300 ease-in-out
            ${isStretch ? "" : "max-w-[1400px] mx-auto"}
          `}
        >
          {/* Header */}
          <Header />

          {/* Content area */}
          <Content className="overflow-auto bg-[var(--color-bg-base)] p-4">
            {children}
          </Content>
        </Layout>

        {/* Settings drawer */}
        <SettingsDrawer
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
        />
      </Layout>
    </SettingsContext.Provider>
  );
}
