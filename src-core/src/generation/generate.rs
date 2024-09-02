#![allow(clippy::missing_errors_doc)]

use std::sync::mpsc::{channel, Receiver, Sender};
use std::sync::{Arc, OnceLock};
use std::vec;

use dashmap::DashMap;
use tokio::sync::oneshot::Sender as OneshotSender;
use trajoptlib::{
    DifferentialTrajectory, Pose2d, SwerveDrivetrain, SwervePathBuilder, SwerveTrajectory
};

use super::intervals::guess_control_interval_counts;
use crate::error::ChoreoError;
use crate::spec::project::{Module, ProjectFile};
use crate::spec::traj::{
    ConstraintData, ConstraintIDX, ConstraintScope, Parameters, Sample, TrajFile
};
use crate::{ChoreoResult, ResultExt};



/**
 * A [`OnceLock`] is a synchronization primitive that can be written to
 * once. Used here to create a read-only static reference to the sender,
 * even though the sender can't be constructed in a static context.
 */
pub static PROGRESS_SENDER_LOCK: OnceLock<Sender<LocalProgressUpdate>> = OnceLock::new();

fn solver_status_callback(traj: SwerveTrajectory, handle: i64) {
    let tx_opt = PROGRESS_SENDER_LOCK.get();
    if let Some(tx) = tx_opt {
        tx.send(LocalProgressUpdate::SwerveTraj { traj, handle }).trace_warn();
    };
}

pub fn fix_scope(idx: usize, removed_idxs: &Vec<usize>) -> usize {
    let mut to_subtract: usize = 0;
    for removed in removed_idxs {
        if *removed < idx {
            to_subtract += 1;
        }
    }
    idx - to_subtract
}

#[derive(Debug, serde::Serialize, Clone)]
#[serde(untagged)]
pub enum LocalProgressUpdate {
    SwerveTraj {
        traj: SwerveTrajectory,
        handle: i64,
    },
    TankTraj {
        traj: DifferentialTrajectory,
        handle: i64,
    },
}

#[derive(Clone)]
#[allow(missing_debug_implementations)]
pub struct RemoteGenerationResources {
    frontend_emitter: Option<Sender<LocalProgressUpdate>>,
    kill_map: Arc<DashMap<i64, OneshotSender<()>>>,
}

impl RemoteGenerationResources {
    /**
     * Should be called after [`setup_progress_sender`] to ensure that the sender is initialized.
     */
    #[allow(clippy::new_without_default)]
    pub fn new() -> Self {
        Self {
            frontend_emitter: PROGRESS_SENDER_LOCK.get().cloned(),
            kill_map: Arc::new(DashMap::new()),
        }
    }

    pub fn add_killer(&self, handle: i64, sender: OneshotSender<()>) {
        self.kill_map.insert(handle, sender);
    }

    pub fn kill(&self, handle: i64) -> ChoreoResult<()> {
        self.kill_map
            .remove(&handle)
            .ok_or(ChoreoError::OutOfBounds("Handle", "not found"))
            .map(|(_, sender)| {
                let _ = sender.send(());
            })
    }

    pub fn kill_all(&self) {
        let handles = self
            .kill_map
            .iter()
            .map(|r| *r.key())
            .collect::<vec::Vec<i64>>();
        for handle in handles {
            let _ = self.kill(handle);
        }
    }

    pub fn emit_progress(&self, update: LocalProgressUpdate) {
        if let Some(emitter) = &self.frontend_emitter {
            emitter.send(update).trace_warn();
        }
    }
}

pub fn setup_progress_sender() -> Receiver<LocalProgressUpdate> {
    let (tx, rx) = channel::<LocalProgressUpdate>();
    let _ = PROGRESS_SENDER_LOCK.get_or_init(move || tx);
    rx
}

pub fn convert_constraints_to_index(
    path_snapshot: &Parameters<f64>,
    num_wpts: usize,
) -> (Vec<ConstraintIDX<f64>>, Vec<bool>) {
    let mut constraint_idx = Vec::<ConstraintIDX<f64>>::new();
    // Step 1; Find out which waypoints are unconstrained in translation and heading
    // and also not the endpoint of another constraint.
    let mut is_initial_guess = vec![true; num_wpts];
    for constraint in &path_snapshot.constraints {
        let from = constraint.from.get_idx(num_wpts);
        let to = constraint.to.as_ref().and_then(|id| id.get_idx(num_wpts));
        // from and to are None if they did not point to a valid waypoint.
        match from {
            None => {}
            Some(from_idx) => {
                let valid_wpt = to.is_none();
                let valid_sgmt = to.is_some();
                // Check for valid scope
                if match constraint.data.scope() {
                    ConstraintScope::Waypoint => valid_wpt,
                    ConstraintScope::Segment => valid_sgmt,
                    ConstraintScope::Both => valid_wpt || valid_sgmt,
                } {
                    is_initial_guess[from_idx] = false;
                    let mut fixed_to = to;
                    let mut fixed_from = from_idx;
                    if let Some(to_idx) = to {
                        if to_idx < from_idx {
                            fixed_to = Some(from_idx);
                            fixed_from = to_idx;
                        }
                        if to_idx == from_idx {
                            if constraint.data.scope() == ConstraintScope::Segment {
                                continue;
                            }
                            fixed_to = None;
                        } else {
                            is_initial_guess[to_idx] = false;
                        }
                    }
                    constraint_idx.push(ConstraintIDX {
                        from: fixed_from,
                        to: fixed_to,
                        data: constraint.data,
                    });
                }
            }
        };
    }
    (constraint_idx, is_initial_guess)
}

pub fn generate(
    chor: &ProjectFile,
    traj: TrajFile,
    // The handle referring to this path for the solver state callback
    handle: i64,
) -> ChoreoResult<TrajFile> {
    let mut traj_builder = SwervePathBuilder::new();
    let mut wpt_cnt: usize = 0;
    // tracks which idxs were guess points, which get added differently and require
    // adjusting indexes after them
    let mut guess_point_idxs: Vec<usize> = Vec::new();
    let mut control_interval_counts: Vec<usize> = Vec::new();
    let mut guess_points_after_waypoint: Vec<Pose2d> = Vec::new();

    let snapshot = traj.params.snapshot();

    let path = &snapshot.waypoints;

    let num_wpts = path.len();

    if num_wpts < 2 {
        return Err(ChoreoError::OutOfBounds("Waypoints", "at least 2"));
    }
    let counts_vec = guess_control_interval_counts(&chor.config, &traj)?;
    if counts_vec.len() != num_wpts {
        return Err(ChoreoError::Inequality(
            "Control interval counts",
            "waypoint count",
        ));
    }
    let (constraint_idx, is_initial_guess) = convert_constraints_to_index(&snapshot, num_wpts);
    for i in 0..num_wpts {
        let wpt = &path[i];
        // add initial guess points (actually unconstrained empty wpts in Choreo terms)
        if is_initial_guess[i] && !wpt.fix_heading && !wpt.fix_translation {
            let guess_point = Pose2d {
                x: wpt.x,
                y: wpt.y,
                heading: wpt.heading,
            };
            guess_points_after_waypoint.push(guess_point);
            guess_point_idxs.push(i);
            if let Some(last) = control_interval_counts.last_mut() {
                *last += counts_vec[i];
            }
        } else {
            if wpt_cnt > 0 {
                traj_builder.sgmt_initial_guess_points(wpt_cnt - 1, &guess_points_after_waypoint);
            }

            guess_points_after_waypoint.clear();
            if wpt.fix_heading && wpt.fix_translation {
                traj_builder.pose_wpt(wpt_cnt, wpt.x, wpt.y, wpt.heading);
            } else if wpt.fix_translation {
                traj_builder.translation_wpt(wpt_cnt, wpt.x, wpt.y, wpt.heading);
            } else {
                traj_builder.empty_wpt(wpt_cnt, wpt.x, wpt.y, wpt.heading);
            }
            wpt_cnt += 1;
            if i != num_wpts - 1 {
                control_interval_counts.push(counts_vec[i]);
            }
        }
    }

    traj_builder.set_control_interval_counts(control_interval_counts);

    for constraint in &constraint_idx {
        let from = fix_scope(constraint.from, &guess_point_idxs);
        let to_opt = constraint.to.map(|idx| fix_scope(idx, &guess_point_idxs));
        match constraint.data {
            ConstraintData::PointAt {
                x,
                y,
                tolerance,
                flip,
            } => match to_opt {
                None => traj_builder.wpt_point_at(from, x, y, tolerance, flip),
                Some(to) => traj_builder.sgmt_point_at(from, to, x, y, tolerance, flip),
            },
            ConstraintData::MaxVelocity { max } => match to_opt {
                None => traj_builder.wpt_linear_velocity_max_magnitude(from, max),
                Some(to) => traj_builder.sgmt_linear_velocity_max_magnitude(from, to, max),
            },
            ConstraintData::MaxAcceleration { max } => match to_opt {
                None => traj_builder.wpt_linear_acceleration_max_magnitude(from, max),
                Some(to) => traj_builder.sgmt_linear_acceleration_max_magnitude(from, to, max),
            },
            ConstraintData::MaxAngularVelocity { max } => match to_opt {
                None => traj_builder.wpt_angular_velocity_max_magnitude(from, max),
                Some(to) => traj_builder.sgmt_angular_velocity_max_magnitude(from, to, max),
            },
            ConstraintData::StopPoint {} => match to_opt {
                None => {
                    traj_builder.wpt_linear_velocity_max_magnitude(from, 0.0f64);
                    traj_builder.wpt_angular_velocity_max_magnitude(from, 0.0f64);
                }
                Some(_) => (),
            },
        };
    }
    let config = chor.config.snapshot();
    let drivetrain = SwerveDrivetrain {
        mass: config.mass,
        moi: config.inertia,
        wheel_radius: config.radius,
        // rad per sec
        wheel_max_angular_velocity: config.vmax / config.gearing,
        wheel_max_torque: config.tmax * config.gearing,
        modules: config
            .modules
            .map(|modu: Module<f64>| modu.translation())
            .to_vec(),
    };

    traj_builder.set_bumpers(
        config.bumper.back + config.bumper.front,
        config.bumper.left + config.bumper.right,
    );
    traj_builder.add_progress_callback(solver_status_callback);
    // Skip obstacles for now while we figure out whats wrong with them
    // for o in circleObstacles {
    //     path_builder.sgmt_circle_obstacle(0, wpt_cnt - 1, o.x, o.y, o.radius);
    // }

    // Skip obstacles for now while we figure out whats wrong with them
    // for o in polygonObstacles {
    //     path_builder.sgmt_polygon_obstacle(0, wpt_cnt - 1, o.x, o.y, o.radius);
    // }
    traj_builder.set_drivetrain(&drivetrain);
    //Err("".to_string())
    let result = traj_builder
        .generate(true, handle)
        .map_err(ChoreoError::TrajOpt)?;

    Ok(postprocess(&result, traj, snapshot, counts_vec))
}

fn postprocess(
    result: &SwerveTrajectory,
    mut traj: TrajFile,
    mut snapshot: Parameters<f64>,
    counts_vec: Vec<usize>,
) -> TrajFile {
    traj.params
        .waypoints
        .iter_mut()
        .zip(snapshot.waypoints.iter_mut())
        .zip(counts_vec)
        .for_each(|w| {
            w.0 .0.intervals = w.1;
            w.0 .1.intervals = w.1;
        });
    // convert the result from trajoptlib to a format matching the save file.
    // Calculate the waypoint timing
    let mut interval = 0;
    let intervals = snapshot
        .waypoints
        .iter()
        .enumerate()
        .map(|pt| {
            let total_intervals = interval;
            interval += pt.1.intervals;
            (
                pt.1.split || pt.0 == 0 || pt.0 == snapshot.waypoints.len() - 1,
                total_intervals,
                result
                    .samples
                    .get(total_intervals)
                    .map_or(0.0, |s| s.timestamp),
            )
        })
        .collect::<Vec<(bool, usize, f64)>>();

    let waypoint_times = intervals.iter().map(|a| a.2).collect::<Vec<f64>>();
    // Calculate splits
    let splits = intervals
        .iter()
        .filter(|a| a.0) // filter by split flag
        .map(|a| a.1) // map to associate interval
        .collect::<Vec<usize>>();
    let nudge_zero = |f: f64| if f.abs() < 1e-12 { 0.0 } else { f };
    traj.traj.samples = splits
        .windows(2) // get adjacent pairs of interval counts
        .filter_map(|window| {
            result
                .samples
                // grab the range including both endpoints,
                // there are no bounds checks on this slice so be weary of crashes
                .get((window[0])..=(window[1]))
                .map(|slice| {
                    // convert into samples
                    slice
                        .iter()
                        .map(|swerve_sample| Sample::Swerve {
                            t: nudge_zero(swerve_sample.timestamp),
                            x: nudge_zero(swerve_sample.x),
                            y: nudge_zero(swerve_sample.y),
                            vx: nudge_zero(swerve_sample.velocity_x),
                            vy: nudge_zero(swerve_sample.velocity_y),
                            heading: nudge_zero(swerve_sample.heading),
                            omega: nudge_zero(swerve_sample.angular_velocity),
                            fx: if traj.traj.forces_available {
                                [
                                    nudge_zero(swerve_sample.module_forces_x[0]),
                                    nudge_zero(swerve_sample.module_forces_x[1]),
                                    nudge_zero(swerve_sample.module_forces_x[2]),
                                    nudge_zero(swerve_sample.module_forces_x[3]),
                                ]
                            } else {
                                [0.0, 0.0, 0.0, 0.0]
                            },
                            fy: if traj.traj.forces_available {
                                [
                                    nudge_zero(swerve_sample.module_forces_y[0]),
                                    nudge_zero(swerve_sample.module_forces_y[1]),
                                    nudge_zero(swerve_sample.module_forces_y[2]),
                                    nudge_zero(swerve_sample.module_forces_y[3]),
                                ]
                            } else {
                                [0.0, 0.0, 0.0, 0.0]
                            },
                        })
                        .collect::<Vec<Sample>>()
                })
        })
        .collect::<Vec<Vec<Sample>>>();
    traj.traj.waypoints = waypoint_times;
    traj.snapshot = Some(snapshot);
    traj
}
