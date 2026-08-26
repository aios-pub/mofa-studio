//! Graph analysis: topological order and upstream adjacency.

use crate::types::{FlowGraph, NodeType};
use std::collections::{HashMap, HashSet, VecDeque};

/// Errors from static graph analysis.
#[derive(Debug, thiserror::Error)]
pub enum GraphError {
    #[error("node '{0}' referenced by an edge does not exist")]
    UnknownNode(String),
    #[error("the graph contains a cycle involving '{0}'")]
    Cycle(String),
    #[error("node '{0}' of type {1} requires at least one upstream input")]
    MissingInput(String, &'static str),
    #[error("graph has no nodes")]
    Empty,
}

/// node_id → its upstream node ids.
pub fn upstream_map(graph: &FlowGraph) -> HashMap<String, Vec<String>> {
    let mut map: HashMap<String, Vec<String>> = graph
        .nodes
        .iter()
        .map(|n| (n.id.clone(), Vec::new()))
        .collect();
    for edge in &graph.edges {
        if let Some(list) = map.get_mut(&edge.to) {
            list.push(edge.from.clone());
        }
    }
    map
}

/// Kahn topological order. Errors on cycles or dangling edge endpoints.
pub fn topo_order(graph: &FlowGraph) -> Result<Vec<String>, GraphError> {
    if graph.nodes.is_empty() {
        return Err(GraphError::Empty);
    }
    let ids: HashSet<&str> = graph.nodes.iter().map(|n| n.id.as_str()).collect();
    for edge in &graph.edges {
        if !ids.contains(edge.from.as_str()) {
            return Err(GraphError::UnknownNode(edge.from.clone()));
        }
        if !ids.contains(edge.to.as_str()) {
            return Err(GraphError::UnknownNode(edge.to.clone()));
        }
    }

    let upstream = upstream_map(graph);
    // Multi-edges between the same pair count once for in-degree purposes.
    let mut in_degree: HashMap<&str, usize> = graph
        .nodes
        .iter()
        .map(|n| (n.id.as_str(), upstream[&n.id].len()))
        .collect();

    let mut downstream: HashMap<&str, Vec<&str>> = HashMap::new();
    for edge in &graph.edges {
        downstream
            .entry(edge.from.as_str())
            .or_default()
            .push(edge.to.as_str());
    }
    for list in downstream.values_mut() {
        list.sort_unstable();
        list.dedup();
    }

    let mut queue: VecDeque<&str> = graph
        .nodes
        .iter()
        .filter(|n| in_degree[n.id.as_str()] == 0)
        .map(|n| n.id.as_str())
        .collect();
    // Deterministic output for equal-depth nodes.
    let mut ready: Vec<&str> = queue.drain(..).collect();
    ready.sort_unstable();
    queue.extend(ready);

    let mut order = Vec::with_capacity(graph.nodes.len());
    while let Some(id) = queue.pop_front() {
        order.push(id.to_string());
        if let Some(children) = downstream.get(id) {
            for child in children {
                let degree = in_degree.get_mut(child).expect("known node");
                *degree -= 1;
                if *degree == 0 {
                    queue.push_back(child);
                }
            }
        }
    }

    if order.len() != graph.nodes.len() {
        let stuck = graph
            .nodes
            .iter()
            .find(|n| !order.contains(&n.id))
            .map(|n| n.id.clone())
            .unwrap_or_default();
        return Err(GraphError::Cycle(stuck));
    }
    Ok(order)
}

/// Nodes whose re-execution is required when `changed` nodes change:
/// the changed set plus everything downstream of it (transitive closure).
pub fn downstream_closure(graph: &FlowGraph, changed: &HashSet<String>) -> HashSet<String> {
    let mut down: HashMap<&str, Vec<&str>> = HashMap::new();
    for edge in &graph.edges {
        down.entry(edge.from.as_str())
            .or_default()
            .push(edge.to.as_str());
    }
    let mut affected: HashSet<String> = changed.clone();
    let mut queue: VecDeque<&str> = changed.iter().map(|s| s.as_str()).collect();
    while let Some(id) = queue.pop_front() {
        if let Some(children) = down.get(id) {
            for child in children {
                if affected.insert(child.to_string()) {
                    queue.push_back(child);
                }
            }
        }
    }
    affected
}

/// Validate execution preconditions per node kind.
pub fn validate(graph: &FlowGraph) -> Result<(), GraphError> {
    let order = topo_order(graph)?;
    let upstream = upstream_map(graph);
    for node in &graph.nodes {
        match node.node_type {
            NodeType::ImageGen | NodeType::LlmText | NodeType::Output | NodeType::HttpRequest => {
                if upstream.get(&node.id).map(Vec::is_empty).unwrap_or(true) {
                    return Err(GraphError::MissingInput(
                        node.id.clone(),
                        node.node_type.as_str(),
                    ));
                }
                let _ = &order;
            }
            NodeType::PromptText | NodeType::Constant => {}
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn graph(pairs: &[(&str, NodeType)], edges: &[(&str, &str)]) -> FlowGraph {
        FlowGraph {
            nodes: pairs
                .iter()
                .map(|(id, ty)| crate::types::FlowNode {
                    id: id.to_string(),
                    node_type: *ty,
                    params: json!({}),
                })
                .collect(),
            edges: edges
                .iter()
                .map(|(a, b)| crate::types::FlowEdge {
                    from: a.to_string(),
                    to: b.to_string(),
                })
                .collect(),
        }
    }

    #[test]
    fn diamond_topo_order_respects_dependencies() {
        let g = graph(
            &[
                ("a", NodeType::PromptText),
                ("b", NodeType::LlmText),
                ("c", NodeType::Output),
            ],
            &[("a", "b"), ("b", "c")],
        );
        assert_eq!(topo_order(&g).unwrap(), vec!["a", "b", "c"]);
    }

    #[test]
    fn cycles_are_rejected() {
        let g = graph(
            &[("a", NodeType::LlmText), ("b", NodeType::LlmText)],
            &[("a", "b"), ("b", "a")],
        );
        assert!(matches!(topo_order(&g), Err(GraphError::Cycle(_))));
    }

    #[test]
    fn dangling_edges_are_rejected() {
        let g = graph(&[("a", NodeType::PromptText)], &[("a", "ghost")]);
        assert!(matches!(topo_order(&g), Err(GraphError::UnknownNode(_))));
    }

    #[test]
    fn downstream_closure_is_transitive() {
        let g = graph(
            &[
                ("a", NodeType::PromptText),
                ("b", NodeType::ImageGen),
                ("c", NodeType::Output),
            ],
            &[("a", "b"), ("b", "c")],
        );
        let closure = downstream_closure(&g, &["a".into()].into());
        assert!(closure.contains("a") && closure.contains("b") && closure.contains("c"));

        let closure = downstream_closure(&g, &["c".into()].into());
        assert_eq!(closure, ["c".to_string()].into());
    }

    #[test]
    fn validate_requires_inputs_for_generators() {
        let g = graph(&[("gen", NodeType::ImageGen)], &[]);
        assert!(matches!(validate(&g), Err(GraphError::MissingInput(_, _))));
        let ok = graph(
            &[("p", NodeType::PromptText), ("gen", NodeType::ImageGen)],
            &[("p", "gen")],
        );
        assert!(validate(&ok).is_ok());
    }
}
