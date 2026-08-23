/**
 * Workflow status management
 */

import { create } from 'zustand';
import type { Node, Edge } from '@xyflow/react';

interface WorkflowState {
  // Nodes and edges
  nodes: Node[];
  edges: Edge[];

  // Selected nodes
  selectedNodeId: string | null;

  // History (for undo/redo)
  history: {
    nodes: Node[];
    edges: Edge[];
  }[];
  historyIndex: number;

  // Variables
  variables: { name: string; type: string; scope: string; description?: string; value?: unknown }[];

  // Actions
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  setSelectedNodeId: (id: string | null) => void;

  // Undo/redo
  undo: () => void;
  redo: () => void;
  saveHistory: () => void;

  // Variable management
  addVariable: (variable: { name: string; type: string; scope: string; description?: string; value?: unknown }) => void;
  updateVariable: (name: string, value: Partial<{ name: string; type: string; scope: string; description?: string; value?: unknown }>) => void;
  removeVariable: (name: string) => void;

  // Clear
  clear: () => void;

  // Check whether undo/redo is possible
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
    // Limit history size
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
