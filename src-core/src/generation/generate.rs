#![allow(clippy::missing_errors_doc)]

use std::sync::OnceLock;
use std::sync::mpsc::{Receiver, Sender, channel};

use trajoptlib::{DifferentialTrajectory, SwerveTrajectory};

use super::transformers::{
    CallbackSetter, ConstraintSetter, DrivetrainAndBumpersSetter, IntervalCountSetter,
    TrajectoryFileGenerator,
};
use crate::ChoreoResult;
use crate::spec::project::ProjectFile;
use crate::spec::trajectory::{Sample, TrajectoryFile};

/// A [`OnceLock`] is a synchronization primitive that can be written to once.
/// Used here to create a read-only static reference to the sender, even though
/// the sender can't be constructed in a static context.
pub(super) static PROGRESS_SENDER_LOCK: OnceLock<Sender<HandledLocalProgressUpdate>> =
    OnceLock::new();

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase", tag = "type")]
pub enum LocalProgressUpdate {
    SwerveTrajectory {
        // Swerve variant
        update: Vec<Sample>,
    },
    DifferentialTrajectory {
        // Diff variant
        update: Vec<Sample>,
    },
    DiagnosticText {
        update: String,
    },
    IntervalCounts {
        update: Vec<usize>,
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
impl From<Vec<usize>> for LocalProgressUpdate {
    fn from(value: Vec<usize>) -> Self {
        LocalProgressUpdate::IntervalCounts { update: value }
    }
}

pub struct HandledLocalProgressUpdate {
    pub handle: i64,
    pub update: LocalProgressUpdate,
}

pub fn setup_progress_sender() -> Receiver<HandledLocalProgressUpdate> {
    let (tx, rx) = channel::<HandledLocalProgressUpdate>();
    let _ = PROGRESS_SENDER_LOCK.get_or_init(move || tx);
    rx
}

pub fn generate(
    chor: ProjectFile,
    trajectory_file: TrajectoryFile,
    handle: i64,
) -> ChoreoResult<TrajectoryFile> {
    let mut generator = TrajectoryFileGenerator::new(chor, trajectory_file, handle)?;
    generator.add_omni_transformer::<IntervalCountSetter>();
    generator.add_omni_transformer::<DrivetrainAndBumpersSetter>();
    generator.add_omni_transformer::<ConstraintSetter>();
    generator.add_omni_transformer::<CallbackSetter>();

    let result = generator.generate()?;
    Ok(result)
}
