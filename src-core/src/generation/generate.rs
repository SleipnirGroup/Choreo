#![allow(clippy::missing_errors_doc)]

use std::sync::mpsc::{channel, Receiver, Sender};
use std::sync::OnceLock;

use trajoptlib::{DifferentialTrajectory, SwerveTrajectory};

use super::heading::adjust_headings;
use super::transformers::{
    CallbackSetter, ConstraintSetter, DrivetrainAndBumpersSetter, IntervalCountSetter,
    TrajFileGenerator,
};
use crate::spec::project::ProjectFile;
use crate::spec::traj::{ConstraintScope, Sample, TrajFile};
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
    SwerveTraj {
        // Swerve variant
        update: Vec<Sample>,
    },
    DiffTraj {
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
    fn from(traj: SwerveTrajectory) -> Self {
        LocalProgressUpdate::SwerveTraj {
            update: traj.samples.iter().map(Sample::from).collect(),
        }
    }
}

impl From<DifferentialTrajectory> for LocalProgressUpdate {
    fn from(traj: DifferentialTrajectory) -> Self {
        LocalProgressUpdate::DiffTraj {
            update: traj.samples.iter().map(Sample::from).collect(),
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

fn set_initial_guess(traj: &mut TrajFile) {
    fn not_initial_guess_wpt(traj: &mut TrajFile, idx: usize) {
        let wpt = &mut traj.params.waypoints[idx];
        wpt.is_initial_guess = false;
    }
    let waypoint_count = traj.params.waypoints.len();
    for waypoint in traj.params.waypoints.iter_mut() {
        waypoint.is_initial_guess = true;
    }
    for constraint in traj.params.snapshot().constraints {
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
                not_initial_guess_wpt(traj, from_idx);
                if let Some(to_idx) = to {
                    if to_idx != from_idx {
                        not_initial_guess_wpt(traj, to_idx);
                    }
                }
            }
        }
    }
}

pub fn generate(chor: ProjectFile, mut trajfile: TrajFile, handle: i64) -> ChoreoResult<TrajFile> {
    set_initial_guess(&mut trajfile);
    adjust_headings(&mut trajfile)?;

    let mut gen = TrajFileGenerator::new(chor, trajfile, handle);

    gen.add_omni_transformer::<IntervalCountSetter>();
    gen.add_omni_transformer::<DrivetrainAndBumpersSetter>();
    gen.add_omni_transformer::<ConstraintSetter>();
    gen.add_omni_transformer::<CallbackSetter>();

    gen.generate()
}
