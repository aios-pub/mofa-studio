/**
 * flow-engine — creation-workflow execution (PRD FLOW-04).
 *
 * Topological scheduling with signature-cache incremental execution: a
 * node whose (type, params, upstream-signature) hash matches the cache
 * skips re-execution, so editing one late parameter re-runs only that
 * node and its downstream. Node executors call mofa-engine through the
 * gateway's OpenAI-compatible surface via the EngineClient trait.
 */
pub mod executors;
pub mod runner;
pub mod scheduler;
pub mod types;

pub use executors::{EngineClient, ExecError, HttpEngineClient};
pub use runner::FlowRunner;
pub use scheduler::GraphError;
pub use types::{ExecutionResult, FlowEvent, FlowGraph, FlowNode, NodeStatus, NodeType};

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn reexports_compose() {
        let graph = FlowGraph {
            nodes: vec![FlowNode {
                id: "p".into(),
                node_type: NodeType::PromptText,
                params: json!({ "text": "hi" }),
            }],
            edges: vec![],
        };
        assert_eq!(scheduler::topo_order(&graph).unwrap(), vec!["p"]);
    }
}
