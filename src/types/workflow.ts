/**
 * Workflow 工作流类型定义
 */

/** 节点类型 */
export type NodeType =
  | 'start'        // 开始节点
  | 'end'          // 结束节点
  | 'agent'        // Agent 调用节点
  | 'prompt'       // 提示词节点
  | 'skill'        // Skill 调用节点
  | 'condition'    // 条件分支节点
  | 'loop'         // 循环节点
  | 'parallel'     // 并行执行节点
  | 'http_request' // HTTP 请求节点
  | 'transform'    // 数据转换节点
  | 'variable'     // 变量设置节点
  | 'delay'        // 延迟节点
  | 'webhook'      // Webhook 触发节点
  | 'schedule';    // 定时触发节点

/** 工作流状态 */
export type WorkflowStatus =
  | 'draft'        // 草稿
  | 'published'    // 已发布
  | 'archived';    // 已归档

/** 执行状态 */
export type ExecutionStatus =
  | 'pending'      // 等待中
  | 'running'      // 运行中
  | 'completed'    // 已完成
  | 'failed'       // 失败
  | 'cancelled';   // 已取消

/** 节点端口定义 */
export interface NodePort {
  id: string;
  name: string;
  type: 'input' | 'output';
  dataType: 'any' | 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description?: string;
}

/** 节点位置 */
export interface NodePosition {
  x: number;
  y: number;
}

/** 基础节点配置 */
export interface BaseNodeConfig {
  label: string;
  description?: string;
}

/** 开始节点配置 */
export interface StartNodeConfig extends BaseNodeConfig {
  inputs: {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    required: boolean;
    defaultValue?: unknown;
    description?: string;
  }[];
}

/** 结束节点配置 */
export interface EndNodeConfig extends BaseNodeConfig {
  outputs: {
    name: string;
    source: string; // 引用上游节点的输出
  }[];
}

/** Agent 节点配置 */
export interface AgentNodeConfig extends BaseNodeConfig {
  agentId: string;
  agentName?: string;
  inputMapping: {
    paramName: string;
    source: string; // 引用变量或上游节点输出
  }[];
  outputVariable?: string;
  timeout?: number;
  retryCount?: number;
}

/** 提示词节点配置 */
export interface PromptNodeConfig extends BaseNodeConfig {
  promptId: string;
  promptName?: string;
  variables: {
    name: string;
    source: string;
  }[];
  outputVariable?: string;
}

/** Skill 节点配置 */
export interface SkillNodeConfig extends BaseNodeConfig {
  skillId: string;
  skillName?: string;
  parameters: {
    name: string;
    source: string;
  }[];
  outputVariable?: string;
}

/** 条件分支配置 */
export interface ConditionBranch {
  id: string;
  label: string;
  expression: string; // 条件表达式
  priority: number;
}

/** 条件节点配置 */
export interface ConditionNodeConfig extends BaseNodeConfig {
  branches: ConditionBranch[];
  defaultBranch: string; // 默认分支 ID
}

/** 循环节点配置 */
export interface LoopNodeConfig extends BaseNodeConfig {
  iterateSource: string; // 迭代数据源
  itemVariable: string;  // 当前项变量名
  indexVariable?: string; // 索引变量名
  maxIterations?: number;
}

/** 并行节点配置 */
export interface ParallelNodeConfig extends BaseNodeConfig {
  branches: {
    id: string;
    label: string;
  }[];
  waitForAll: boolean; // 是否等待所有分支完成
  failFast: boolean;   // 任一失败是否立即终止
}

/** HTTP 请求节点配置 */
export interface HttpRequestNodeConfig extends BaseNodeConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: string;
  authentication?: {
    type: 'none' | 'bearer' | 'basic' | 'api_key';
    token?: string;
    username?: string;
    password?: string;
    apiKey?: string;
    apiKeyHeader?: string;
  };
  timeout?: number;
  outputVariable?: string;
  errorHandling?: {
    retryCount: number;
    retryDelay: number;
  };
}

/** 数据转换节点配置 */
export interface TransformNodeConfig extends BaseNodeConfig {
  inputSource: string;
  transformType: 'jsonpath' | 'jq' | 'javascript';
  expression: string;
  outputVariable?: string;
}

/** 变量节点配置 */
export interface VariableNodeConfig extends BaseNodeConfig {
  variables: {
    name: string;
    value: string;
    type: 'static' | 'expression';
  }[];
}

/** 延迟节点配置 */
export interface DelayNodeConfig extends BaseNodeConfig {
  duration: number; // 延迟时间（毫秒）
}

/** Webhook 触发节点配置 */
export interface WebhookTriggerNodeConfig extends BaseNodeConfig {
  path: string;
  method: 'GET' | 'POST';
  authentication?: {
    type: 'none' | 'bearer' | 'api_key';
    token?: string;
    apiKey?: string;
    apiKeyHeader?: string;
  };
  responseTemplate?: string;
}

/** 定时触发节点配置 */
export interface ScheduleTriggerNodeConfig extends BaseNodeConfig {
  cron: string;
  timezone?: string;
  enabled: boolean;
}

/** 节点配置联合类型 */
export type NodeConfig =
  | { type: 'start'; config: StartNodeConfig }
  | { type: 'end'; config: EndNodeConfig }
  | { type: 'agent'; config: AgentNodeConfig }
  | { type: 'prompt'; config: PromptNodeConfig }
  | { type: 'skill'; config: SkillNodeConfig }
  | { type: 'condition'; config: ConditionNodeConfig }
  | { type: 'loop'; config: LoopNodeConfig }
  | { type: 'parallel'; config: ParallelNodeConfig }
  | { type: 'http_request'; config: HttpRequestNodeConfig }
  | { type: 'transform'; config: TransformNodeConfig }
  | { type: 'variable'; config: VariableNodeConfig }
  | { type: 'delay'; config: DelayNodeConfig }
  | { type: 'webhook'; config: WebhookTriggerNodeConfig }
  | { type: 'schedule'; config: ScheduleTriggerNodeConfig };

/** 工作流节点 */
export interface WorkflowNode {
  id: string;
  type: NodeType;
  position: NodePosition;
  config: NodeConfig;
  ports?: {
    inputs: NodePort[];
    outputs: NodePort[];
  };
}

/** 工作流边（连接） */
export interface WorkflowEdge {
  id: string;
  sourceNodeId: string;
  sourcePortId?: string;
  targetNodeId: string;
  targetPortId?: string;
  label?: string;
  condition?: string; // 条件表达式（用于条件分支）
}

/** 工作流变量 */
export interface WorkflowVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  scope: 'global' | 'local';
  defaultValue?: unknown;
  description?: string;
}

/** 触发器配置 */
export interface WorkflowTrigger {
  type: 'manual' | 'webhook' | 'schedule' | 'event';
  config: WebhookTriggerNodeConfig | ScheduleTriggerNodeConfig | Record<string, unknown>;
  enabled: boolean;
}

/** 工作流定义 */
export interface Workflow {
  id: string;
  name: string;
  description?: string;
  status: WorkflowStatus;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables: WorkflowVariable[];
  triggers: WorkflowTrigger[];
  settings: {
    timeout?: number;
    retryPolicy?: {
      maxRetries: number;
      retryDelay: number;
    };
    errorHandling?: {
      onFailure: 'stop' | 'continue' | 'notify';
      notificationChannel?: string;
    };
  };
  version: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  publishedAt?: Date;
}

/** 工作流版本 */
export interface WorkflowVersion {
  id: string;
  workflowId: string;
  version: number;
  snapshot: Omit<Workflow, 'id' | 'version' | 'createdAt' | 'updatedAt'>;
  createdAt: Date;
  createdBy?: string;
  changelog?: string;
}

/** 节点执行记录 */
export interface NodeExecution {
  id: string;
  executionId: string;
  nodeId: string;
  status: ExecutionStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  retryCount?: number;
}

/** 工作流执行实例 */
export interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflowVersion: number;
  status: ExecutionStatus;
  trigger: {
    type: 'manual' | 'webhook' | 'schedule' | 'event';
    userId?: string;
    payload?: Record<string, unknown>;
  };
  variables: Record<string, unknown>;
  nodeExecutions: NodeExecution[];
  startTime: Date;
  endTime?: Date;
  duration?: number;
  error?: string;
}

/** 节点类型信息 */
export interface NodeTypeInfo {
  type: NodeType;
  name: string;
  icon: string;
  category: 'trigger' | 'action' | 'logic' | 'transform';
  description: string;
  color: string;
}

/** 工作流统计信息 */
export interface WorkflowStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  avgDuration: number;
  lastExecutionAt?: Date;
}
