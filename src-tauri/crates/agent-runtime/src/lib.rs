/**
 * agent-runtime — task execution state machine (PRD M3: TASK-04 项目闭环,
 * TASK-08 执行策略三分法, TASK-16 评审工作流).
 *
 * Projects hold an editable plan of steps; the executor drives them
 * through legal state transitions with review gates, failures that don't
 * cascade, and resume from any pause point. Event granularity is the
 * transition log the host (server-core) persists.
 */
pub mod executor;
pub mod team;
pub mod types;

pub use executor::{approve, reject, run_project, EchoModel, RunError, StepModel, StepOutcome};
pub use team::{
    attach_team_result, run_team, Assignment, Expert, ExpertResult, TeamModel, TeamPolicy, TeamRun,
};
pub use types::{step, Project, ProjectPhase, Step, StepStatus, StepStrategy};

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reexports_compose() {
        let mut project = Project::new("T", "G", "markdown");
        project.set_plan(vec![step("s", "p", StepStrategy::Direct)]);
        assert_eq!(project.steps.len(), 1);
        assert_eq!(project.phase, ProjectPhase::Executing);
    }
}
