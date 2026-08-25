//! Task-domain types: projects, plans, steps, and the event log that
//! drives resume (PRD TASK-04 断点续跑 / TASK-08 执行策略).

use serde::{Deserialize, Serialize};
use serde_json::Value;

/// Execution strategy per step (TASK-08 三分法).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum StepStrategy {
    /// Run directly with the assigned model (default; no orchestration
    /// dependency — 08-R6 hedge).
    Direct,
    /// The step needs a review gate after execution (TASK-16).
    ReviewRequired,
    /// A domain expert prompt shapes this step (TASK-12).
    Expert,
}

/// Step lifecycle.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum StepStatus {
    Pending,
    Running,
    Done,
    Failed,
    /// Waiting at a review gate (TASK-16).
    AwaitingReview,
    /// Review found blocking issues; the step re-opens.
    Rework,
}

impl StepStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Running => "running",
            Self::Done => "done",
            Self::Failed => "failed",
            Self::AwaitingReview => "awaiting_review",
            Self::Rework => "rework",
        }
    }
}

/// One planned step in a project (TASK-04 计划可编辑).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Step {
    pub id: String,
    pub title: String,
    /// Instruction for the executor model.
    pub prompt: String,
    pub strategy: StepStrategy,
    pub status: StepStatus,
    /// Step artifact (text deliverable) once produced.
    #[serde(default)]
    pub output: Option<Value>,
    #[serde(default)]
    pub error: Option<String>,
}

/// Project lifecycle (立项→交付).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ProjectPhase {
    Planning,
    Executing,
    Review,
    Delivered,
}

impl ProjectPhase {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Planning => "planning",
            Self::Executing => "executing",
            Self::Review => "review",
            Self::Delivered => "delivered",
        }
    }
}

/// A project (TASK-04): goal + inputs + expected output format + plan.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: String,
    pub title: String,
    /// 立项三要素: the goal statement.
    pub goal: String,
    /// Expected deliverable format (word/excel/ppt/pdf/markdown).
    pub output_format: String,
    pub phase: ProjectPhase,
    pub steps: Vec<Step>,
    pub created_at: String,
    pub updated_at: String,
}

impl Project {
    pub fn new(
        title: impl Into<String>,
        goal: impl Into<String>,
        output_format: impl Into<String>,
    ) -> Self {
        let now = chrono::Utc::now()
            .format("%Y-%m-%dT%H:%M:%S%.3fZ")
            .to_string();
        Self {
            id: format!("proj-{}", uuid::Uuid::new_v4()),
            title: title.into(),
            goal: goal.into(),
            output_format: output_format.into(),
            phase: ProjectPhase::Planning,
            steps: Vec::new(),
            created_at: now.clone(),
            updated_at: now,
        }
    }

    /// Replace the plan (自动规划 → 人工增删改 → 确认开跑).
    pub fn set_plan(&mut self, steps: Vec<Step>) {
        self.steps = steps;
        self.phase = ProjectPhase::Executing;
        self.touch();
    }

    /// The next step to run (断点续跑: first pending/rework step).
    pub fn next_runnable(&self) -> Option<&Step> {
        self.steps
            .iter()
            .find(|s| s.status == StepStatus::Pending || s.status == StepStatus::Rework)
    }

    /// Progress fraction 0..1 over steps that reached a terminal-or-review
    /// state.
    pub fn progress(&self) -> f64 {
        if self.steps.is_empty() {
            return 0.0;
        }
        let settled = self
            .steps
            .iter()
            .filter(|s| {
                matches!(
                    s.status,
                    StepStatus::Done | StepStatus::Failed | StepStatus::AwaitingReview
                )
            })
            .count();
        settled as f64 / self.steps.len() as f64
    }

    fn touch(&mut self) {
        self.updated_at = chrono::Utc::now()
            .format("%Y-%m-%dT%H:%M:%S%.3fZ")
            .to_string();
    }

    /// Apply a step-status transition with legality checks.
    pub fn transition_step(
        &mut self,
        step_id: &str,
        to: StepStatus,
        output: Option<Value>,
        error: Option<String>,
    ) -> Result<(), String> {
        let step = self
            .steps
            .iter_mut()
            .find(|s| s.id == step_id)
            .ok_or_else(|| format!("unknown step '{step_id}'"))?;
        let legal = matches!(
            (step.status, to),
            (StepStatus::Pending, StepStatus::Running)
                | (StepStatus::Rework, StepStatus::Running)
                | (StepStatus::Running, StepStatus::Done)
                | (StepStatus::Running, StepStatus::Failed)
                | (StepStatus::Done, StepStatus::AwaitingReview)
                | (StepStatus::AwaitingReview, StepStatus::Done)
                | (StepStatus::AwaitingReview, StepStatus::Rework)
        );
        if !legal {
            return Err(format!(
                "illegal transition {} -> {}",
                step.status.as_str(),
                to.as_str()
            ));
        }
        step.status = to;
        if output.is_some() {
            step.output = output;
        }
        if error.is_some() {
            step.error = error;
        }
        // Review gates hold the project in the Review phase; all-done moves
        // to Delivered.
        let awaiting = self
            .steps
            .iter()
            .any(|s| s.status == StepStatus::AwaitingReview || s.status == StepStatus::Rework);
        let all_done = self.steps.iter().all(|s| s.status == StepStatus::Done);
        if awaiting {
            self.phase = ProjectPhase::Review;
        } else if all_done && !self.steps.is_empty() {
            self.phase = ProjectPhase::Delivered;
        } else {
            self.phase = ProjectPhase::Executing;
        }
        self.touch();
        Ok(())
    }
}

/// Build a step (helper for planners and tests).
pub fn step(title: impl Into<String>, prompt: impl Into<String>, strategy: StepStrategy) -> Step {
    Step {
        id: format!("step-{}", uuid::Uuid::new_v4()),
        title: title.into(),
        prompt: prompt.into(),
        strategy,
        status: StepStatus::Pending,
        output: None,
        error: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn lifecycle_walks_planning_to_delivered() {
        let mut project = Project::new("T", "G", "markdown");
        assert_eq!(project.phase, ProjectPhase::Planning);
        project.set_plan(vec![
            step("s1", "p1", StepStrategy::Direct),
            step("s2", "p2", StepStrategy::Direct),
        ]);
        assert_eq!(project.phase, ProjectPhase::Executing);

        let s1 = project.steps[0].id.clone();
        let s2 = project.steps[1].id.clone();

        project
            .transition_step(&s1, StepStatus::Running, None, None)
            .unwrap();
        project
            .transition_step(&s1, StepStatus::Done, Some(serde_json::json!("out1")), None)
            .unwrap();
        assert!((project.progress() - 0.5).abs() < 1e-9);

        project
            .transition_step(&s2, StepStatus::Running, None, None)
            .unwrap();
        project
            .transition_step(&s2, StepStatus::Done, None, None)
            .unwrap();
        assert_eq!(project.phase, ProjectPhase::Delivered);
        assert_eq!(project.progress(), 1.0);
    }

    #[test]
    fn review_gates_pause_then_rework_reopens() {
        let mut project = Project::new("T", "G", "markdown");
        project.set_plan(vec![step("reviewed", "p", StepStrategy::ReviewRequired)]);
        let id = project.steps[0].id.clone();
        project
            .transition_step(&id, StepStatus::Running, None, None)
            .unwrap();
        project
            .transition_step(
                &id,
                StepStatus::Done,
                Some(serde_json::json!("draft")),
                None,
            )
            .unwrap();
        project
            .transition_step(&id, StepStatus::AwaitingReview, None, None)
            .unwrap();
        assert_eq!(project.phase, ProjectPhase::Review);

        // Review rejects → rework → rerun → approve → done.
        project
            .transition_step(&id, StepStatus::Rework, None, None)
            .unwrap();
        project
            .transition_step(&id, StepStatus::Running, None, None)
            .unwrap();
        project
            .transition_step(&id, StepStatus::Done, None, None)
            .unwrap();
        project
            .transition_step(&id, StepStatus::AwaitingReview, None, None)
            .unwrap();
        project
            .transition_step(&id, StepStatus::Done, None, None)
            .unwrap();
        assert_eq!(project.phase, ProjectPhase::Delivered);
    }

    #[test]
    fn illegal_transitions_are_rejected() {
        let mut project = Project::new("T", "G", "markdown");
        project.set_plan(vec![step("s", "p", StepStrategy::Direct)]);
        let id = project.steps[0].id.clone();
        assert!(project
            .transition_step(&id, StepStatus::Done, None, None)
            .is_err());
        assert!(project
            .transition_step("missing", StepStatus::Running, None, None)
            .is_err());
    }

    #[test]
    fn resume_picks_first_pending_or_rework() {
        let mut project = Project::new("T", "G", "markdown");
        project.set_plan(vec![
            step("s1", "p", StepStrategy::Direct),
            step("s2", "p", StepStrategy::Direct),
        ]);
        let s1 = project.steps[0].id.clone();
        project
            .transition_step(&s1, StepStatus::Running, None, None)
            .unwrap();
        project
            .transition_step(&s1, StepStatus::Failed, None, Some("boom".into()))
            .unwrap();
        // 断点续跑: the failed step is NOT retried automatically; the next
        // pending step is offered (retry is an explicit re-run decision).
        let next = project.next_runnable().unwrap();
        assert_eq!(next.id, project.steps[1].id);
        assert!(project.steps[0].error.as_deref() == Some("boom"));
    }
}
