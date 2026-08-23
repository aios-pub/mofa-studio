/**
 * Workflow type definitions
 */

/** Node type */
export type NodeType =
  | 'start'        // Start node
  | 'end'          // End node
  | 'agent'        // Agent call node
  | 'prompt'       // Prompt node
  | 'skill'        // Skill call node
  | 'condition'    // Condition branch node
  | 'loop'         // Loop node
  | 'parallel'     // Parallel execution node
  | 'http_request' // HTTP request node
  | 'transform'    // Data transform node
  | 'variable'     // Variable node
  | 'delay'        // Delay node
  | 'webhook'      // Webhook trigger node
  | 'schedule';    // Scheduled trigger node

/** Workflow status */
export type WorkflowStatus =
  | 'draft'        // Draft
  | 'published'    // published
  | 'archived';    // Archived

/** Execution status */
export type ExecutionStatus =
  | 'pending'      // Pending
  | 'running'      // Running
  | 'completed'    // Completed
  | 'failed'       // Failed
  | 'cancelled';   // cancelled

/** Node port definition */
export interface NodePort {
  id: string;
  name: string;
  type: 'input' | 'output';
  dataType: 'any' | 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description?: string;
}

/** Node position */
export interface NodePosition {
  x: number;
  y: number;
}

/** Base node configuration */
export interface BaseNodeConfig {
  label: string;
  description?: string;
}

/** Start node configuration */
export interface StartNodeConfig extends BaseNodeConfig {
  inputs: {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    required: boolean;
    defaultValue?: unknown;
    description?: string;
  }[];
}

/** End node configuration */
export interface EndNodeConfig extends BaseNodeConfig {
  outputs: {
    name: string;
    source: string; // Reference upstream node output
  }[];
}

/** Agent node configuration */
export interface AgentNodeConfig extends BaseNodeConfig {
  agentId: string;
  agentName?: string;
  inputMapping: {
    paramName: string;
    source: string; // Reference variable or upstream node output
  }[];
  outputVariable?: string;
  timeout?: number;
  retryCount?: number;
}

/** Prompt node configuration */
export interface PromptNodeConfig extends BaseNodeConfig {
  promptId: string;
  promptName?: string;
  variables: {
    name: string;
    source: string;
  }[];
  outputVariable?: string;
}

/** Skill node configuration */
export interface SkillNodeConfig extends BaseNodeConfig {
  skillId: string;
  skillName?: string;
  parameters: {
    name: string;
    source: string;
  }[];
  outputVariable?: string;
}

/** Condition branch configuration */
export interface ConditionBranch {
  id: string;
  label: string;
  expression: string; // Condition expression
  priority: number;
}

/** Condition node configuration */
export interface ConditionNodeConfig extends BaseNodeConfig {
  branches: ConditionBranch[];
  defaultBranch: string; // Default branch ID
}

/** Loop node configuration */
export interface LoopNodeConfig extends BaseNodeConfig {
  iterateSource: string; // Iteration data source
  itemVariable: string;  // Current item variable name
  indexVariable?: string; // Index variable name
  maxIterations?: number;
}

/** Parallel node configuration */
export interface ParallelNodeConfig extends BaseNodeConfig {
  branches: {
    id: string;
    label: string;
  }[];
  waitForAll: boolean; // Whether to wait for all branches
  failFast: boolean;   // Terminate immediately on any failure
}

/** HTTP request node configuration */
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

/** Data transform node configuration */
export interface TransformNodeConfig extends BaseNodeConfig {
  inputSource: string;
  transformType: 'jsonpath' | 'jq' | 'javascript';
  expression: string;
  outputVariable?: string;
}

/** Variable node configuration */
export interface VariableNodeConfig extends BaseNodeConfig {
  variables: {
    name: string;
    value: string;
    type: 'static' | 'expression';
  }[];
}

/** Delay node config */
export interface DelayNodeConfig extends BaseNodeConfig {
  duration: number; // delay in milliseconds
}

/** Webhook trigger node config */
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

/** Scheduled trigger node config */
export interface ScheduleTriggerNodeConfig extends BaseNodeConfig {
  cron: string;
  timezone?: string;
  enabled: boolean;
}

/** Node config union type */
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

/** Workflow node */
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

/** Workflow edge (connection) */
export interface WorkflowEdge {
  id: string;
  sourceNodeId: string;
  sourcePortId?: string;
  targetNodeId: string;
  targetPortId?: string;
  label?: string;
  condition?: string; // condition expression (for condition branches)
}

/** Workflow variables */
export interface WorkflowVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  scope: 'global' | 'local';
  defaultValue?: unknown;
  description?: string;
}

/** Trigger configuration */
export interface WorkflowTrigger {
  type: 'manual' | 'webhook' | 'schedule' | 'event';
  config: WebhookTriggerNodeConfig | ScheduleTriggerNodeConfig | Record<string, unknown>;
  enabled: boolean;
}

/** Workflow definition */
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

/** Workflow version */
export interface WorkflowVersion {
  id: string;
  workflowId: string;
  version: number;
  snapshot: Omit<Workflow, 'id' | 'version' | 'createdAt' | 'updatedAt'>;
  createdAt: Date;
  createdBy?: string;
  changelog?: string;
}

/** Node execution record */
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

/** Workflow execution instance */
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

/** Node type info */
export interface NodeTypeInfo {
  type: NodeType;
  name: string;
  icon: string;
  category: 'trigger' | 'action' | 'logic' | 'transform';
  description: string;
  color: string;
}

/** Workflow statistics */
export interface WorkflowStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  avgDuration: number;
  lastExecutionAt?: Date;
}
