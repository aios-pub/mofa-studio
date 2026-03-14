/**
 * 主布局组件
 */

import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import { useAppStore } from '../../stores';

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { sidebarCollapsed } = useAppStore();

  return (
    <div className="flex h-screen bg-[var(--color-bg-base)]">
      {/* 侧边栏 */}
      <Sidebar />

      {/* 主内容区 */}
      <main
        className={`flex-1 overflow-hidden transition-all duration-300 ${
          sidebarCollapsed ? 'ml-0' : 'ml-0'
        }`}
      >
        {children}
      </main>
    </div>
  );
}
