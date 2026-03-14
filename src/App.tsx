import { Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { useAppStore } from './stores';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/workbench/Dashboard';
import Conversation from './pages/workbench/Conversation';
import { AgentListPage, PromptListPage, SkillsListPage } from './pages/management';

function App() {
  const { theme } = useAppStore();

  // 主题切换
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', isDark);
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
  }, [theme]);

  return (
    <MainLayout>
      <Routes>
        {/* 工作台 */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/conversation" element={<Conversation />} />
        <Route path="/conversation/:id" element={<Conversation />} />

        {/* 管理模块 */}
        <Route path="/management/agents" element={<AgentListPage />} />
        <Route path="/management/prompts" element={<PromptListPage />} />
        <Route path="/management/skills" element={<SkillsListPage />} />
        <Route path="/management/test-sets" element={<PlaceholderPage title="测试集管理" />} />
        <Route path="/management/providers" element={<PlaceholderPage title="Provider 管理" />} />
        <Route path="/management/tasks" element={<PlaceholderPage title="定时任务" />} />

        {/* 监控模块 - 占位 */}
        <Route path="/analytics" element={<PlaceholderPage title="统计分析" />} />
        <Route path="/monitoring" element={<PlaceholderPage title="实时监控" />} />

        {/* 组织模块 - 占位 */}
        <Route path="/organization/users" element={<PlaceholderPage title="用户管理" />} />
        <Route path="/organization/departments" element={<PlaceholderPage title="部门管理" />} />

        {/* 系统模块 - 占位 */}
        <Route path="/system/resources" element={<PlaceholderPage title="资源管理" />} />
        <Route path="/system/audit-logs" element={<PlaceholderPage title="审计日志" />} />
      </Routes>
    </MainLayout>
  );
}

// 占位页面组件
function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">{title}</h2>
        <p className="mt-2 text-[var(--color-text-secondary)]">功能开发中...</p>
      </div>
    </div>
  );
}

export default App;
