/**
 * 统一服务入口 - 自动根据配置切换 Mock/Real API
 *
 * 使用方式：
 * import { agentApi, conversationApi } from "@/services";
 *
 * // 自动根据 VITE_APP_ENABLE_MOCK 配置选择 mock 或真实 API
 * const agents = await agentApi.getAll();
 */

import { isMockEnabled } from "@/config";

// Mock 服务
import { agentApi as agentMockApi } from "./mock/agents";
import { conversationApi as conversationMockApi } from "./mock/conversations";
import authMockApi from "./mock/auth";
import { promptApi as promptMockApi } from "./mock/prompts";
import { skillApi as skillMockApi } from "./mock/skills";
import { testSetApi as testSetMockApi } from "./mock/testsets";
import { analyticsApi as analyticsMockApi } from "./mock/analytics";
import { monitoringApi as monitoringMockApi } from "./mock/monitoring";
import { organizationApi as organizationMockApi } from "./mock/organization";
import { workflowApi as workflowMockApi } from "./mock/workflows";
import { knowledgeApi as knowledgeMockApi } from "./mock/knowledge";
import { channelApi as channelMockApi, channelTypeConfig as mockChannelTypeConfig } from "./mock/channels";
import { providerApi as providerMockApi } from "./mock/providers";
import { roleApi as roleMockApi, menuApi as menuMockApi } from "./mock/system";
import { notificationApi as notificationMockApi } from "./mock/notification";
import { tracingApi as tracingMockApi } from "./mock/tracing";
import evaluationMockApi from "./mock/evaluation";
import { resourceApi as resourceMockApi, providerOptions as mockProviderOptions } from "./mock/resources";
import { auditLogApi as auditLogMockApi } from "./mock/auditLogs";
import { scheduledTaskApi as scheduledTaskMockApi } from "./mock/scheduledTasks";
import { skillHubApi as skillHubMockApi } from "./mock/skillHub";

// 真实 API 服务
import { agentRealApi } from "./real/agents";
import { conversationRealApi } from "./real/conversations";
import authRealApi from "./real/auth";
import { promptRealApi } from "./real/prompts";
import { skillRealApi } from "./real/skills";
import { skillHubRealApi } from "./real/skillHub";
import { testSetRealApi } from "./real/testsets";
import { analyticsRealApi } from "./real/analytics";
import { monitoringRealApi } from "./real/monitoring";
import { organizationRealApi } from "./real/organization";
import { workflowRealApi, nodeTypeConfig as realNodeTypeConfig } from "./real/workflows";
import { knowledgeRealApi } from "./real/knowledge";
import { channelRealApi, channelTypeConfig as realChannelTypeConfig } from "./real/channels";
import { providerRealApi } from "./real/providers";
import { roleRealApi, menuRealApi } from "./real/system";
import { notificationRealApi } from "./real/notification";
import { tracingRealApi } from "./real/tracing";
import evaluationRealApi from "./real/evaluation";
import { resourceRealApi, providerOptions as realProviderOptions } from "./real/resources";
import { auditLogRealApi } from "./real/auditLogs";
import { scheduledTaskRealApi } from "./real/scheduledTasks";
import { clawMockApi } from "./mock/claws";
import { clawRealApi } from "./real/claws";
import { permissionRealApi } from "./real/permissions";

/**
 * 创建动态代理服务
 * 每次调用时动态判断是否使用 mock
 */
function createProxyService<T extends object>(mockService: T, realService: T): T {
  return new Proxy(mockService, {
    get(_target, prop) {
      const service = isMockEnabled() ? mockService : realService;
      const value = service[prop as keyof T];
      if (typeof value === "function") {
        return value.bind(service);
      }
      return value;
    },
  }) as T;
}

// ==================== 导出服务 ====================

// Agent
export const agentApi = createProxyService(agentMockApi, agentRealApi);
export { mockAgents, mockAgentPermissions } from "./mock/agents";

// Conversation
export const conversationApi = createProxyService(conversationMockApi, conversationRealApi);
export { mockConversations } from "./mock/conversations";

// Auth
export const authApi = createProxyService(authMockApi, authRealApi as any);

// Prompts
export const promptApi = createProxyService(promptMockApi, promptRealApi as any);

// Skills
export const skillApi = createProxyService(skillMockApi, skillRealApi as any);
export const skillHubApi = createProxyService(skillHubMockApi, skillHubRealApi as any);

// TestSets
export const testSetApi = createProxyService(testSetMockApi, testSetRealApi as any);

// Analytics
export const analyticsApi = createProxyService(analyticsMockApi, analyticsRealApi as any);

// Monitoring
export const monitoringApi = createProxyService(monitoringMockApi, monitoringRealApi as any);

// Organization
export const organizationApi = createProxyService(organizationMockApi, organizationRealApi as any);

// Workflows
export const workflowApi = createProxyService(workflowMockApi, workflowRealApi as any);
// nodeTypeConfig 是 UI 常量，始终使用 real 版本
export const nodeTypeConfig = realNodeTypeConfig;

// Knowledge
export const knowledgeApi = createProxyService(knowledgeMockApi, knowledgeRealApi as any);

// Channels
export const channelApi = createProxyService(channelMockApi, channelRealApi as any);
export const channelTypeConfig = isMockEnabled() ? mockChannelTypeConfig : realChannelTypeConfig;

// Providers
export const providerApi = createProxyService(providerMockApi, providerRealApi as any);
export type { ExternalModel, ProviderModel } from "./real/providers";

// System
export const roleApi = createProxyService(roleMockApi, roleRealApi as any);
export const menuApi = createProxyService(menuMockApi, menuRealApi as any);

// Notification
export const notificationApi = createProxyService(notificationMockApi, notificationRealApi as any);
export { groupNotificationsByDate, getUnreadCount } from "./mock/notification";

// Tracing
export const tracingApi = createProxyService(tracingMockApi, tracingRealApi as any);

// Evaluation
export const evaluationApi = createProxyService(evaluationMockApi, evaluationRealApi as any);

// Resources
export const resourceApi = createProxyService(resourceMockApi, resourceRealApi as any);
export const providerOptions = isMockEnabled() ? mockProviderOptions : realProviderOptions;

// AuditLogs
export const auditLogApi = createProxyService(auditLogMockApi, auditLogRealApi as any);

// ScheduledTasks
export const scheduledTaskApi = createProxyService(scheduledTaskMockApi, scheduledTaskRealApi as any);

// Permissions
import { permissionApi as permissionMockApi } from "./mock/permissions";
export const permissionApi = createProxyService(permissionMockApi, permissionRealApi as any);

// Claws
export const clawApi = createProxyService(clawMockApi, clawRealApi);

// Octos — 工厂函数，不使用代理模式
export { createOctosApiClient } from "./real/octos";
export { octosMockApi } from "./mock/octos";
export { OCTOS_PROVIDER_CATALOG, OCTOS_PROVIDER_NAMES } from "./real/octosProviderCatalog";

// 导出 mock 数据和类型
export { mockPrompts, type Prompt, type PromptVariable, type PromptVersion, type VersionDiff } from "./mock/prompts";
export { mockSkills, type Skill, type SkillParameter } from "./mock/skills";
export { type TestSet, type TestCase, type TestReport, type TestSetFormData, type TestCaseFormData, type TestSetDetail, type TestCategory, type TestCategoryFormData, type Assertion, type AssertionType, type TestCaseStatus } from "../types/testset";
export { type AnalyticsFilter, type UsageStats, type DailyStats, type AgentStats, type UserStats, type HourlyDistribution } from "./mock/analytics";
export { type AgentStatus, type ActivityEvent, type SystemMetrics, type Alert } from "./mock/monitoring";
export { type Department, type User, type User as OrgUser } from "./mock/organization";
export { type AuditLog, type AuditAction } from "./mock/auditLogs";
export { mockPermissionTemplates } from "./mock/permissions";
export { defaultFeaturePermissions, featurePermissionDefinitions, type PermissionConfig, type PermissionTemplate, type PermissionAuditLog, type FeaturePermissions } from "./real/permissions";
export { type ScheduledTask, type TaskExecution, type TaskType, type TaskStatus, type ExecutionStatus, type TaskConfig, type TaskTypeDescriptor, taskTypeConfig, cronPresets, parseCronToText } from "./mock/scheduledTasks";
export { type ApiKey, type ApiKeyStatus, type ResourceQuota, type ResourceUsageStats, type QuotaLimits } from "./mock/resources";

// 重新导出 isMockEnabled 供外部使用
export { isMockEnabled };
