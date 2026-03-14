/**
 * 主布局组件
 */

import { ReactNode, useState, createContext, useContext } from 'react';
import { Layout } from 'antd';
import Sidebar from './Sidebar';
import Header from './Header';
import HorizontalNav from './HorizontalNav';
import { useSettings } from '../../stores';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { SettingsDrawer } from '../settings';
import { Bot } from 'lucide-react';

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

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settings = useSettings();

  // 初始化全局快捷键
  useKeyboardShortcuts();

  const isHorizontal = settings.themeLayout === 'horizontal';
  const isStretch = settings.themeStretch;

  const contextValue: SettingsContextType = {
    settingsOpen,
    setSettingsOpen,
  };

  // 水平布局
  if (isHorizontal) {
    return (
      <SettingsContext.Provider value={contextValue}>
        <Layout className="min-h-screen bg-[var(--color-bg-base)]">
          {/* 顶部导航栏 */}
          <Layout.Header className="flex items-center h-14 px-4 bg-[#001529]">
            {/* Logo */}
            <div className="flex items-center gap-2 mr-6">
              <Bot className="w-8 h-8 text-[var(--color-primary)]" />
              <span className="text-lg font-bold text-white">AmosClaw</span>
            </div>

            {/* 水平菜单 */}
            <HorizontalNav dark />

            {/* 右侧工具栏 */}
            <Header showBreadcrumb={false} />
          </Layout.Header>

          {/* 内容区域 */}
          <Layout className={`bg-[var(--color-bg-base)] ${isStretch ? '' : 'max-w-[1400px] mx-auto'}`}>
            <Content className="overflow-auto bg-[var(--color-bg-base)] p-4">
              {children}
            </Content>
          </Layout>

          {/* 设置抽屉 */}
          <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        </Layout>
      </SettingsContext.Provider>
    );
  }

  // 垂直/迷你布局
  return (
    <SettingsContext.Provider value={contextValue}>
      <Layout className="min-h-screen bg-[var(--color-bg-base)]">
        {/* 侧边栏 */}
        <Sidebar />

        {/* 主内容区 */}
        <Layout className={`bg-[var(--color-bg-base)] ${isStretch ? '' : 'max-w-[1400px] mx-auto'}`}>
          {/* 头部 */}
          <Header />

          {/* 内容区域 */}
          <Content className="overflow-auto bg-[var(--color-bg-base)] p-4">
            {children}
          </Content>
        </Layout>

        {/* 设置抽屉 */}
        <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </Layout>
    </SettingsContext.Provider>
  );
}
