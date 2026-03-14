/**
 * 工作流状态管理
 */

import { create } from 'zustand';
import type { Node, Edge } from '@xyflow/react';

import type { NodeType, NodeConfig } from '../types/workflow';

import { nodeTypeConfig } from '../services/mock/workflows';

import type { Workflow, WorkflowNode, WorkflowEdge } from '../types/workflow';

interface WorkflowState {
  // 节点和边
  nodes: Node[];
  edges: Edge[];

  // 选中的节点
  selectedNodeId: string | null;

  // 历史记录（用于撤销/重做）
  history: {
    nodes: Node[];
    edges: Edge[];
  }[];
  historyIndex: number;

  // 变量
  variables: Workflow['variables'];

  // Actions
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  setSelectedNodeId: (id: string | null) => void;

  // 撤销/重做
  undo: () => void;
  redo: () => void;
  saveHistory: () => void;

  // 变量管理
  addVariable: (variable: Workflow['variables'][0]) => void;
  updateVariable: (name: string, value: Partial<Workflow['variables'][0]>) => void;
  removeVariable: (name: string) => void;

  // 清空
  clear: () => void;

  // 检查是否可以撤销/重做
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  history: [],
  historyIndex: -1,
  variables: [],

  setNodes: (nodes) => {
    get().saveHistory();
    set({ nodes });
  },

  setEdges: (edges) => {
    get().saveHistory();
    set({ edges });
  },

  setSelectedNodeId: (id) => set({ selectedNodeId: id }),

  saveHistory: () => {
    const { nodes, edges, history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ nodes: [...nodes], edges: [...edges] });
    // 限制历史记录数量
    if (newHistory.length > 50) {
      newHistory.shift();
    }
    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      set({
        nodes: prevState.nodes,
        edges: prevState.edges,
        historyIndex: historyIndex - 1,
      });
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      set({
        nodes: nextState.nodes,
        edges: nextState.edges,
        historyIndex: historyIndex + 1,
      });
    }
  },

  addVariable: (variable) => {
    const { variables } = get();
    if (variables.some((v) => v.name === variable.name)) {
      return;
    }
    set({ variables: [...variables, variable] });
  },

  updateVariable: (name, value) => {
    const { variables } = get();
    set({
      variables: variables.map((v) => (v.name === name ? { ...v, ...value } : v)),
    });
  },

  removeVariable: (name) => {
    const { variables } = get();
    set({ variables: variables.filter((v) => v.name !== name) });
  },

  clear: () => set({
    nodes: [],
    edges: [],
    selectedNodeId: null,
    history: [],
    historyIndex: -1,
    variables: [],
  }),

  canUndo: () => get().historyIndex > 0,

  canRedo: () => get().historyIndex < get().history.length - 1,
}));
