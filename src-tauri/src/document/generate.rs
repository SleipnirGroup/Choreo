
use super::v2025_0_0::{
    expr, Bumper, ChoreoPath, Constraint, ConstraintData, ConstraintIDX, ConstraintType, Module,
    Output, Project, RobotConfig, Sample, Traj, Variables, Waypoint, WaypointID,
};
use std::collections::HashMap;
use std::f64::consts::PI;
use std::ffi::OsStr;
use std::sync::mpsc::{channel, Receiver, Sender};
use std::sync::OnceLock;
use std::{thread, vec};
use tauri::regex::{escape, Regex};

use super::intervals::guess_control_interval_counts;
use trajoptlib::{Pose2d, SwerveDrivetrain, SwervePathBuilder, SwerveTrajectory};

fn fix_scope(idx: usize, removed_idxs: &Vec<usize>) -> usize {
    let mut to_subtract: usize = 0;
    for removed in removed_idxs {
        if *removed < idx {
            to_subtract += 1;
        }
    }
    idx - to_subtract
}

#[tauri::command]
pub async fn cancel() {
    trajoptlib::cancel_all();
}

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
pub struct ProgressUpdate {
    traj: SwerveTrajectory,
    handle: i64,
}

pub fn setup_progress_sender() -> Receiver<ProgressUpdate> {
    let (tx, rx) = channel::<ProgressUpdate>();
    PROGRESS_SENDER_LOCK.get_or_init(move || tx);
    rx
}

#[allow(non_snake_case)]
#[tauri::command]
pub async fn generate(
    chor: Project,
    traj: Traj,
    // The handle referring to this path for the solver state callback
    handle: i64,
) -> Result<Traj, String> {
    let mut path_builder = SwervePathBuilder::new();
    let mut wpt_cnt: usize = 0;
    let mut rm: Vec<usize> = Vec::new();
    let mut control_interval_counts: Vec<usize> = Vec::new();
    let mut guess_points_after_waypoint: Vec<Pose2d> = Vec::new();

    let snapshot = traj.path.snapshot();
    let path = &snapshot.waypoints;
    if path.len() < 2 {
        return Err("Path needs at least 2 waypoints.".to_string());
    }
    let num_wpts = path.len();
    let mut constraint_idx = Vec::<ConstraintIDX<f64>>::new();
    // Step 1; Find out which waypoints are unconstrained in translation and heading and also not the endpoint of another constraint.
    let mut isInitialGuess = vec![true; path.len()];

    // Convert constraints to index form. Throw out constraints without valid index
    for constraint in &snapshot.constraints {
        let from = constraint.from.to_idx(&num_wpts);
        let to = constraint.to.as_ref().and_then(|id| id.to_idx(&num_wpts));
        // from and to are None if they did not point to a valid waypoint.
        match from {
            None => {}
            Some(from_idx) => {
                let validWpt = to.is_none();
                let validSgmt = to.is_some();
                // Check for valid scope
                if match constraint.data.scope() {
                    ConstraintType::Waypoint => validWpt,
                    ConstraintType::Segment => validSgmt,
                    ConstraintType::Both => validWpt || validSgmt,
                } {
                    isInitialGuess[from_idx] = false;
                    let mut fixed_to = to;
                    let mut fixed_from = from_idx;
                    match to {
                        Some(to_idx) => {
                            if to_idx < from_idx {
                                fixed_to = Some(from_idx);
                                fixed_from = to_idx;
                            }
                            if to_idx == from_idx {
                                if constraint.data.scope() == ConstraintType::Segment {
                                    continue;
                                }
                                fixed_to = None;
                            } else {
                                isInitialGuess[to_idx] = false;
                            }
                        }
                        _ => {}
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
    for i in 0..path.len() {
        let wpt = &path[i];

        if isInitialGuess[i] && !wpt.fixHeading && !wpt.fixTranslation {
            let guess_point = Pose2d {
                x: wpt.x,
                y: wpt.y,
                heading: wpt.heading,
            };
            guess_points_after_waypoint.push(guess_point);
            rm.push(i);
            if let Some(last) = control_interval_counts.last_mut() {
                *last += wpt.intervals;
            }
        } else {
            if wpt_cnt > 0 {
                path_builder.sgmt_initial_guess_points(wpt_cnt - 1, &guess_points_after_waypoint);
            }

            guess_points_after_waypoint.clear();
            if wpt.fixHeading && wpt.fixTranslation {
                path_builder.pose_wpt(wpt_cnt, wpt.x, wpt.y, wpt.heading);
            } else if wpt.fixTranslation {
                path_builder.translation_wpt(wpt_cnt, wpt.x, wpt.y, wpt.heading);
            } else {
                path_builder.empty_wpt(wpt_cnt, wpt.x, wpt.y, wpt.heading);
            }
            wpt_cnt += 1;
            if i != path.len() - 1 {
                control_interval_counts.push(wpt.intervals);
            }
        }
    }

    path_builder.set_control_interval_counts(control_interval_counts);

    for constraint in &constraint_idx {
        let from = fix_scope(constraint.from, &rm);
        let to_opt = constraint.to.map(|idx| fix_scope(idx, &rm));
        match constraint.data {
            ConstraintData::PointAt {
                x,
                y,
                tolerance,
                flip: _,
            } => {
                println!("{}, {}, {}, {}", x, y, tolerance, from);
                match to_opt {
                    None => path_builder.wpt_point_at(from, x, y, tolerance),
                    Some(to) => path_builder.sgmt_point_at(from, to, x, y, tolerance),
                }
            }
            ConstraintData::MaxVelocity { max } => match to_opt {
                None => path_builder.wpt_linear_velocity_max_magnitude(from, max),
                Some(to) => path_builder.sgmt_linear_velocity_max_magnitude(from, to, max),
            },
            ConstraintData::MaxAcceleration { max } => match to_opt {
                None => path_builder.wpt_linear_acceleration_max_magnitude(from, max),
                Some(to) => path_builder.sgmt_linear_acceleration_max_magnitude(from, to, max),
            },
            ConstraintData::StopPoint {} => match to_opt {
                None => {
                    path_builder.wpt_linear_velocity_max_magnitude(from, 0.0f64);
                    path_builder.wpt_angular_velocity_max_magnitude(from, 0.0f64);
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
        wheel_max_angular_velocity: (config.vmax / config.gearing) * 2.0 * PI / 60.0,
        wheel_max_torque: config.tmax * config.gearing,
        modules: config
            .modules
            .map(|modu: Module<f64>| modu.translation())
            .to_vec(),
    };

    path_builder.set_bumpers(
        config.bumper.back + config.bumper.front,
        config.bumper.left + config.bumper.right,
    );
    path_builder.add_progress_callback(solver_status_callback);
    // Skip obstacles for now while we figure out whats wrong with them
    // for o in circleObstacles {
    //     path_builder.sgmt_circle_obstacle(0, wpt_cnt - 1, o.x, o.y, o.radius);
    // }

    // Skip obstacles for now while we figure out whats wrong with them
    // for o in polygonObstacles {
    //     path_builder.sgmt_polygon_obstacle(0, wpt_cnt - 1, o.x, o.y, o.radius);
    // }
    path_builder.set_drivetrain(&drivetrain);
    //Err("".to_string())
    let result = path_builder.generate(true, handle)?;

    Ok(postprocess(result, traj, snapshot))
}

fn postprocess(result: SwerveTrajectory, traj: Traj, snapshot: ChoreoPath<f64>) -> Traj {
    let mut new_traj = traj.clone();

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
                    .map(|s| s.timestamp)
                    .unwrap_or(0.0),
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
    new_traj.traj.samples = splits
        .windows(2) // get adjacent pairs of interval counts
        .filter_map(|window| {
            result
                .samples
                .get((window[0])..(window[1]) + 1) // grab the range including both endpoints
                .map(|slice| {
                    // convert into samples
                    slice
                        .iter()
                        .map(|swerve_sample| {
                            let mut out = Sample {
                                t: swerve_sample.timestamp,
                                x: swerve_sample.x,
                                y: swerve_sample.y,
                                vx: swerve_sample.velocity_x,
                                vy: swerve_sample.velocity_y,
                                heading: swerve_sample.heading,
                                omega: swerve_sample.angular_velocity,
                                fx: [0.0, 0.0, 0.0, 0.0],
                                fy: [0.0, 0.0, 0.0, 0.0],
                            };
                            for i in 0..4 {
                                let x = swerve_sample.module_forces_x.get(i);
                                let y = swerve_sample.module_forces_y.get(i);
                                out.fx[i] = *x.unwrap_or(&0.0);
                                out.fy[i] = *(y.unwrap_or(&0.0));
                            }
                            out
                        })
                        .collect::<Vec<Sample>>()
                })
        })
        .collect::<Vec<Vec<Sample>>>();
    new_traj.traj.waypoints = waypoint_times;
    new_traj.snapshot = Some(snapshot);
    new_traj
}

fn solver_status_callback(traj: SwerveTrajectory, handle: i64) {
    let tx_opt = PROGRESS_SENDER_LOCK.get();
    if let Some(tx) = tx_opt {
        let _ = tx.send(ProgressUpdate { traj, handle });
    };
}

/**
 * A OnceLock is a synchronization primitive that can be written to once. Used here to
 * create a read-only static reference to the sender, even though the sender can't be
 * constructed in a static context.
 */
pub static PROGRESS_SENDER_LOCK: OnceLock<Sender<ProgressUpdate>> = OnceLock::new();