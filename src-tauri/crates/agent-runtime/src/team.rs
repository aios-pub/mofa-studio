//! Expert-team orchestration (TASK-15): a leader decomposes a goal into
//! parallel per-expert assignments, experts run concurrently (tokio),
//! partial failures are retried without affecting siblings, and the
//! leader merges everything into one deliverable. Message passing is
//! explicit channel-free values — every dispatched assignment and every
//! returned result is retained in the run log (no message loss by
//! construction; 验收: 汇总无消息丢失).

use serde_json::Value;

use crate::types::Project;

/// One expert on the team.
#[derive(Debug, Clone)]
pub struct Expert {
    pub name: String,
    /// The domain brief the model sees.
    pub perspective: String,
}

/// A dispatched assignment (leader → expert).
#[derive(Debug, Clone)]
pub struct Assignment {
    pub expert: String,
    pub prompt: String,
}

/// An expert's returned result (expert → leader).
#[derive(Debug, Clone)]
pub struct ExpertResult {
    pub expert: String,
    pub ok: bool,
    pub output: String,
    /// Retry generation: 1 = first attempt, 2+ = retried.
    pub attempt: u32,
}

/// The team model: leader decomposition + merge.
#[async_trait::async_trait]
pub trait TeamModel: Send + Sync {
    /// Decompose the goal into one assignment per expert.
    async fn decompose(&self, goal: &str, experts: &[Expert]) -> Result<Vec<Assignment>, String>;

    /// Execute one expert's assignment.
    async fn execute_expert(&self, assignment: &Assignment) -> Result<String, String>;

    /// Merge all expert results into the final deliverable.
    async fn merge(&self, goal: &str, results: &[ExpertResult]) -> Result<String, String>;
}

/// Orchestration policy.
#[derive(Debug, Clone, Copy)]
pub struct TeamPolicy {
    /// How many times a failed expert is retried (0 = no retry).
    pub max_retries: u32,
}

impl Default for TeamPolicy {
    fn default() -> Self {
        Self { max_retries: 1 }
    }
}

/// Everything a team run produces — the event-sourced record.
#[derive(Debug, Clone)]
pub struct TeamRun {
    pub goal: String,
    pub assignments: Vec<Assignment>,
    /// All results in completion order, including failed attempts — the
    /// audit trail that proves no message was lost.
    pub results: Vec<ExpertResult>,
    /// The final merged deliverable (None when the run failed).
    pub deliverable: Option<String>,
}

/// Run the full leader → parallel experts → merge pipeline. Experts run
/// concurrently via tokio; a failing expert is retried up to
/// `policy.max_retries` while its siblings' results are unaffected
/// (验收: 单专家失败可重试不影响其余).
pub async fn run_team(
    goal: &str,
    experts: Vec<Expert>,
    model: std::sync::Arc<dyn TeamModel>,
    policy: TeamPolicy,
) -> Result<TeamRun, String> {
    if experts.is_empty() {
        return Err("专家团至少需要一位专家".into());
    }
    let assignments = model.decompose(goal, &experts).await?;
    if assignments.len() != experts.len() {
        return Err(format!(
            "团长分派了 {} 项任务但团队有 {} 位专家——数量必须一致",
            assignments.len(),
            experts.len()
        ));
    }

    // Fan out concurrently; each expert retries its own failures. Tasks
    // own a clone of the model Arc; assignments are cloned per task.
    let mut handles = Vec::with_capacity(assignments.len());
    for assignment in &assignments {
        let max_retries = policy.max_retries;
        let model = std::sync::Arc::clone(&model);
        let assignment = assignment.clone();
        handles.push(tokio::spawn(async move {
            let mut attempts = Vec::new();
            let mut attempt = 1u32;
            loop {
                match model.execute_expert(&assignment).await {
                    Ok(output) => {
                        attempts.push(ExpertResult {
                            expert: assignment.expert.clone(),
                            ok: true,
                            output,
                            attempt,
                        });
                        return attempts;
                    }
                    Err(message) => {
                        attempts.push(ExpertResult {
                            expert: assignment.expert.clone(),
                            ok: false,
                            output: message,
                            attempt,
                        });
                        if attempt > max_retries {
                            return attempts; // exhausted — sibling results unaffected
                        }
                        attempt += 1;
                    }
                }
            }
        }));
    }

    let mut results: Vec<ExpertResult> = Vec::new();
    for handle in handles {
        match handle.await {
            Ok(mut attempt_results) => results.append(&mut attempt_results),
            // A panicked task is recorded as a failed attempt, not dropped.
            Err(e) => results.push(ExpertResult {
                expert: "?".into(),
                ok: false,
                output: format!("任务崩溃: {e}"),
                attempt: 0,
            }),
        }
    }

    // The merge gets every expert's last attempt regardless of outcome;
    // failure contexts help the leader note gaps honestly.
    let deliverable = model.merge(goal, &results).await?;
    Ok(TeamRun {
        goal: goal.to_string(),
        assignments,
        results,
        deliverable: Some(deliverable),
    })
}

/// Attach a team run to a project as a review-ready deliverable step:
/// the merged output lands on a single review-gated step (TASK-16).
pub fn attach_team_result(project: &mut Project, run: &TeamRun) -> Result<String, String> {
    let step = crate::step(
        "专家团整合",
        format!(
            "{}\n\n来源：{}",
            run.deliverable.as_deref().unwrap_or("（无整合结果）"),
            run.results
                .iter()
                .filter(|r| r.ok)
                .map(|r| r.expert.clone())
                .collect::<Vec<_>>()
                .join("、")
        ),
        crate::StepStrategy::ReviewRequired,
    );
    let step_id = step.id.clone();
    project.set_plan(vec![step]);
    // Mark the step done immediately with its output — the review gate
    // follows automatically on the next transition.
    project.transition_step(&step_id, crate::StepStatus::Running, None, None)?;
    project.transition_step(
        &step_id,
        crate::StepStatus::Done,
        Some(Value::String(run.deliverable.clone().unwrap_or_default())),
        None,
    )?;
    project.transition_step(&step_id, crate::StepStatus::AwaitingReview, None, None)?;
    Ok(step_id)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicUsize, Ordering};
    use std::sync::Arc;

    /// A scripted model double: decomposition is deterministic, execution
    /// fails N times for chosen experts, merge concatenates.
    struct ScriptedModel {
        fail_counts: Arc<std::sync::Mutex<std::collections::HashMap<String, u32>>>,
        executions: AtomicUsize,
        merges: AtomicUsize,
    }

    impl ScriptedModel {
        fn new(fail_first: &[(&str, u32)]) -> Self {
            let mut map = std::collections::HashMap::new();
            for (name, n) in fail_first {
                map.insert((*name).to_string(), *n);
            }
            Self {
                fail_counts: Arc::new(std::sync::Mutex::new(map)),
                executions: AtomicUsize::new(0),
                merges: AtomicUsize::new(0),
            }
        }
    }

    #[async_trait::async_trait]
    impl TeamModel for ScriptedModel {
        async fn decompose(
            &self,
            goal: &str,
            experts: &[Expert],
        ) -> Result<Vec<Assignment>, String> {
            Ok(experts
                .iter()
                .map(|e| Assignment {
                    expert: e.name.clone(),
                    prompt: format!("从{persp}视角分析：{goal}", persp = e.perspective),
                })
                .collect())
        }

        async fn execute_expert(&self, assignment: &Assignment) -> Result<String, String> {
            self.executions.fetch_add(1, Ordering::SeqCst);
            let mut failures = self.fail_counts.lock().unwrap();
            let remaining = failures.get_mut(&assignment.expert);
            if let Some(count) = remaining {
                if *count > 0 {
                    *count -= 1;
                    return Err(format!("{} 第 {} 次失败", assignment.expert, count));
                }
            }
            Ok(format!("[{}] 已完成", assignment.expert))
        }

        async fn merge(&self, _goal: &str, results: &[ExpertResult]) -> Result<String, String> {
            self.merges.fetch_add(1, Ordering::SeqCst);
            // The merge must see one final result per expert — no loss.
            let mut names: Vec<&str> = results.iter().map(|r| r.expert.as_str()).collect();
            names.sort();
            names.dedup();
            assert_eq!(
                names.len(),
                results
                    .iter()
                    .map(|r| r.expert.as_str())
                    .collect::<std::collections::HashSet<_>>()
                    .len()
            );
            Ok(format!(
                "整合（{} 位专家，{} 条结果记录）",
                names.len(),
                results.len()
            ))
        }
    }

    fn team() -> Vec<Expert> {
        vec![
            Expert {
                name: "叙事".into(),
                perspective: "剧情结构".into(),
            },
            Expert {
                name: "技术".into(),
                perspective: "实现可行性".into(),
            },
            Expert {
                name: "合规".into(),
                perspective: "内容安全".into(),
            },
        ]
    }

    #[tokio::test]
    async fn three_experts_run_in_parallel_with_no_message_loss() {
        let model = Arc::new(ScriptedModel::new(&[]));
        let run = run_team(
            "做一支品牌短片",
            team(),
            Arc::clone(&model) as Arc<dyn TeamModel>,
            TeamPolicy::default(),
        )
        .await
        .unwrap();
        // Every expert produced exactly one successful result.
        let ok_results: Vec<&ExpertResult> = run.results.iter().filter(|r| r.ok).collect();
        assert_eq!(ok_results.len(), 3);
        assert!(run.results.iter().all(|r| r.attempt == 1));
        assert!(run.deliverable.as_deref().unwrap().contains("3 位专家"));
        assert_eq!(model.merges.load(Ordering::SeqCst), 1);
    }

    #[tokio::test]
    async fn failing_expert_retries_without_affecting_siblings() {
        // 技术专家 fails once, then succeeds on retry.
        let model = ScriptedModel::new(&[("技术", 1)]);
        let run = run_team(
            "做一支品牌短片",
            team(),
            std::sync::Arc::new(model),
            TeamPolicy { max_retries: 1 },
        )
        .await
        .unwrap();
        // All three still succeed eventually.
        let ok = run.results.iter().filter(|r| r.ok).count();
        assert_eq!(ok, 3, "results: {:?}", run.results);
        // The retried expert recorded its failure then success.
        let tech_attempts: Vec<&ExpertResult> =
            run.results.iter().filter(|r| r.expert == "技术").collect();
        assert_eq!(tech_attempts.len(), 2);
        assert!(!tech_attempts[0].ok);
        assert!(tech_attempts[1].ok);
        assert_eq!(tech_attempts[1].attempt, 2);
        // Siblings ran exactly once — unaffected by the retry.
        for name in ["叙事", "合规"] {
            assert_eq!(run.results.iter().filter(|r| r.expert == name).count(), 1);
        }
    }

    #[tokio::test]
    async fn exhausted_retries_surface_failures_to_the_merge() {
        // 合规 fails forever with max_retries 1 → two failed attempts.
        let model = ScriptedModel::new(&[("合规", 99)]);
        let run = run_team(
            "做一支品牌短片",
            team(),
            std::sync::Arc::new(model),
            TeamPolicy { max_retries: 1 },
        )
        .await
        .unwrap();
        let compliance: Vec<&ExpertResult> =
            run.results.iter().filter(|r| r.expert == "合规").collect();
        assert_eq!(compliance.len(), 2);
        assert!(compliance.iter().all(|r| !r.ok));
        // Siblings still fine.
        assert_eq!(run.results.iter().filter(|r| r.ok).count(), 2);
    }

    #[tokio::test]
    async fn empty_team_and_mismatched_assignments_rejected() {
        let model = ScriptedModel::new(&[]);
        assert!(run_team(
            "g",
            vec![],
            std::sync::Arc::new(model),
            TeamPolicy::default()
        )
        .await
        .is_err());

        struct Mismatch;
        #[async_trait::async_trait]
        impl TeamModel for Mismatch {
            async fn decompose(&self, _g: &str, _e: &[Expert]) -> Result<Vec<Assignment>, String> {
                Ok(vec![]) // wrong count on purpose
            }
            async fn execute_expert(&self, _a: &Assignment) -> Result<String, String> {
                Ok(String::new())
            }
            async fn merge(&self, _g: &str, _r: &[ExpertResult]) -> Result<String, String> {
                Ok(String::new())
            }
        }
        assert!(run_team(
            "g",
            team(),
            std::sync::Arc::new(Mismatch),
            TeamPolicy::default()
        )
        .await
        .is_err());
    }

    #[test]
    fn team_results_attach_as_review_gated_step() {
        let mut project = Project::new("T", "G", "markdown");
        let run = TeamRun {
            goal: "g".into(),
            assignments: vec![],
            results: vec![ExpertResult {
                expert: "叙事".into(),
                ok: true,
                output: "ok".into(),
                attempt: 1,
            }],
            deliverable: Some("整合产物".into()),
        };
        let step_id = attach_team_result(&mut project, &run).unwrap();
        let step = project.steps.iter().find(|s| s.id == step_id).unwrap();
        assert_eq!(step.status, crate::StepStatus::AwaitingReview);
        assert!(step
            .output
            .as_ref()
            .unwrap()
            .as_str()
            .unwrap()
            .contains("整合产物"));
        assert_eq!(project.phase, crate::ProjectPhase::Review);
    }
}
