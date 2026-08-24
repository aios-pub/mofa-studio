//! Flow-graph types: nodes, edges, execution states, and events.

use serde::{Deserialize, Serialize};
use serde_json::Value;

/// Built-in node kinds (FLOW-02 M2 subset: the five-piece core chain).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum NodeType {
    /// Text prompt input.
    PromptText,
    /// Constant parameter value.
    Constant,
    /// Text-to-image generation via the engine.
    ImageGen,
    /// LLM text generation via the engine.
    LlmText,
    /// Terminal output; the host records the payload as an asset.
    Output,
}

impl NodeType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::PromptText => "prompt_text",
            Self::Constant => "constant",
            Self::ImageGen => "image_gen",
            Self::LlmText => "llm_text",
            Self::Output => "output",
        }
    }
}

/// One canvas node.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlowNode {
    pub id: String,
    #[serde(rename = "type")]
    pub node_type: NodeType,
    /// Node parameters (prompt text, model, size, n…). Part of the cache
    /// signature: change params → this node and its downstream re-run.
    #[serde(default)]
    pub params: Value,
}

/// One canvas edge (from upstream output → downstream input).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlowEdge {
    pub from: String,
    pub to: String,
}

/// The full graph.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlowGraph {
    pub nodes: Vec<FlowNode>,
    #[serde(default)]
    pub edges: Vec<FlowEdge>,
}

/// Node lifecycle states, surfaced to the canvas for live coloring.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum NodeStatus {
    Queued,
    Running,
    /// Signature-cache hit: the node did not re-execute.
    Cached,
    Done,
    Failed,
}

impl NodeStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Queued => "queued",
            Self::Running => "running",
            Self::Cached => "cached",
            Self::Done => "done",
            Self::Failed => "failed",
        }
    }
}

/// Execution events streamed to the canvas (SSE).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum FlowEvent {
    NodeStatus {
        node_id: String,
        status: NodeStatus,
        #[serde(skip_serializing_if = "Option::is_none")]
        detail: Option<String>,
    },
    ExecutionFinished {
        execution_id: String,
        ok: bool,
        #[serde(skip_serializing_if = "Option::is_none")]
        error: Option<String>,
        /// How many nodes actually executed vs were served from cache.
        executed: usize,
        cached: usize,
    },
}

/// One execution's aggregate result.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionResult {
    pub execution_id: String,
    pub ok: bool,
    pub error: Option<String>,
    pub node_outputs: std::collections::HashMap<String, Value>,
    pub executed: usize,
    pub cached: usize,
    pub duration_ms: u64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn node_type_wire_names_round_trip() {
        for ty in [
            NodeType::PromptText,
            NodeType::Constant,
            NodeType::ImageGen,
            NodeType::LlmText,
            NodeType::Output,
        ] {
            let s = serde_json::to_string(&ty).unwrap();
            let back: NodeType = serde_json::from_str(&s).unwrap();
            assert_eq!(back, ty);
        }
        assert_eq!(NodeType::ImageGen.as_str(), "image_gen");
    }
}
