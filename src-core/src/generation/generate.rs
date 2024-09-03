#![allow(clippy::missing_errors_doc)]

use std::sync::mpsc::{channel, Receiver, Sender};
use std::sync::OnceLock;

use trajoptlib::{DifferentialTrajectory, SwerveTrajectory};

use super::transformers::{
    CallbackSetter, ConstraintSetter, DrivetrainAndBumpersSetter, IntervalCountSetter,
    TrajFileGenerator,
};
use crate::spec::project::ProjectFile;
use crate::spec::traj::{ConstraintScope, TrajFile};
use crate::ChoreoResult;

/**
 * A [`OnceLock`] is a synchronization primitive that can be written to
 * once. Used here to create a read-only static reference to the sender,
 * even though the sender can't be constructed in a static context.
 */
pub(super) static PROGRESS_SENDER_LOCK: OnceLock<Sender<LocalProgressUpdate>> = OnceLock::new();

#[derive(Debug, Clone)]
// #[serde(rename_all = "camelCase", tag = "type")]
pub enum LocalProgressUpdate {
    SwerveTraj {
        handle: i64,
        // #[serde(flatten, rename = "update")]
        update: SwerveTrajectory,
    },
    DiffTraj {
        handle: i64,
        // #[serde(flatten, rename = "update")]
        update: DifferentialTrajectory,
    },
    DiagnosticText {
        handle: i64,
        update: String,
    },
}

impl LocalProgressUpdate {
    pub fn handle(&self) -> i64 {
        match self {
            LocalProgressUpdate::SwerveTraj { handle, .. } => *handle,
            LocalProgressUpdate::DiffTraj { handle, .. } => *handle,
            LocalProgressUpdate::DiagnosticText { handle, .. } => *handle,
        }
    }
}

impl serde::Serialize for LocalProgressUpdate {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        let mut serde_state =
            serde::Serializer::serialize_struct(serializer, "LocalProgressUpdate", 3)?;
        serde::ser::SerializeStruct::serialize_field(&mut serde_state, "handle", &self.handle())?;
        match self {
            LocalProgressUpdate::SwerveTraj { update, .. } => {
                serde::ser::SerializeStruct::serialize_field(
                    &mut serde_state,
                    "type",
                    "swerveTraj",
                )?;
                serde::ser::SerializeStruct::serialize_field(
                    &mut serde_state,
                    "update",
                    &update.samples,
                )?;
            }
            LocalProgressUpdate::DiffTraj { update, .. } => {
                serde::ser::SerializeStruct::serialize_field(&mut serde_state, "type", "diffTraj")?;
                serde::ser::SerializeStruct::serialize_field(
                    &mut serde_state,
                    "update",
                    &update.samples,
                )?;
            }
            LocalProgressUpdate::DiagnosticText { update, .. } => {
                serde::ser::SerializeStruct::serialize_field(
                    &mut serde_state,
                    "type",
                    "diagnosticText",
                )?;
                serde::ser::SerializeStruct::serialize_field(&mut serde_state, "update", update)?;
            }
        };
        serde::ser::SerializeStruct::end(serde_state)
    }
}

pub fn setup_progress_sender() -> Receiver<LocalProgressUpdate> {
    let (tx, rx) = channel::<LocalProgressUpdate>();
    let _ = PROGRESS_SENDER_LOCK.get_or_init(move || tx);
    rx
}

/// TODO: This definetly isn't correctly implemented
fn set_initial_guess(traj: &mut TrajFile) {
    fn set_initial_guess_wpt(traj: &mut TrajFile, idx: usize) {
        let wpt = &mut traj.params.waypoints[idx];
        wpt.is_initial_guess = true;
    }
    let waypoint_count = traj.params.waypoints.len();
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
            if !match constraint.data.scope() {
                ConstraintScope::Waypoint => valid_wpt,
                ConstraintScope::Segment => valid_sgmt,
                ConstraintScope::Both => valid_wpt || valid_sgmt,
            } {
                set_initial_guess_wpt(traj, from_idx);
            }
        }
    }
}

pub fn generate(chor: ProjectFile, mut trajfile: TrajFile, handle: i64) -> ChoreoResult<TrajFile> {
    set_initial_guess(&mut trajfile);

    let mut gen = TrajFileGenerator::new(chor, trajfile, handle);

    gen.add_omni_transformer::<IntervalCountSetter>();
    gen.add_omni_transformer::<DrivetrainAndBumpersSetter>();
    gen.add_omni_transformer::<ConstraintSetter>();
    gen.add_omni_transformer::<CallbackSetter>();

    gen.generate()
}
