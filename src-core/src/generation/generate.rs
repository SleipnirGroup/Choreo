#![allow(clippy::missing_errors_doc)]

use std::sync::mpsc::{channel, Receiver, Sender};
use std::sync::OnceLock;

use trajoptlib::{DifferentialTrajectory, SwerveTrajectory};

use super::heading::adjust_headings;
use super::intervals::guess_control_interval_counts;
use super::transformers::{
    CallbackSetter, ConstraintSetter, DrivetrainAndBumpersSetter, IntervalCountSetter,
    TrajectoryFileGenerator,
};
use crate::spec::project::{ProjectFile, RobotConfig};
use crate::spec::trajectory::{ConstraintScope, Parameters, Sample, TrajectoryFile};
use crate::ChoreoResult;

/**
 * A [`OnceLock`] is a synchronization primitive that can be written to
 * once. Used here to create a read-only static reference to the sender,
 * even though the sender can't be constructed in a static context.
 */
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

///
/// Populate the is_initial_guess field of each waypoint in this snapshot. A waypoint is an initial guess
/// if it is not the endpoint of a constraint range (or the target of a waypoint constraint)
///
/// Returns a modified clone of the input snapshot.
///
/// TODO: set is_initial_guess to false if the waypoint is fix_heading or fix_translation,
/// then remove those checks from other places where is_initial_guess is checked.
pub fn set_initial_guess(snapshot: &Parameters<f64>) -> Parameters<f64> {
    let mut mut_snapshot = snapshot.clone();
    let waypoint_count = mut_snapshot.waypoints.len();
    for waypoint in mut_snapshot.waypoints.iter_mut() {
        waypoint.is_initial_guess = true;
    }
    for constraint in mut_snapshot.constraints.as_slice() {
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
                let wpt = &mut mut_snapshot.waypoints[from_idx];
                wpt.is_initial_guess = false;
                if let Some(to_idx) = to {
                    if to_idx != from_idx {
                        let to_wpt = &mut mut_snapshot.waypoints[to_idx];
                        to_wpt.is_initial_guess = false;
                    }
                }
            }
        }
    }
    mut_snapshot
}

/// Update the `intervals` field of each waypoint in the snapshot with guessed values according to robot config
///
/// Returns a modified clone of the input snapshot.
pub fn update_control_interval_counts(
    snapshot: &Parameters<f64>,
    config: &RobotConfig<f64>,
) -> Parameters<f64> {
    let counts_vec = guess_control_interval_counts(config, snapshot).unwrap_or_default();
    let mut snapshot = snapshot.clone();
    // Update the `intervals` field of each waypoint with the corresponding entry from `counts_vec`
    // NOTE: only updating the snapshot here
    snapshot.waypoints.iter_mut().zip(counts_vec).for_each(|w| {
        w.0.intervals = w.1;
    });
    snapshot
}

pub fn preprocess(
    snapshot: &Parameters<f64>,
    config_snapshot: &RobotConfig<f64>,
) -> ChoreoResult<Parameters<f64>> {
    let mut snapshot = set_initial_guess(snapshot);
    snapshot = adjust_headings(snapshot)?;
    snapshot = update_control_interval_counts(&snapshot, config_snapshot);
    Ok(snapshot)
}

pub fn generate(
    chor: ProjectFile,
    trajectory_file: TrajectoryFile,
    handle: i64,
) -> ChoreoResult<TrajectoryFile> {
    let mut gen = TrajectoryFileGenerator::try_new(chor, trajectory_file, handle)?;
    gen.add_omni_transformer::<IntervalCountSetter>()
        .add_omni_transformer::<DrivetrainAndBumpersSetter>()
        .add_omni_transformer::<ConstraintSetter>()
        .add_omni_transformer::<CallbackSetter>();
    gen.generate()
}
