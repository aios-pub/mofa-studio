//! Step executor: drives a project's steps through a caller-supplied
//! model call. The runtime owns transitions; the caller owns I/O — so
//! tests run with an in-memory model double while server-core injects
//! the engine chat.

use serde_json::Value;

use crate::types::{Project, ProjectPhase, Step, StepStatus};

/// What one step execution produced.
pub struct StepOutcome {
    pub output: Value,
}

#[async_trait::async_trait]
pub trait StepModel: Send + Sync {
    /// Execute one step's prompt; the returned text becomes the artifact.
    async fn execute(&self, prompt: &str, step: &Step) -> Result<String, String>;
}

/// An in-memory model double: echoes a canned result per prompt keyword.
pub struct EchoModel {
    pub fail_on: Option<&'static str>,
}

#[async_trait::async_trait]
impl StepModel for EchoModel {
    async fn execute(&self, prompt: &str, _step: &Step) -> Result<String, String> {
        if let Some(keyword) = self.fail_on {
            if prompt.contains(keyword) {
                return Err(format!("model failed on '{keyword}'"));
            }
        }
        Ok(format!("产出（{prompt}）"))
    }
}

#[derive(Debug, thiserror::Error)]
pub enum RunError {
    #[error("step '{0}' failed: {1}")]
    StepFailed(String, String),
    #[error("run stopped at review gate on step '{0}'")]
    AwaitingReview(String),
    #[error("nothing to run")]
    Empty,
}

impl RunError {
    /// Whether the run reached a normal pause point (review gate).
    pub fn is_review_pause(&self) -> bool {
        matches!(self, Self::AwaitingReview(_))
    }
}

/// Run pending steps until the project pauses (review gate), fails, or
/// completes. Resume-safe: call again after rework/approval to continue.
pub async fn run_project(project: &mut Project, model: &dyn StepModel) -> Result<(), RunError> {
    loop {
        let Some(step) = project.next_runnable().cloned() else {
            return if project.steps.is_empty() {
                Err(RunError::Empty)
            } else if project.phase == ProjectPhase::Delivered {
                Ok(())
            } else {
                // Nothing runnable and not delivered: all steps settled
                // (e.g. a failure froze the rest).
                Ok(())
            };
        };
        project
            .transition_step(&step.id, StepStatus::Running, None, None)
            .map_err(|e| RunError::StepFailed(step.id.clone(), e))?;
        match model.execute(&step.prompt, &step).await {
            Ok(text) => {
                project
                    .transition_step(&step.id, StepStatus::Done, Some(Value::String(text)), None)
                    .map_err(|e| RunError::StepFailed(step.id.clone(), e))?;
                // Review-gated steps pause the run immediately (the cloned
                // step's status is stale; the strategy is immutable).
                if needs_gate(&step)
                    && project
                        .transition_step(&step.id, StepStatus::AwaitingReview, None, None)
                        .is_ok()
                {
                    return Err(RunError::AwaitingReview(step.id));
                }
            }
            Err(message) => {
                let _ = project.transition_step(
                    &step.id,
                    StepStatus::Failed,
                    None,
                    Some(message.clone()),
                );
                return Err(RunError::StepFailed(step.id, message));
            }
        }
    }
}

/// Whether this step's strategy demands a review gate (TASK-16).
fn needs_gate(step: &Step) -> bool {
    use crate::types::StepStrategy;
    step.strategy == StepStrategy::ReviewRequired
}

/// Approve a gated step (review passed).
pub fn approve(project: &mut Project, step_id: &str) -> Result<(), String> {
    project.transition_step(step_id, StepStatus::Done, None, None)
}

/// Reject a gated step (review found blockers → rework).
pub fn reject(project: &mut Project, step_id: &str) -> Result<(), String> {
    project.transition_step(step_id, StepStatus::Rework, None, None)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{step, StepStrategy};

    fn two_step_project() -> Project {
        let mut project = Project::new("T", "G", "markdown");
        project.set_plan(vec![
            step("s1", "写大纲", StepStrategy::Direct),
            step("s2", "写正文", StepStrategy::Direct),
        ]);
        project
    }

    #[tokio::test]
    async fn runs_to_completion_and_produces_artifacts() {
        let mut project = two_step_project();
        run_project(&mut project, &EchoModel { fail_on: None })
            .await
            .unwrap();
        assert_eq!(project.phase, ProjectPhase::Delivered);
        assert!(project
            .steps
            .iter()
            .all(|s| s.output.as_ref().and_then(Value::as_str).is_some()));
    }

    #[tokio::test]
    async fn review_gate_pauses_and_resume_continues() {
        let mut project = Project::new("T", "G", "ppt");
        project.set_plan(vec![
            step("gated", "关键产出", StepStrategy::ReviewRequired),
            step("final", "收尾", StepStrategy::Direct),
        ]);
        let err = run_project(&mut project, &EchoModel { fail_on: None })
            .await
            .unwrap_err();
        assert!(err.is_review_pause());
        assert_eq!(project.phase, ProjectPhase::Review);

        // Approve → resume → delivered.
        let gated = project.steps[0].id.clone();
        approve(&mut project, &gated).unwrap();
        run_project(&mut project, &EchoModel { fail_on: None })
            .await
            .unwrap();
        assert_eq!(project.phase, ProjectPhase::Delivered);
    }

    #[tokio::test]
    async fn rejection_reworks_and_the_step_reruns() {
        let mut project = Project::new("T", "G", "ppt");
        project.set_plan(vec![step(
            "gated",
            "关键产出",
            StepStrategy::ReviewRequired,
        )]);
        let _ = run_project(&mut project, &EchoModel { fail_on: None }).await;
        let gated = project.steps[0].id.clone();
        reject(&mut project, &gated).unwrap();
        assert_eq!(project.steps[0].status, StepStatus::Rework);
        // Resume: the reworked step runs again and pauses at the gate again.
        let err = run_project(&mut project, &EchoModel { fail_on: None })
            .await
            .unwrap_err();
        assert!(err.is_review_pause());
        approve(&mut project, &gated).unwrap();
        run_project(&mut project, &EchoModel { fail_on: None })
            .await
            .unwrap();
        assert_eq!(project.phase, ProjectPhase::Delivered);
    }

    #[tokio::test]
    async fn model_failure_fails_the_step_with_reason() {
        let mut project = two_step_project();
        let err = run_project(
            &mut project,
            &EchoModel {
                fail_on: Some("大纲"),
            },
        )
        .await
        .unwrap_err();
        assert!(err.to_string().contains("model failed"));
        assert_eq!(project.steps[0].status, StepStatus::Failed);
        assert!(project.steps[0].error.is_some());
        // The second step stays pending (no cascading runs after failure).
        assert_eq!(project.steps[1].status, StepStatus::Pending);
    }

    #[tokio::test]
    async fn empty_plan_is_rejected_honestly() {
        let mut project = Project::new("T", "G", "markdown");
        assert!(matches!(
            run_project(&mut project, &EchoModel { fail_on: None }).await,
            Err(RunError::Empty)
        ));
    }
}
