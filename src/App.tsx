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
import KeyWizard from './components/onboarding/KeyWizard';
import GalleryPage from './pages/gallery/GalleryPage';
import FlowCanvasPage from './pages/flow/FlowCanvasPage';
import UsagePage from './pages/system/UsagePage';
import InspirationPage from './pages/inspiration/InspirationPage';
import ImageHistoryPage from './pages/creation/ImageHistoryPage';
import VideoGenPage from './pages/creation/VideoGenPage';
import PptGenPage from './pages/creation/PptGenPage';
import SheetsPage from './pages/creation/SheetsPage';
import MediaPage from './pages/creation/MediaPage';
import ResearchPage from './pages/creation/ResearchPage';
import StoragePage from './pages/system/StoragePage';
import MemoryPage from './pages/system/MemoryPage';
import ProjectsPage from './pages/task/ProjectsPage';
import DeliverablesPage from './pages/task/DeliverablesPage';
import TranscriptionPage from './pages/creation/TranscriptionPage';
import PodcastPage from './pages/creation/PodcastPage';
import { ThemeProvider } from './theme';
import { useFloatingBridge } from './tauri/useFloatingBridge';
import { useSettings } from './stores';

function App() {
  useFloatingBridge();
  const expertMode = useSettings().expertMode;

  return (
    <ThemeProvider>
      <ToastProvider />
      <Routes>
        {/* Public route - Login page */}
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/onboarding/key" element={<KeyWizard onDone={() => window.history.back()} />} />

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
                  <Route path="/creation/history" element={<ImageHistoryPage />} />
                  <Route path="/creation/video-gen" element={<VideoGenPage />} />
                  <Route path="/creation/ppt" element={<PptGenPage />} />
                  <Route path="/creation/sheets" element={<SheetsPage />} />
                  <Route path="/creation/media" element={<MediaPage />} />
                  <Route path="/creation/research" element={<ResearchPage />} />
                  <Route path="/creation/transcription" element={<TranscriptionPage />} />
                  <Route path="/creation/podcast" element={<PodcastPage />} />
                  <Route path="/storage" element={<StoragePage />} />
                  <Route path="/memory" element={<MemoryPage />} />
                  <Route path="/projects" element={<ProjectsPage />} />
                  <Route path="/deliverables" element={<DeliverablesPage />} />
                  <Route path="/gallery" element={<GalleryPage />} />
                  <Route path="/flow" element={<FlowCanvasPage />} />
                  <Route path="/usage" element={<UsagePage />} />
                  <Route path="/inspiration" element={<InspirationPage />} />

                  {/* Workbench */}
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/conversation" element={<Conversation />} />
                  <Route path="/conversation/:id" element={<Conversation />} />

                  {/* Management module */}
                  <Route path="/management/claws" element={<Navigate to="/management/agents" replace />} />
                  <Route path="/management/prompts" element={<PromptListPage />} />
                  <Route path="/management/skills" element={<SkillsListPage />} />
                  <Route path="/management/skills/hub/:namespace/:slug" element={<HubSkillDetail />} />
                  <Route path="/management/providers" element={<ProvidersListPage />} />

                  {/* Task scheduling module */}
                  <Route path="/scheduler" element={<SchedulerPage />} />

                  {/* Monitoring module */}

                  {/* Organization module */}

                  {/* System module */}

                  {/* Personal center */}
                  <Route path="/profile" element={<ProfilePage />} />

                  {/* Tracing */}

                  {/* Evaluation */}

                  {/* Workflow */}
                  <Route path="/workflow" element={<WorkflowListPage />} />
                  <Route path="/workflow/editor/:id" element={<WorkflowEditorPage />} />

                  {/* Knowledge base */}
                  <Route path="/knowledge" element={<KnowledgeBaseListPage />} />

                  {/* PLAT-14: B-end modules live under /expert/*, reachable
                      only with expert mode enabled. Legacy paths redirect. */}
                  {expertMode && (
                    <>
                      <Route path="/expert/management/agents" element={<AgentListPage />} />
                      <Route path="/expert/management/test-sets" element={<TestSetsListPage />} />
                      <Route path="/expert/management/test-sets/:testSetId/docs" element={<InteractiveDocs />} />
                      <Route path="/expert/management/load-test" element={<LoadTestPage />} />
                      <Route path="/expert/management/channels" element={<ChannelsListPage />} />
                      <Route path="/expert/system/resources" element={<ResourceManagementPage />} />
                      <Route path="/expert/system/audit-logs" element={<AuditLogsPage />} />
                      <Route path="/expert/system/insight" element={<InsightPage />} />
                      <Route path="/expert/system/menu" element={<MenuManagementPage />} />
                      <Route path="/expert/system/role" element={<RoleManagementPage />} />
                      <Route path="/expert/system/settings" element={<SettingsPage />} />
                      <Route path="/expert/analytics" element={<AnalyticsPage />} />
                      <Route path="/expert/monitoring" element={<MonitoringPage />} />
                      <Route path="/expert/tracing" element={<TracingPage />} />
                      <Route path="/expert/evaluation" element={<EvaluationPage />} />
                      <Route path="/expert/organization/users" element={<UsersPage />} />
                      <Route path="/expert/organization/departments" element={<DepartmentsPage />} />
                      {/* Legacy deep links keep working when expert mode is on */}
                      <Route path="/management/agents" element={<Navigate to="/expert/management/agents" replace />} />
                      <Route path="/organization/:rest*" element={<Navigate to="/expert/organization/users" replace />} />
                      <Route path="/system/:rest*" element={<Navigate to="/expert/system/settings" replace />} />
                      <Route path="/analytics" element={<Navigate to="/expert/analytics" replace />} />
                      <Route path="/monitoring" element={<Navigate to="/expert/monitoring" replace />} />
                      <Route path="/tracing" element={<Navigate to="/expert/tracing" replace />} />
                      <Route path="/evaluation" element={<Navigate to="/expert/evaluation" replace />} />
                    </>
                  )}
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
