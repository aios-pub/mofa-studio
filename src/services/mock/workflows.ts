/**
 * Workflow mock data
 */

import type {
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  WorkflowVersion,
  WorkflowExecution,
  WorkflowStats,
  NodeType,
  ExecutionStatus,
} from '../../types/workflow';

// Node type configuration
export const nodeTypeConfig: Record<NodeType, { name: string; icon: string; category: string; description: string; color: string }> = {
  start: { name: '开始', icon: '▶️', category: 'trigger', description: '工作流开始节点', color: '#52c41a' },
  end: { name: '结束', icon: '⏹️', category: 'trigger', description: '工作流结束节点', color: '#ff4d4f' },
  agent: { name: 'Agent', icon: '🤖', category: 'action', description: '调用 Agent 执行任务', color: '#1890ff' },
  prompt: { name: '提示词', icon: '📝', category: 'action', description: '应用提示词模板', color: '#722ed1' },
  skill: { name: 'Skill', icon: '⚡', category: 'action', description: '调用 Skill 技能', color: '#fa8c16' },
  condition: { name: '条件', icon: '🔀', category: 'logic', description: '条件分支判断', color: '#13c2c2' },
  loop: { name: '循环', icon: '🔄', category: 'logic', description: '循环节点', color: '#eb2f96' },
  parallel: { name: '并行', icon: '⚡', category: 'logic', description: '并行执行', color: '#faad14' },
  http_request: { name: 'HTTP 请求', icon: '🌐', category: 'action', description: '发送 HTTP 请求', color: '#2f54eb' },
  transform: { name: '数据转换', icon: '🔧', category: 'transform', description: '转换数据格式', color: '#a0d911' },
  variable: { name: '变量', icon: '📦', category: 'transform', description: '设置变量值', color: '#b37feb' },
  delay: { name: '延迟', icon: '⏱️', category: 'logic', description: '延迟执行', color: '#ffc53d' },
  webhook: { name: 'Webhook', icon: '🔗', category: 'trigger', description: 'Webhook 触发', color: '#36cfc9' },
  schedule: { name: '定时', icon: '📅', category: 'trigger', description: '定时触发', color: '#ff7a45' },
};

// Status colors
export const executionStatusConfig: Record<ExecutionStatus, { color: string; text: string }> = {
  pending: { color: 'default', text: '等待中' },
  running: { color: 'blue', text: '运行中' },
  completed: { color: 'green', text: '已完成' },
  failed: { color: 'red', text: '失败' },
  cancelled: { color: 'default', text: '已取消' },
};

// Create sample nodes
const createSampleNodes = (): WorkflowNode[] => [
  {
    id: 'node-start',
    type: 'start',
    position: { x: 100, y: 200 },
    config: {
      type: 'start',
      config: {
        label: '开始',
        inputs: [
          { name: 'query', type: 'string', required: true, description: '用户查询' },
          { name: 'userId', type: 'string', required: false, description: '用户ID' },
        ],
      },
    },
    ports: {
      inputs: [],
      outputs: [
        { id: 'out-1', name: 'output', type: 'output', dataType: 'object', required: true },
      ],
    },
  },
  {
    id: 'node-agent-1',
    type: 'agent',
    position: { x: 350, y: 200 },
    config: {
      type: 'agent',
      config: {
        label: 'AI 助手',
        agentId: 'agent-1',
        agentName: '通用助手',
        inputMapping: [
          { paramName: 'query', source: '$start.query' },
        ],
        outputVariable: 'agentResult',
        timeout: 60000,
        retryCount: 2,
      },
    },
    ports: {
      inputs: [
        { id: 'in-1', name: 'input', type: 'input', dataType: 'object', required: true },
      ],
      outputs: [
        { id: 'out-1', name: 'output', type: 'output', dataType: 'object', required: true },
      ],
    },
  },
  {
    id: 'node-condition-1',
    type: 'condition',
    position: { x: 600, y: 200 },
    config: {
      type: 'condition',
      config: {
        label: '结果判断',
        branches: [
          { id: 'branch-yes', label: '成功', expression: '$agentResult.success === true', priority: 1 },
          { id: 'branch-no', label: '失败', expression: '$agentResult.success === false', priority: 2 },
        ],
        defaultBranch: 'branch-no',
      },
    },
    ports: {
      inputs: [
        { id: 'in-1', name: 'input', type: 'input', dataType: 'object', required: true },
      ],
      outputs: [
        { id: 'out-yes', name: 'success', type: 'output', dataType: 'any', required: false },
        { id: 'out-no', name: 'failure', type: 'output', dataType: 'any', required: false },
      ],
    },
  },
  {
    id: 'node-end-success',
    type: 'end',
    position: { x: 850, y: 100 },
    config: {
      type: 'end',
      config: {
        label: '成功结束',
        outputs: [
          { name: 'result', source: '$agentResult' },
        ],
      },
    },
    ports: {
      inputs: [
        { id: 'in-1', name: 'input', type: 'input', dataType: 'any', required: true },
      ],
      outputs: [],
    },
  },
  {
    id: 'node-end-failure',
    type: 'end',
    position: { x: 850, y: 300 },
    config: {
      type: 'end',
      config: {
        label: '失败结束',
        outputs: [
          { name: 'error', source: '$agentResult.error' },
        ],
      },
    },
    ports: {
      inputs: [
        { id: 'in-1', name: 'input', type: 'input', dataType: 'any', required: true },
      ],
      outputs: [],
    },
  },
];

// Create sample edges
const createSampleEdges = (): WorkflowEdge[] => [
  { id: 'edge-1', sourceNodeId: 'node-start', targetNodeId: 'node-agent-1' },
  { id: 'edge-2', sourceNodeId: 'node-agent-1', targetNodeId: 'node-condition-1' },
  { id: 'edge-3', sourceNodeId: 'node-condition-1', sourcePortId: 'out-yes', targetNodeId: 'node-end-success', label: '成功' },
  { id: 'edge-4', sourceNodeId: 'node-condition-1', sourcePortId: 'out-no', targetNodeId: 'node-end-failure', label: '失败' },
];

// Mock workflow data
export const mockWorkflows: Workflow[] = [
  {
    id: 'workflow-1',
    name: '客服问答流程',
    description: '智能客服自动问答工作流，支持多轮对话和知识检索',
    status: 'published',
    nodes: createSampleNodes(),
    edges: createSampleEdges(),
    variables: [
      { name: 'query', type: 'string', scope: 'global', description: '用户查询' },
      { name: 'agentResult', type: 'object', scope: 'local', description: 'Agent 执行结果' },
    ],
    triggers: [
      { type: 'manual', config: {}, enabled: true },
      { type: 'webhook', config: { type: 'webhook', config: { path: '/api/workflow/customer-service', method: 'POST' } }, enabled: true },
    ],
    settings: {
      timeout: 300000,
      retryPolicy: { maxRetries: 2, retryDelay: 1000 },
      errorHandling: { onFailure: 'notify', notificationChannel: 'email' },
    },
    version: 3,
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-03-14'),
    publishedAt: new Date('2026-03-10'),
  },
  {
    id: 'workflow-2',
    name: '数据分析流程',
    description: '自动化数据分析和报告生成工作流',
    status: 'published',
    nodes: [
      { id: 'node-start', type: 'start', position: { x: 100, y: 200 }, config: { type: 'start', config: { label: '开始', inputs: [] } } },
      { id: 'node-agent', type: 'agent', position: { x: 300, y: 200 }, config: { type: 'agent', config: { label: '数据分析', agentId: 'agent-4', inputMapping: [] } } },
      { id: 'node-transform', type: 'transform', position: { x: 500, y: 200 }, config: { type: 'transform', config: { label: '格式转换', inputSource: '', transformType: 'javascript', expression: '' } } },
      { id: 'node-end', type: 'end', position: { x: 700, y: 200 }, config: { type: 'end', config: { label: '结束', outputs: [] } } },
    ],
    edges: [
      { id: 'e1', sourceNodeId: 'node-start', targetNodeId: 'node-agent' },
      { id: 'e2', sourceNodeId: 'node-agent', targetNodeId: 'node-transform' },
      { id: 'e3', sourceNodeId: 'node-transform', targetNodeId: 'node-end' },
    ],
    variables: [],
    triggers: [{ type: 'schedule', config: { type: 'schedule', config: { cron: '0 9 * * *', enabled: true } }, enabled: true }],
    settings: { timeout: 600000 },
    version: 1,
    createdAt: new Date('2026-02-20'),
    updatedAt: new Date('2026-03-12'),
  },
  {
    id: 'workflow-3',
    name: '内容审核流程',
    description: '自动化内容审核和处理流程',
    status: 'draft',
    nodes: [
      { id: 'node-start', type: 'start', position: { x: 100, y: 200 }, config: { type: 'start', config: { label: '开始', inputs: [] } } },
      { id: 'node-condition', type: 'condition', position: { x: 300, y: 200 }, config: { type: 'condition', config: { label: '审核判断', branches: [], defaultBranch: '' } } },
      { id: 'node-end', type: 'end', position: { x: 500, y: 200 }, config: { type: 'end', config: { label: '结束', outputs: [] } } },
    ],
    edges: [
      { id: 'e1', sourceNodeId: 'node-start', targetNodeId: 'node-condition' },
      { id: 'e2', sourceNodeId: 'node-condition', targetNodeId: 'node-end' },
    ],
    variables: [],
    triggers: [],
    settings: {},
    version: 1,
    createdAt: new Date('2026-03-01'),
    updatedAt: new Date('2026-03-14'),
  },
  {
    id: 'workflow-4',
    name: '多 Agent 协作流程',
    description: '多个 Agent 协作完成复杂任务的流程',
    status: 'draft',
    nodes: [
      { id: 'node-start', type: 'start', position: { x: 100, y: 200 }, config: { type: 'start', config: { label: '开始', inputs: [] } } },
      { id: 'node-parallel', type: 'parallel', position: { x: 300, y: 200 }, config: { type: 'parallel', config: { label: '并行处理', branches: [], waitForAll: true, failFast: false } } },
      { id: 'node-end', type: 'end', position: { x: 500, y: 200 }, config: { type: 'end', config: { label: '结束', outputs: [] } } },
    ],
    edges: [
      { id: 'e1', sourceNodeId: 'node-start', targetNodeId: 'node-parallel' },
      { id: 'e2', sourceNodeId: 'node-parallel', targetNodeId: 'node-end' },
    ],
    variables: [],
    triggers: [],
    settings: {},
    version: 1,
    createdAt: new Date('2026-03-10'),
    updatedAt: new Date('2026-03-14'),
  },
];

// Mock execution records
export const mockExecutions: WorkflowExecution[] = [
  {
    id: 'exec-1',
    workflowId: 'workflow-1',
    workflowVersion: 3,
    status: 'completed',
    trigger: { type: 'manual', userId: 'user-1' },
    variables: { query: '今天天气怎么样' },
    nodeExecutions: [
      { id: 'ne-1', executionId: 'exec-1', nodeId: 'node-start', status: 'completed', startTime: new Date('2026-03-14T10:00:00'), endTime: new Date('2026-03-14T10:00:00'), duration: 5 },
      { id: 'ne-2', executionId: 'exec-1', nodeId: 'node-agent-1', status: 'completed', startTime: new Date('2026-03-14T10:00:00'), endTime: new Date('2026-03-14T10:00:02'), duration: 2000, input: { query: '今天天气怎么样' }, output: { response: '抱歉，我无法获取实时天气信息...' } },
      { id: 'ne-3', executionId: 'exec-1', nodeId: 'node-condition-1', status: 'completed', startTime: new Date('2026-03-14T10:00:02'), endTime: new Date('2026-03-14T10:00:02'), duration: 10 },
      { id: 'ne-4', executionId: 'exec-1', nodeId: 'node-end-success', status: 'completed', startTime: new Date('2026-03-14T10:00:02'), endTime: new Date('2026-03-14T10:00:02'), duration: 2 },
    ],
    startTime: new Date('2026-03-14T10:00:00'),
    endTime: new Date('2026-03-14T10:00:02'),
    duration: 2017,
  },
  {
    id: 'exec-2',
    workflowId: 'workflow-1',
    workflowVersion: 3,
    status: 'completed',
    trigger: { type: 'webhook', payload: { query: '翻译 hello' } },
    variables: { query: '翻译 hello' },
    nodeExecutions: [
      { id: 'ne-5', executionId: 'exec-2', nodeId: 'node-start', status: 'completed', startTime: new Date('2026-03-14T10:05:00'), endTime: new Date('2026-03-14T10:05:00'), duration: 3 },
      { id: 'ne-6', executionId: 'exec-2', nodeId: 'node-agent-1', status: 'completed', startTime: new Date('2026-03-14T10:05:00'), endTime: new Date('2026-03-14T10:05:01'), duration: 1500 },
      { id: 'ne-7', executionId: 'exec-2', nodeId: 'node-condition-1', status: 'completed', startTime: new Date('2026-03-14T10:05:01'), endTime: new Date('2026-03-14T10:05:01'), duration: 8 },
      { id: 'ne-8', executionId: 'exec-2', nodeId: 'node-end-success', status: 'completed', startTime: new Date('2026-03-14T10:05:01'), endTime: new Date('2026-03-14T10:05:01'), duration: 2 },
    ],
    startTime: new Date('2026-03-14T10:05:00'),
    endTime: new Date('2026-03-14T10:05:01'),
    duration: 1513,
  },
  {
    id: 'exec-3',
    workflowId: 'workflow-1',
    workflowVersion: 3,
    status: 'failed',
    trigger: { type: 'manual', userId: 'user-2' },
    variables: { query: '测试错误' },
    nodeExecutions: [
      { id: 'ne-9', executionId: 'exec-3', nodeId: 'node-start', status: 'completed', startTime: new Date('2026-03-14T10:10:00'), endTime: new Date('2026-03-14T10:10:00'), duration: 4 },
      { id: 'ne-10', executionId: 'exec-3', nodeId: 'node-agent-1', status: 'failed', startTime: new Date('2026-03-14T10:10:00'), endTime: new Date('2026-03-14T10:10:05'), duration: 5000, error: 'Agent 执行超时' },
    ],
    startTime: new Date('2026-03-14T10:10:00'),
    endTime: new Date('2026-03-14T10:10:05'),
    duration: 5004,
    error: 'Agent 执行超时',
  },
];

// Mock version history
export const mockVersions: WorkflowVersion[] = [
  {
    id: 'version-1',
    workflowId: 'workflow-1',
    version: 1,
    snapshot: { name: '客服问答流程', description: '初始版本', status: 'draft', nodes: [], edges: [], variables: [], triggers: [], settings: {} },
    createdAt: new Date('2026-01-15'),
    changelog: '创建工作流',
  },
  {
    id: 'version-2',
    workflowId: 'workflow-1',
    version: 2,
    snapshot: { name: '客服问答流程', description: '添加条件分支', status: 'draft', nodes: [], edges: [], variables: [], triggers: [], settings: {} },
    createdAt: new Date('2026-02-01'),
    changelog: '添加条件分支节点',
  },
  {
    id: 'version-3',
    workflowId: 'workflow-1',
    version: 3,
    snapshot: { name: '客服问答流程', description: '优化流程', status: 'published', nodes: [], edges: [], variables: [], triggers: [], settings: {} },
    createdAt: new Date('2026-03-10'),
    changelog: '发布正式版本',
  },
];

// Mock API latency
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Workflow API Mock
export const workflowApi = {
  // Get all workflows
  async getAll(): Promise<Workflow[]> {
    await delay(300);
    return mockWorkflows;
  },

  // Get a single workflow
  async getById(id: string): Promise<Workflow | undefined> {
    await delay(200);
    return mockWorkflows.find((w) => w.id === id);
  },

  // Create workflow
  async create(data: Partial<Workflow>): Promise<Workflow> {
    await delay(500);
    const newWorkflow: Workflow = {
      id: `workflow-${Date.now()}`,
      name: data.name || '新工作流',
      description: data.description || '',
      status: 'draft',
      nodes: data.nodes || [],
      edges: data.edges || [],
      variables: data.variables || [],
      triggers: data.triggers || [],
      settings: data.settings || {},
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockWorkflows.push(newWorkflow);
    return newWorkflow;
  },

  // Update workflow
  async update(id: string, data: Partial<Workflow>): Promise<Workflow | undefined> {
    await delay(300);
    const index = mockWorkflows.findIndex((w) => w.id === id);
    if (index === -1) return undefined;
    mockWorkflows[index] = { ...mockWorkflows[index], ...data, updatedAt: new Date() };
    return mockWorkflows[index];
  },

  // Delete workflow
  async delete(id: string): Promise<boolean> {
    await delay(300);
    const index = mockWorkflows.findIndex((w) => w.id === id);
    if (index === -1) return false;
    mockWorkflows.splice(index, 1);
    return true;
  },

  // Copy workflow
  async duplicate(id: string): Promise<Workflow | undefined> {
    await delay(500);
    const workflow = mockWorkflows.find((w) => w.id === id);
    if (!workflow) return undefined;
    const newWorkflow: Workflow = {
      ...workflow,
      id: `workflow-${Date.now()}`,
      name: `${workflow.name} (副本)`,
      status: 'draft',
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      publishedAt: undefined,
    };
    mockWorkflows.push(newWorkflow);
    return newWorkflow;
  },

  // Publish workflow
  async publish(id: string): Promise<Workflow | undefined> {
    await delay(300);
    const workflow = mockWorkflows.find((w) => w.id === id);
    if (!workflow) return undefined;
    workflow.status = 'published';
    workflow.publishedAt = new Date();
    workflow.updatedAt = new Date();
    return workflow;
  },

  // Get version list
  async getVersions(workflowId: string): Promise<WorkflowVersion[]> {
    await delay(200);
    return mockVersions.filter((v) => v.workflowId === workflowId);
  },

  // Create version
  async createVersion(workflowId: string, changelog?: string): Promise<WorkflowVersion | undefined> {
    await delay(300);
    const workflow = mockWorkflows.find((w) => w.id === workflowId);
    if (!workflow) return undefined;
    const newVersion: WorkflowVersion = {
      id: `version-${Date.now()}`,
      workflowId,
      version: workflow.version + 1,
      snapshot: {
        name: workflow.name,
        description: workflow.description,
        status: workflow.status,
        nodes: workflow.nodes,
        edges: workflow.edges,
        variables: workflow.variables,
        triggers: workflow.triggers,
        settings: workflow.settings,
      },
      createdAt: new Date(),
      changelog,
    };
    mockVersions.push(newVersion);
    workflow.version = newVersion.version;
    return newVersion;
  },

  // Roll back to a specific version
  async rollback(workflowId: string, versionId: string): Promise<Workflow | undefined> {
    await delay(300);
    const version = mockVersions.find((v) => v.id === versionId);
    const workflow = mockWorkflows.find((w) => w.id === workflowId);
    if (!version || !workflow) return undefined;
    workflow.nodes = version.snapshot.nodes;
    workflow.edges = version.snapshot.edges;
    workflow.variables = version.snapshot.variables;
    workflow.updatedAt = new Date();
    return workflow;
  },

  // Execute workflow
  async execute(workflowId: string, payload?: Record<string, unknown>): Promise<WorkflowExecution> {
    await delay(500);
    const workflow = mockWorkflows.find((w) => w.id === workflowId);
    if (!workflow) throw new Error('Workflow not found');

    const execution: WorkflowExecution = {
      id: `exec-${Date.now()}`,
      workflowId,
      workflowVersion: workflow.version,
      status: 'running',
      trigger: { type: 'manual', payload },
      variables: payload || {},
      nodeExecutions: [],
      startTime: new Date(),
    };

    mockExecutions.push(execution);

    // Simulate async completion
    setTimeout(() => {
      execution.status = 'completed';
      execution.endTime = new Date();
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();
    }, 2000);

    return execution;
  },

  // Get execution records
  async getExecutions(workflowId: string): Promise<WorkflowExecution[]> {
    await delay(200);
    return mockExecutions.filter((e) => e.workflowId === workflowId);
  },

  // Get a single execution record
  async getExecution(executionId: string): Promise<WorkflowExecution | undefined> {
    await delay(200);
    return mockExecutions.find((e) => e.id === executionId);
  },

  // Cancel execution
  async cancelExecution(executionId: string): Promise<boolean> {
    await delay(200);
    const execution = mockExecutions.find((e) => e.id === executionId);
    if (!execution || execution.status !== 'running') return false;
    execution.status = 'cancelled';
    execution.endTime = new Date();
    return true;
  },

  // Validate workflow
  async validate(workflowId: string): Promise<{ valid: boolean; errors: string[] }> {
    await delay(300);
    const workflow = mockWorkflows.find((w) => w.id === workflowId);
    if (!workflow) {
      return { valid: false, errors: ['工作流不存在'] };
    }

    const errors: string[] = [];

    // Check whether there is a start node
    if (!workflow.nodes.some((n) => n.type === 'start')) {
      errors.push('缺少开始节点');
    }

    // Check whether there is an end node
    if (!workflow.nodes.some((n) => n.type === 'end')) {
      errors.push('缺少结束节点');
    }

    // Check whether edges are valid
    for (const edge of workflow.edges) {
      if (!workflow.nodes.some((n) => n.id === edge.sourceNodeId)) {
        errors.push(`边 ${edge.id} 的源节点不存在`);
      }
      if (!workflow.nodes.some((n) => n.id === edge.targetNodeId)) {
        errors.push(`边 ${edge.id} 的目标节点不存在`);
      }
    }

    return { valid: errors.length === 0, errors };
  },

  // Get statistics info
  async getStats(workflowId: string): Promise<WorkflowStats> {
    await delay(200);
    const executions = mockExecutions.filter((e) => e.workflowId === workflowId);
    const completed = executions.filter((e) => e.status === 'completed');
    const failed = executions.filter((e) => e.status === 'failed');

    return {
      totalExecutions: executions.length,
      successfulExecutions: completed.length,
      failedExecutions: failed.length,
      avgDuration: completed.length > 0
        ? completed.reduce((sum, e) => sum + (e.duration || 0), 0) / completed.length
        : 0,
      lastExecutionAt: executions[executions.length - 1]?.startTime,
    };
  },

  // Get node type configuration
  getNodeTypeConfig(type: NodeType) {
    return nodeTypeConfig[type];
  },

  // Get all node types
  getAllNodeTypes() {
    return Object.entries(nodeTypeConfig).map(([type, config]) => ({
      type: type as NodeType,
      ...config,
    }));
  },
};
