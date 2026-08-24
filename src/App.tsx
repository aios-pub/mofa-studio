import { Routes, Route, Navigate } from 'react-router-dom';
import './i18n'; // Initialize i18n
import MainLayout from './components/layout/MainLayout';
import { RouteGuard } from './components/auth';
import { ToastProvider } from './components/common';
import Dashboard from './pages/workbench/Dashboard';
import Conversation from './pages/workbench/Conversation';
import { AgentListPage, PromptListPage, SkillsListPage, TestSetsListPage, ProvidersListPage, ChannelsListPage } from './pages/management';
import LoadTestPage from './pages/management/LoadTestPage';
import { HubSkillDetail } from './pages/management/skills';
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
import { InteractiveDocs } from './pages/docs/InteractiveDocs';
import ImageGenPage from './pages/creation/ImageGenPage';
import WritingPage from './pages/creation/WritingPage';
import { ThemeProvider } from './theme';
import { useFloatingBridge } from './tauri/useFloatingBridge';

function App() {
  useFloatingBridge();

  return (
    <ThemeProvider>
      <ToastProvider />
      <Routes>
        {/* Public route - Login page */}
        <Route path="/auth/login" element={<LoginPage />} />

        {/* Protected route */}
        <Route
          path="/*"
          element={
            <RouteGuard>
              <MainLayout>
                <Routes>
                  {/* Creation toolbox (创作工坊) */}
                  <Route path="/creation/image-gen" element={<ImageGenPage />} />
                  <Route path="/creation/writing" element={<WritingPage />} />

                  {/* Workbench */}
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/conversation" element={<Conversation />} />
                  <Route path="/conversation/:id" element={<Conversation />} />

                  {/* Management module */}
                  <Route path="/management/claws" element={<Navigate to="/management/agents" replace />} />
                  <Route path="/management/agents" element={<AgentListPage />} />
                  <Route path="/management/prompts" element={<PromptListPage />} />
                  <Route path="/management/skills" element={<SkillsListPage />} />
                  <Route path="/management/skills/hub/:namespace/:slug" element={<HubSkillDetail />} />
                  <Route path="/management/test-sets" element={<TestSetsListPage />} />
                  <Route path="/management/test-sets/:testSetId/docs" element={<InteractiveDocs />} />
                  <Route path="/management/load-test" element={<LoadTestPage />} />
                  <Route path="/management/providers" element={<ProvidersListPage />} />
                  <Route path="/management/channels" element={<ChannelsListPage />} />

                  {/* Task scheduling module */}
                  <Route path="/scheduler" element={<SchedulerPage />} />

                  {/* Monitoring module */}
                  <Route path="/analytics" element={<AnalyticsPage />} />
                  <Route path="/monitoring" element={<MonitoringPage />} />

                  {/* Organization module */}
                  <Route path="/organization/users" element={<UsersPage />} />
                  <Route path="/organization/departments" element={<DepartmentsPage />} />

                  {/* System module */}
                  <Route path="/system/resources" element={<ResourceManagementPage />} />
                  <Route path="/system/audit-logs" element={<AuditLogsPage />} />
                  <Route path="/system/settings" element={<SettingsPage />} />
                  <Route path="/system/insight" element={<InsightPage />} />
                  <Route path="/system/menu" element={<MenuManagementPage />} />
                  <Route path="/system/role" element={<RoleManagementPage />} />

                  {/* Personal center */}
                  <Route path="/profile" element={<ProfilePage />} />

                  {/* Tracing */}
                  <Route path="/tracing" element={<TracingPage />} />

                  {/* Evaluation */}
                  <Route path="/evaluation" element={<EvaluationPage />} />

                  {/* Workflow */}
                  <Route path="/workflow" element={<WorkflowListPage />} />
                  <Route path="/workflow/editor/:id" element={<WorkflowEditorPage />} />

                  {/* Knowledge base */}
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
