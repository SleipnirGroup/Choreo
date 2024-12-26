
use std::sync::mpsc::Sender;

use trajoptlib::{DifferentialTrajectory, SwerveTrajectory};

use super::constraints::check_constraint_conflicts;
use super::heading::adjust_headings;
use super::transformers::{
    CallbackSetter, ConstraintSetter, DrivetrainAndBumpersSetter, IntervalCountSetter,
    TrajectoryFileGenerator,
};
use crate::spec::project::ProjectFile;
use crate::spec::trajectory::{Sample, TrajectoryFile};
use crate::ChoreoResult;

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase", tag = "type")]
pub enum LocalProgressUpdate {
    SwerveTrajectory {
        update: Vec<Sample>,
    },
    DifferentialTrajectory {
        update: Vec<Sample>,
    },
    DiagnosticText {
        update: String,
    },
}

impl LocalProgressUpdate {
    pub fn handled(self, handle: i64) -> HandledLocalProgressUpdate {
        HandledLocalProgressUpdate {
            handle,
            update: self,
        }
    }
}

impl From<SwerveTrajectory> for LocalProgressUpdate {
    fn from(trajectory: SwerveTrajectory) -> Self {
        LocalProgressUpdate::SwerveTrajectory {
            update: trajectory.samples.iter().map(Sample::from).collect(),
        }
    }
}

impl From<DifferentialTrajectory> for LocalProgressUpdate {
    fn from(trajectory: DifferentialTrajectory) -> Self {
        LocalProgressUpdate::DifferentialTrajectory {
            update: trajectory.samples.iter().map(Sample::from).collect(),
        }
    }
}

pub struct HandledLocalProgressUpdate {
    pub handle: i64,
    pub update: LocalProgressUpdate,
}

// pub fn setup_progress_sender() -> Receiver<HandledLocalProgressUpdate> {
//     // let (tx, rx) = channel::<HandledLocalProgressUpdate>();
//     // let _ = PROGRESS_SENDER_LOCK.get_or_init(move || tx);
//     // rx
//     if PROGRESS_SENDER_LOCK.get().is_none() {
//         let (tx, rx) = channel::<HandledLocalProgressUpdate>();
//         PROGRESS_SENDER_LOCK.
//         rx
//     } else {
//         PROGRESS_SENDER_LOCK.get().unwrap().clone()
//     }
// }

pub fn generate(
    chor: ProjectFile,
    mut trajectory_file: TrajectoryFile,
    handle: i64,
    progress_updater: Sender<HandledLocalProgressUpdate>
) -> ChoreoResult<TrajectoryFile> {
    let mut original = trajectory_file.clone();

    // these two functions can make changes to the trajectory file
    check_constraint_conflicts(&trajectory_file)?;
    adjust_headings(&mut trajectory_file)?;

    let mut gen = TrajectoryFileGenerator::new(
        chor,
        trajectory_file,
        handle,
        progress_updater
    );

    gen.add_omni_transformer::<IntervalCountSetter>();
    gen.add_omni_transformer::<DrivetrainAndBumpersSetter>();
    gen.add_omni_transformer::<ConstraintSetter>();
    gen.add_omni_transformer::<CallbackSetter>();

    let new_traj = gen.generate()?;
    original.trajectory = new_traj.trajectory;

    Ok(original)
}
