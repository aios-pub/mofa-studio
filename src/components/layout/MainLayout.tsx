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
import Sidebar from "./Sidebar";
import Header from "./Header";
import HorizontalNav from "./HorizontalNav";
import { useSettings, useAppStore } from "../../stores";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import { SettingsDrawer } from "../settings";
import { RouteLoadingProgress } from "../common";
import WelcomeFlow, { hasOnboarded } from "../onboarding/WelcomeFlow";
import CustomTitlebar from "./CustomTitlebar";

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
  const [showWelcome, setShowWelcome] = useState(() => !hasOnboarded());
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
        <Layout className="min-h-screen bg-[var(--color-bg-base)] relative">
          <RouteLoadingProgress />
          <Header leftSlot={null} />
          <Content className="overflow-auto bg-[var(--color-bg-base)] p-3">
            {children}
          </Content>
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
          <SettingsDrawer
            open={settingsOpen}
            onClose={() => setSettingsOpen(false)}
          />
        </Layout>
        {showWelcome && (
          <WelcomeFlow onFinish={() => setShowWelcome(false)} />
        )}
      </SettingsContext.Provider>
    );
  }

  // Horizontal layout
  if (isHorizontal) {
    return (
      <SettingsContext.Provider value={contextValue}>
        <Layout className="min-h-screen bg-[var(--color-bg-base)] relative">
          <RouteLoadingProgress />
          <Layout.Header className="flex items-center h-14 px-4 bg-[#001529]">
            <HorizontalNav dark />
            <Header showBreadcrumb={false} />
          </Layout.Header>
          <Layout
            className={`bg-[var(--color-bg-base)] ${isStretch ? "" : "max-w-[1400px] mx-auto"}`}
          >
            <Content className="overflow-auto bg-[var(--color-bg-base)] p-4">
              {children}
            </Content>
          </Layout>
          <SettingsDrawer
            open={settingsOpen}
            onClose={() => setSettingsOpen(false)}
          />
        </Layout>
        {showWelcome && (
          <WelcomeFlow onFinish={() => setShowWelcome(false)} />
        )}
      </SettingsContext.Provider>
    );
  }

  // Vertical/mini layout (desktop)
  return (
    <SettingsContext.Provider value={contextValue}>
      <CustomTitlebar>
        <Layout className="min-h-screen bg-[var(--color-bg-base)] relative">
          <RouteLoadingProgress />
          <Sidebar />
          <Layout
            className={`
              bg-[var(--color-bg-base)]
              transition-all duration-300 ease-in-out
              ${isStretch ? "" : "max-w-[1400px] mx-auto"}
            `}
          >
            <Header />
            <Content className="overflow-auto bg-[var(--color-bg-base)] p-4">
              {children}
            </Content>
          </Layout>
          <SettingsDrawer
            open={settingsOpen}
            onClose={() => setSettingsOpen(false)}
          />
        </Layout>
        {showWelcome && (
          <WelcomeFlow onFinish={() => setShowWelcome(false)} />
        )}
      </CustomTitlebar>
    </SettingsContext.Provider>
  );
}
