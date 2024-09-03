#![allow(clippy::missing_errors_doc)]

use std::any::Any;
use std::sync::mpsc::{channel, Receiver, Sender};
use std::sync::OnceLock;

use trajoptlib::{
    DifferentialTrajectory, SwerveTrajectory,
};

use super::transformers::{DrivetrainAndBumpersSetter, IntervalCountSetter, TrajFileGenerator};
use crate::spec::project::ProjectFile;
use crate::spec::traj::{ConstraintScope, SampleType, TrajFile};
use crate::{ChoreoResult, ResultExt};

/**
 * A [`OnceLock`] is a synchronization primitive that can be written to
 * once. Used here to create a read-only static reference to the sender,
 * even though the sender can't be constructed in a static context.
 */
pub static PROGRESS_SENDER_LOCK: OnceLock<Sender<LocalProgressUpdate>> = OnceLock::new();

fn swerve_status_callback(traj: SwerveTrajectory, handle: i64) {
    let tx_opt = PROGRESS_SENDER_LOCK.get();
    if let Some(tx) = tx_opt {
        tx.send(LocalProgressUpdate::SwerveTraj {
            update: traj,
            handle,
        })
        .trace_warn();
    };
}

fn diff_status_callback(traj: DifferentialTrajectory, handle: i64) {
    let tx_opt = PROGRESS_SENDER_LOCK.get();
    if let Some(tx) = tx_opt {
        tx.send(LocalProgressUpdate::DiffTraj {
            update: traj,
            handle,
        })
        .trace_warn();
    };
}

fn fix_scope(idx: usize, removed_idxs: &Vec<usize>) -> usize {
    let mut to_subtract: usize = 0;
    for removed in removed_idxs {
        if *removed < idx {
            to_subtract += 1;
        }
    }
    idx - to_subtract
}

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
        let mut serde_state = serde::Serializer::serialize_struct(serializer, "LocalProgressUpdate", 3)?;
        serde::ser::SerializeStruct::serialize_field(&mut serde_state, "handle", &self.handle())?;
        match self {
            LocalProgressUpdate::SwerveTraj { update, .. } => {
                serde::ser::SerializeStruct::serialize_field(&mut serde_state, "type", "swerveTraj")?;
                serde::ser::SerializeStruct::serialize_field(&mut serde_state, "update", update)?;
            }
            LocalProgressUpdate::DiffTraj { update, .. } => {
                serde::ser::SerializeStruct::serialize_field(&mut serde_state, "type", "diffTraj")?;
                serde::ser::SerializeStruct::serialize_field(&mut serde_state, "update", update)?;
            }
            LocalProgressUpdate::DiagnosticText { update, .. } => {
                serde::ser::SerializeStruct::serialize_field(&mut serde_state, "type", "diagnosticText")?;
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

fn set_initial_guess(traj: &mut TrajFile) {
    fn set_initial_guess_wpt(traj: &mut TrajFile, idx: usize) {
        let wpt = &mut traj.params.waypoints[idx];
        wpt.is_initial_guess = true;
    }
    let waypoint_count = traj.params.waypoints.len();
    for constraint in traj.params.snapshot().constraints {
        let from = constraint.from.get_idx(waypoint_count);
        let to = constraint.to.as_ref().and_then(|id| id.get_idx(waypoint_count));

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

pub fn generate(
    chor: &ProjectFile,
    mut path: TrajFile,
    // The handle referring to this path for the solver state callback
    handle: i64
) -> ChoreoResult<TrajFile> {
    set_initial_guess(&mut path);

    let mut ctx = TrajFileGenerator::new(chor.clone(), path.clone());

    ctx.add_swerve_transformer::<IntervalCountSetter>();
    ctx.add_swerve_transformer::<DrivetrainAndBumpersSetter>();
    ctx.add_diffy_transformer::<DrivetrainAndBumpersSetter>();

    // for constraint in &constraint_idx {
    //     let from = fix_scope(constraint.from, &guess_point_idxs);
    //     let to_opt = constraint.to.map(|idx| fix_scope(idx, &guess_point_idxs));
    //     match constraint.data {
    //         ConstraintData::PointAt {
    //             x,
    //             y,
    //             tolerance,
    //             flip,
    //         } => match to_opt {
    //             None => traj_builder.wpt_point_at(from, x, y, tolerance, flip),
    //             Some(to) => traj_builder.sgmt_point_at(from, to, x, y, tolerance, flip),
    //         },
    //         ConstraintData::MaxVelocity { max } => match to_opt {
    //             None => traj_builder.wpt_linear_velocity_max_magnitude(from, max),
    //             Some(to) => traj_builder.sgmt_linear_velocity_max_magnitude(from, to, max),
    //         },
    //         ConstraintData::MaxAcceleration { max } => match to_opt {
    //             None => traj_builder.wpt_linear_acceleration_max_magnitude(from, max),
    //             Some(to) => traj_builder.sgmt_linear_acceleration_max_magnitude(from, to, max),
    //         },
    //         ConstraintData::MaxAngularVelocity { max } => match to_opt {
    //             None => traj_builder.wpt_angular_velocity_max_magnitude(from, max),
    //             Some(to) => traj_builder.sgmt_angular_velocity_max_magnitude(from, to, max),
    //         },
    //         ConstraintData::StopPoint {} => {
    //             if to_opt.is_none() {
    //                 traj_builder.wpt_linear_velocity_max_magnitude(from, 0.0f64);
    //                 traj_builder.wpt_angular_velocity_max_magnitude(from, 0.0f64);
    //             }
    //         }
    //     };
    // }

    let sample_type = if diffy { SampleType::Differential } else { SampleType::Swerve };
    ctx.generate(sample_type, handle, features)

}
