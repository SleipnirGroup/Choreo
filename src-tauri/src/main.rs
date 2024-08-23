// Prevents additional console window on Windows in release, DO NOT REMOVE!!
//#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod document;
mod util;
use document::v2025_0_0::{
    expr, Bumper, ChoreoPath, Constraint, ConstraintData, ConstraintIDX, ConstraintType, Module,
    Output, Project, RobotConfig, Sample, Traj, Variables, Waypoint, WaypointID,
};
use std::collections::HashMap;
use std::f64::consts::PI;
use std::sync::mpsc::{channel, Sender};
use std::sync::OnceLock;
use std::{fs, path::Path};
use std::{thread, vec};
use tauri::regex::{escape, Regex};

use document::intervals::guess_control_interval_counts;
use tauri::{
    api::{dialog::blocking::FileDialogBuilder, file},
    Manager,
};
use trajoptlib::{Pose2d, SwerveDrivetrain, SwervePathBuilder, SwerveTrajectory, Translation2d};

#[derive(Clone, serde::Serialize, Debug)]
struct OpenFileEventPayload<'a> {
    dir: Option<&'a str>,
    name: Option<&'a str>,
    contents: Option<&'a str>,
    adjacent_gradle: bool,
}

#[tauri::command]
async fn contains_build_gradle(dir: Option<&Path>) -> Result<bool, &'static str> {
    dir.map_or_else(
        || Err("Directory does not exist"),
        |dir_path| {
            let mut found_build_gradle = false;
            for entry in dir_path.read_dir().expect("read_dir call failed").flatten() {
                found_build_gradle |= entry.file_name().eq("build.gradle")
            }
            Ok(found_build_gradle)
        },
    )
}

#[tauri::command]
async fn open_file_dialog(app_handle: tauri::AppHandle) {
    let file_path = FileDialogBuilder::new()
        .set_title("Open a .chor file")
        .add_filter("Choreo Save File", &["chor"])
        .pick_file();
    // TODO: Replace with if-let chains (https://github.com/rust-lang/rfcs/pull/2497)
    if let Some(path) = file_path {
        if let Some(dir) = path.parent() {
            if let Some(name) = path.file_name() {
                if let Ok(adjacent_gradle) = contains_build_gradle(Some(dir)).await {
                    let _ = app_handle.emit_all(
                        "open-file",
                        OpenFileEventPayload {
                            dir: dir.as_os_str().to_str(),
                            name: name.to_str(),
                            contents: file::read_string(path.clone()).ok().as_deref(),
                            adjacent_gradle,
                        },
                    );
                }
            }
        }
    }
}

// parameters:
// - dir: the directory of the file
// - path: the path of the file with .chor extension
#[tauri::command]
async fn file_event_payload_from_dir(
    app_handle: tauri::AppHandle,
    dir: String,
    path: String,
    name: String,
) -> Result<(), String> {
    let dir = Path::new(&dir);
    let adjacent_gradle = contains_build_gradle(Some(dir)).await?;
    let contents = file::read_string(path.clone()).map_err(|err| err.to_string())?;
    let payload = OpenFileEventPayload {
        dir: dir.as_os_str().to_str(),
        name: Some(&name),
        contents: Some(contents.as_str()),
        adjacent_gradle,
    };
    app_handle
        .emit_all("file_event_payload_from_dir", payload)
        .map_err(|err| err.to_string())?;

    Ok(())
}

#[tauri::command]
async fn delete_file(dir: String, name: String) {
    let dir_path = Path::new(&dir);
    let name_path = Path::join(dir_path, name);
    let _ = fs::remove_file(name_path);
}

#[tauri::command]
async fn delete_traj_segments(dir: String, traj_name: String) -> Result<(), String> {
    let dir_path = Path::new(&dir);
    if dir_path.is_dir() {
        let traj_segment_regex =
            Regex::new(format!(r"{}\.\d+\.traj", escape(traj_name.as_str())).as_str()).ok();
        if traj_segment_regex.is_none() {
            return Err(format!("{} was an invalid trajectory name", traj_name));
        } else {
            let re = traj_segment_regex.unwrap();
            let entries = fs::read_dir(dir);
            if entries.is_err() {
                return Err(entries.expect_err("").to_string());
            }
            let entries = entries.unwrap();
            for entry in entries {
                if entry.is_err() {
                    return Err(entry.expect_err("").to_string());
                }
                let path = entry.unwrap().path();
                if path.is_file() {
                    let matches = path.file_name().map_or(false, |file_name| {
                        let file_str = file_name.to_str();
                        file_str.map_or(false, |file_str| re.is_match(file_str))
                    });
                    if matches {
                        let _ = fs::remove_file(path);
                    } else {
                        continue;
                    }
                } else {
                    continue;
                }
            }
        }
        Ok(())
    } else {
        Err(format!("{} was not a directory", dir).to_string())
    }
}

#[tauri::command]
async fn delete_dir(dir: String) {
    let dir_path = Path::new(&dir);
    let _ = fs::remove_dir_all(dir_path);
}

#[tauri::command]
async fn save_file(dir: String, name: String, contents: String) -> Result<(), &'static str> {
    let dir_path = Path::new(&dir);
    let name_path = Path::join(dir_path, name);
    if name_path.is_relative() {
        return Err("Dir needs to be absolute");
    }
    let _ = fs::create_dir_all(dir_path);
    if fs::write(name_path, contents).is_err() {
        return Err("Failed file writing");
    }
    Ok(())
}

#[tauri::command]
async fn open_file_app(dir: String) {
    let _ = open::that(dir);
}

#[allow(non_snake_case)]
#[derive(serde::Serialize, serde::Deserialize)]
struct ChoreoWaypoint {
    x: f64,
    y: f64,
    heading: f64,
    isInitialGuess: bool,
    fixTranslation: bool,
    fixHeading: bool,
    controlIntervalCount: usize,
}

#[allow(non_snake_case)]
#[derive(serde::Serialize, serde::Deserialize)]
struct ChoreoRobotConfig {
    mass: f64,
    inertia: f64,
    wheelMaxVelocity: f64,
    wheelMaxTorque: f64,
    radius: f64,
    bumperWidth: f64,
    bumperLength: f64,
    wheelbase: f64,
    trackWidth: f64,
}

#[allow(non_snake_case)]
#[derive(serde::Serialize, serde::Deserialize)]
struct ChoreoSegmentScope {
    start: usize,
    end: usize,
}

#[allow(non_snake_case)]
#[derive(serde::Serialize, serde::Deserialize)]
#[serde(untagged)]
enum ChoreoConstraintScope {
    Segment([usize; 2]),
    Waypoint([usize; 1]),
}

#[derive(serde::Serialize, serde::Deserialize)]
#[serde(tag = "type")]
// Add constraint type, scope, and properties
enum Constraints {
    WptVelocityDirection {
        scope: ChoreoConstraintScope,
        direction: f64,
    },
    StopPoint {
        scope: ChoreoConstraintScope,
    },
    MaxVelocity {
        scope: ChoreoConstraintScope,
        velocity: f64,
    },
    MaxAngularVelocity {
        scope: ChoreoConstraintScope,
        angular_velocity: f64,
    },
    MaxAcceleration {
        scope: ChoreoConstraintScope,
        acceleration: f64,
    },
    StraightLine {
        scope: ChoreoConstraintScope,
    },
    PointAt {
        scope: ChoreoConstraintScope,
        x: f64,
        y: f64,
        tolerance: f64,
    },
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
#[allow(non_snake_case)]
struct CircleObstacle {
    x: f64,
    y: f64,
    radius: f64,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
#[allow(non_snake_case)]
struct PolygonObstacle {
    x: Vec<f64>,
    y: Vec<f64>,
    radius: f64,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
#[allow(non_snake_case)]
enum Obstacle {
    Circle(CircleObstacle),
    Polygon(PolygonObstacle),
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

#[tauri::command]
async fn cancel() {
    trajoptlib::cancel_all();
}

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
struct ProgressUpdate {
    traj: SwerveTrajectory,
    handle: i64,
}

// #[allow(non_snake_case)]
// #[tauri::command]
// async fn generate_trajectory(
//     _app_handle: tauri::AppHandle,
//     path: Vec<ChoreoWaypoint>,
//     config: ChoreoRobotConfig,
//     constraints: Vec<Constraints>,
//     circleObstacles: Vec<CircleObstacle>,
//     polygonObstacles: Vec<PolygonObstacle>,
//     // The handle referring to this path for the solver state callback
//     handle: i64,
// ) -> Result<SwerveTrajectory, String> {
//     let mut path_builder = SwervePathBuilder::new();
//     let mut wpt_cnt: usize = 0;
//     let mut rm: Vec<usize> = Vec::new();
//     let mut control_interval_counts: Vec<usize> = Vec::new();
//     let mut guess_points_after_waypoint: Vec<Pose2d> = Vec::new();
//     for i in 0..path.len() {
//         let wpt: &ChoreoWaypoint = &path[i];
//         if wpt.isInitialGuess {
//             let guess_point = Pose2d {
//                 x: wpt.x,
//                 y: wpt.y,
//                 heading: wpt.heading,
//             };
//             guess_points_after_waypoint.push(guess_point);
//             rm.push(i);
//             if let Some(last) = control_interval_counts.last_mut() {
//                 *last += wpt.intervals;
//             }
//         } else {
//             if wpt_cnt > 0 {
//                 path_builder.sgmt_initial_guess_points(wpt_cnt - 1, &guess_points_after_waypoint);
//             }

//             guess_points_after_waypoint.clear();
//             if wpt.fixHeading && wpt.fixTranslation {
//                 path_builder.pose_wpt(wpt_cnt, wpt.x, wpt.y, wpt.heading);
//                 wpt_cnt += 1;
//             } else if wpt.fixTranslation {
//                 path_builder.translation_wpt(wpt_cnt, wpt.x, wpt.y, wpt.heading);
//                 wpt_cnt += 1;
//             } else {
//                 path_builder.empty_wpt(wpt_cnt, wpt.x, wpt.y, wpt.heading);
//                 wpt_cnt += 1;
//             }
//             if i != path.len() - 1 {
//                 control_interval_counts.push(wpt.intervals);
//             }
//         }
//     }

//     path_builder.set_control_interval_counts(control_interval_counts);

//     for constraint in &constraints {
//         match constraint {
//             Constraints::WptVelocityDirection { scope, direction } => {
//                 if let ChoreoConstraintScope::Waypoint(idx) = scope {
//                     path_builder.wpt_linear_velocity_direction(fix_scope(idx[0], &rm), *direction);
//                 }
//             }
//             Constraints::StopPoint { scope } => {
//                 if let ChoreoConstraintScope::Waypoint(idx) = scope {
//                     path_builder.wpt_linear_velocity_max_magnitude(fix_scope(idx[0], &rm), 0.0f64);
//                     path_builder.wpt_angular_velocity_max_magnitude(fix_scope(idx[0], &rm), 0.0f64);
//                 }
//             }
//             Constraints::MaxVelocity { scope, velocity } => match scope {
//                 ChoreoConstraintScope::Waypoint(idx) => path_builder
//                     .wpt_linear_velocity_max_magnitude(fix_scope(idx[0], &rm), *velocity),
//                 ChoreoConstraintScope::Segment(idx) => path_builder
//                     .sgmt_linear_velocity_max_magnitude(
//                         fix_scope(idx[0], &rm),
//                         fix_scope(idx[1], &rm),
//                         *velocity,
//                     ),
//             },
//             Constraints::MaxAngularVelocity {
//                 scope,
//                 angular_velocity,
//             } => match scope {
//                 ChoreoConstraintScope::Waypoint(idx) => path_builder
//                     .wpt_angular_velocity_max_magnitude(fix_scope(idx[0], &rm), *angular_velocity),
//                 ChoreoConstraintScope::Segment(idx) => path_builder
//                     .sgmt_angular_velocity_max_magnitude(
//                         fix_scope(idx[0], &rm),
//                         fix_scope(idx[1], &rm),
//                         *angular_velocity,
//                     ),
//             },
//             Constraints::MaxAcceleration {
//                 scope,
//                 acceleration,
//             } => match scope {
//                 ChoreoConstraintScope::Waypoint(idx) => path_builder
//                     .wpt_linear_acceleration_max_magnitude(fix_scope(idx[0], &rm), *acceleration),
//                 ChoreoConstraintScope::Segment(idx) => path_builder
//                     .sgmt_linear_acceleration_max_magnitude(
//                         fix_scope(idx[0], &rm),
//                         fix_scope(idx[1], &rm),
//                         *acceleration,
//                     ),
//             },
//             Constraints::StraightLine { scope } => {
//                 if let ChoreoConstraintScope::Segment(idx) = scope {
//                     for point in idx[0]..idx[1] {
//                         let this_pt = fix_scope(point, &rm);
//                         let next_pt = fix_scope(point + 1, &rm);
//                         if this_pt != fix_scope(idx[0], &rm) {
//                             // points in between straight-line segments are automatically zero-velocity points
//                             path_builder.wpt_linear_velocity_max_magnitude(this_pt, 0.0f64);
//                         }
//                         let x1 = path[this_pt].x;
//                         let x2 = path[next_pt].x;
//                         let y1 = path[this_pt].y;
//                         let y2 = path[next_pt].y;
//                         path_builder.sgmt_linear_velocity_direction(
//                             this_pt,
//                             next_pt,
//                             (y2 - y1).atan2(x2 - x1),
//                         )
//                     }
//                 }
//             }
//             Constraints::PointAt {
//                 scope,
//                 x,
//                 y,
//                 tolerance,
//             } => match scope {
//                 ChoreoConstraintScope::Waypoint(idx) => {
//                     path_builder.wpt_point_at(fix_scope(idx[0], &rm), *x, *y, *tolerance)
//                 }
//                 ChoreoConstraintScope::Segment(idx) => path_builder.sgmt_point_at(
//                     fix_scope(idx[0], &rm),
//                     fix_scope(idx[1], &rm),
//                     *x,
//                     *y,
//                     *tolerance,
//                 ),
//             }, // add more cases here to impl each constraint.
//         }
//     }
//     let half_wheel_base = config.wheelbase / 2.0;
//     let half_track_width = config.trackWidth / 2.0;
//     let drivetrain = SwerveDrivetrain {
//         mass: config.mass,
//         moi: config.inertia,
//         wheel_radius: config.radius,
//         wheel_max_angular_velocity: config.wheelMaxVelocity,
//         wheel_max_torque: config.wheelMaxTorque,
//         modules: vec![
//             Translation2d {
//                 x: half_wheel_base,
//                 y: half_track_width,
//             },
//             Translation2d {
//                 x: half_wheel_base,
//                 y: -half_track_width,
//             },
//             Translation2d {
//                 x: -half_wheel_base,
//                 y: half_track_width,
//             },
//             Translation2d {
//                 x: -half_wheel_base,
//                 y: -half_track_width,
//             },
//         ],
//     };

//     path_builder.set_bumpers(config.bumperLength, config.bumperWidth);
//     path_builder.add_progress_callback(solver_status_callback);
//     // Skip obstacles for now while we figure out whats wrong with them
//     for o in circleObstacles {
//         path_builder.sgmt_circle_obstacle(0, wpt_cnt - 1, o.x, o.y, o.radius);
//     }

//     // Skip obstacles for now while we figure out whats wrong with them
//     for o in polygonObstacles {
//         path_builder.sgmt_polygon_obstacle(0, wpt_cnt - 1, o.x, o.y, o.radius);
//     }
//     path_builder.set_drivetrain(&drivetrain);
//     path_builder.generate(true, handle)
// }

#[allow(non_snake_case)]
#[tauri::command]
async fn generate(
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
                        .into_iter()
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
                                out.fx[i] = x.unwrap_or(&0.0).clone();
                                out.fy[i] = (y.unwrap_or(&0.0)).clone();
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
/**
 * A OnceLock is a synchronization primitive that can be written to once. Used here to
 * create a read-only static reference to the sender, even though the sender can't be
 * constructed in a static context.
 */
static PROGRESS_SENDER_LOCK: OnceLock<Sender<ProgressUpdate>> = OnceLock::new();
fn solver_status_callback(traj: SwerveTrajectory, handle: i64) {
    let tx_opt = PROGRESS_SENDER_LOCK.get();
    if let Some(tx) = tx_opt {
        let _ = tx.send(ProgressUpdate { traj, handle });
    };
}

fn main() {
    let (tx, rx) = channel::<ProgressUpdate>();
    PROGRESS_SENDER_LOCK.get_or_init(move || tx);

    tauri::Builder::default()
        .setup(|app| {
            tauri::async_runtime::spawn(async {
                let project = Project {
                    version: "v2025.0.0".to_string(),
                    variables: Variables {
                        expressions: HashMap::new(),
                        poses: HashMap::new(),
                    },
                    config: RobotConfig {
                        gearing: expr("6.5", 6.5),
                        radius: expr("2 in", 0.0508),
                        vmax: expr("6000.0 RPM", 6000.0),
                        tmax: expr("1.2 N*m", 1.2),
                        modules: [
                            Module {
                                x: expr("11 in", 0.2794),
                                y: expr("11 in", 0.2794),
                            },
                            Module {
                                x: expr("-11 in", -0.2794),
                                y: expr("11 in", 0.2794),
                            },
                            Module {
                                x: expr("-11 in", -0.2794),
                                y: expr("-11 in", -0.2794),
                            },
                            Module {
                                x: expr("11 in", 0.2794),
                                y: expr("-11 in", -0.2794),
                            },
                        ],
                        mass: expr("150 lbs", 76.0),
                        inertia: expr("6 kg m^2", 6.0),
                        bumper: Bumper {
                            front: expr("16 in", 0.4),
                            left: expr("16 in", 0.4),
                            back: expr("16 in", 0.4),
                            right: expr("16 in", 0.4),
                        },
                    },
                };
                // println!("{:?}", project);
                // let stringified = serde_json::to_string::<Project>(&project);
                // println!("{:?}", stringified.unwrap());

                let traj = Traj {
                    name: "Simple Auto".to_string(),
                    version: "v2025.0.0".to_string(),
                    path: ChoreoPath {
                        waypoints: vec![
                            Waypoint {
                                x: expr("0", 0.0),
                                y: expr("0", 0.0),
                                heading: expr("0", 0.0),
                                intervals: 30,
                                split: false,
                                fixTranslation: true,
                                fixHeading: true,
                            },
                            Waypoint {
                                x: expr("1", 1.0),
                                y: expr("0", 0.0),
                                heading: expr("0", 0.0),
                                intervals: 30,
                                split: false,
                                fixTranslation: true,
                                fixHeading: true,
                            },
                        ],
                        constraints: vec![Constraint {
                            from: WaypointID::Idx(0),
                            to: Some(WaypointID::Idx(1)),
                            data: ConstraintData::MaxVelocity {
                                max: expr("3 m/s", 3.0),
                            },
                        }],
                    },
                    snapshot: None,
                    traj: Output {
                        waypoints: vec![],
                        samples: vec![],
                    },
                };

                // let stringified = serde_json::to_string::<Traj>(&traj);
                // println!("{:?}", stringified.unwrap());
                // let traj = generate(project, traj, 0).await;

                // let after = serde_json::to_string::<Traj>(&traj.unwrap());
                // println!("{:?}", after.unwrap());
            });
            let progress_emitter = app.handle().clone();
            thread::spawn(move || {
                for received in rx {
                    let _ = progress_emitter.emit_all("solver-status", received);
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            generate,
            guess_control_interval_counts,
            cancel,
            open_file_dialog,
            file_event_payload_from_dir,
            save_file,
            contains_build_gradle,
            delete_file,
            delete_dir,
            delete_traj_segments,
            open_file_app
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
