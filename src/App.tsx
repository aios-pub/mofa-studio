import { Routes, Route, Navigate } from 'react-router-dom';
import './i18n'; // Initialize i18n
import MainLayout from './components/layout/MainLayout';
import { RouteGuard } from './components/auth';
import { ToastProvider } from './components/common';
import Dashboard from './pages/workbench/Dashboard';
import Conversation from './pages/workbench/Conversation';
import { AgentListPage, PromptListPage, SkillsListPage, TestSetsListPage, ProvidersListPage, ChannelsListPage } from './pages/management';
import SchedulerPage from './pages/scheduler';
import AnalyticsPage from './pages/analytics/AnalyticsPage';
import MonitoringPage from './pages/monitoring/MonitoringPage';
import UsersPage from './pages/organization/UsersPage';
import DepartmentsPage from './pages/organization/DepartmentsPage';
import AuditLogsPage from './pages/system/AuditLogsPage';
import ResourceManagementPage from './pages/system/ResourceManagementPage';
import SettingsPage from './pages/system/SettingsPage';
import InsightPage from './pages/system/InsightPage';
import MenuManagementPage from './pages/system/menu';
import RoleManagementPage from './pages/system/role';
import LoginPage from './pages/auth/LoginPage';
import ProfilePage from './pages/profile/ProfilePage';
import TracingPage from './pages/tracing/TracingPage';
import EvaluationPage from './pages/evaluation/EvaluationPage';
import WorkflowListPage from './pages/workflow/WorkflowList';
import WorkflowEditorPage from './pages/workflow/WorkflowEditor';
import KnowledgeBaseListPage from './pages/knowledge/KnowledgeBaseList';
import { ThemeProvider } from './theme';
import { useFloatingBridge } from './tauri/useFloatingBridge';

function App() {
  useFloatingBridge();

  return (
    <ThemeProvider>
      <ToastProvider />
      <Routes>
        {/* 公开路由 - 登录页 */}
        <Route path="/auth/login" element={<LoginPage />} />

        {/* 受保护的路由 */}
        <Route
          path="/*"
          element={
            <RouteGuard>
              <MainLayout>
                <Routes>
                  {/* 工作台 */}
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/conversation" element={<Conversation />} />
                  <Route path="/conversation/:id" element={<Conversation />} />

                  {/* 管理模块 */}
                  <Route path="/management/claws" element={<Navigate to="/management/agents" replace />} />
                  <Route path="/management/agents" element={<AgentListPage />} />
                  <Route path="/management/prompts" element={<PromptListPage />} />
                  <Route path="/management/skills" element={<SkillsListPage />} />
                  <Route path="/management/test-sets" element={<TestSetsListPage />} />
                  <Route path="/management/providers" element={<ProvidersListPage />} />
                  <Route path="/management/channels" element={<ChannelsListPage />} />

                  {/* 任务调度模块 */}
                  <Route path="/scheduler" element={<SchedulerPage />} />

                  {/* 监控模块 */}
                  <Route path="/analytics" element={<AnalyticsPage />} />
                  <Route path="/monitoring" element={<MonitoringPage />} />

                  {/* 组织模块 */}
                  <Route path="/organization/users" element={<UsersPage />} />
                  <Route path="/organization/departments" element={<DepartmentsPage />} />

                  {/* 系统模块 */}
                  <Route path="/system/resources" element={<ResourceManagementPage />} />
                  <Route path="/system/audit-logs" element={<AuditLogsPage />} />
                  <Route path="/system/settings" element={<SettingsPage />} />
                  <Route path="/system/insight" element={<InsightPage />} />
                  <Route path="/system/menu" element={<MenuManagementPage />} />
                  <Route path="/system/role" element={<RoleManagementPage />} />

                  {/* 个人中心 */}
                  <Route path="/profile" element={<ProfilePage />} />

                  {/* 追踪 */}
                  <Route path="/tracing" element={<TracingPage />} />

                  {/* 评估 */}
                  <Route path="/evaluation" element={<EvaluationPage />} />

                  {/* 工作流 */}
                  <Route path="/workflow" element={<WorkflowListPage />} />
                  <Route path="/workflow/editor/:id" element={<WorkflowEditorPage />} />

                  {/* 知识库 */}
                  <Route path="/knowledge" element={<KnowledgeBaseListPage />} />
                </Routes>
              </MainLayout>
            </RouteGuard>
          }
        />
      </Routes>
    </ThemeProvider>
  );
}

export default App;
