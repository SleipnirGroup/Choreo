#![allow(clippy::missing_errors_doc)]

use std::sync::OnceLock;
use std::sync::mpsc::{Receiver, Sender, channel};

use trajoptlib::{DifferentialTrajectory, SwerveTrajectory};

use super::heading::adjust_headings;
use super::transformers::{
    CallbackSetter, ConstraintSetter, DrivetrainAndBumpersSetter, IntervalCountSetter,
    TrajectoryFileGenerator,
};
use crate::ChoreoResult;
use crate::spec::project::ProjectFile;
use crate::spec::trajectory::{ConstraintScope, Sample, Trajectory, TrajectoryFile};

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

pub fn setup_progress_sender() -> Receiver<HandledLocalProgressUpdate> {
    let (tx, rx) = channel::<HandledLocalProgressUpdate>();
    let _ = PROGRESS_SENDER_LOCK.get_or_init(move || tx);
    rx
}

fn set_initial_guess(trajectory: &mut TrajectoryFile) {
    fn not_initial_guess_wpt(trajectory: &mut TrajectoryFile, idx: usize) {
        let wpt = &mut trajectory.params.waypoints[idx];
        wpt.is_initial_guess = false;
    }
    let waypoint_count = trajectory.params.waypoints.len();
    for waypoint in trajectory.params.waypoints.iter_mut() {
        waypoint.is_initial_guess = true;
    }
    for constraint in trajectory.params.snapshot().constraints {
        let from = constraint.from.get_idx(waypoint_count);
        let to = constraint
            .to
            .as_ref()
            .and_then(|id| id.get_idx(waypoint_count));

        if let Some(from_idx) = from {
            let valid_wpt = to.is_none();
            let valid_sgmt = to.is_some();
            // Check for valid scope
            if match constraint.data.scope() {
                ConstraintScope::Waypoint => valid_wpt,
                ConstraintScope::Segment => valid_sgmt,
                ConstraintScope::Both => valid_wpt || valid_sgmt,
            } {
                not_initial_guess_wpt(trajectory, from_idx);
                if let Some(to_idx) = to
                    && to_idx != from_idx
                {
                    not_initial_guess_wpt(trajectory, to_idx);
                }
            }
        }
    }
}

pub fn generate(
    chor: ProjectFile,
    trajectory_file: TrajectoryFile,
    handle: i64,
) -> ChoreoResult<TrajectoryFile> {
    let original = trajectory_file;
    // Populate some metadata on the TrajectoryFile.
    let mut mut_trajectory_file = original.clone();
    set_initial_guess(&mut mut_trajectory_file);
    adjust_headings(&mut mut_trajectory_file)?;

    let mut generator = TrajectoryFileGenerator::new(chor, mut_trajectory_file, handle);

    generator.add_omni_transformer::<IntervalCountSetter>();
    generator.add_omni_transformer::<DrivetrainAndBumpersSetter>();
    generator.add_omni_transformer::<ConstraintSetter>();
    generator.add_omni_transformer::<CallbackSetter>();

    let output = generator.generate()?;
    // Ensure we only change the parts we mean to change.
    Ok(TrajectoryFile {
        name: original.name,
        version: original.version,
        snapshot: Some(original.params.snapshot()),
        params: original.params,
        trajectory: Trajectory {
            sample_type: output.trajectory.sample_type,
            waypoints: output.trajectory.waypoints,
            samples: output.trajectory.samples,
            splits: output.trajectory.splits,
        },
        events: output.events,
    })
}
