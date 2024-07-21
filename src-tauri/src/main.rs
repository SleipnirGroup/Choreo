// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use core::panic;
use std::sync::mpsc::{channel, Sender};
use std::sync::OnceLock;
use std::thread;
use std::{fs, path::Path};
use tauri::regex::{escape, Regex};

use tauri::{
    api::{dialog::blocking::FileDialogBuilder, file},
    Manager,
};
use trajoptlib::{DifferentialDrivetrain, DifferentialPathBuilder, DifferentialTrajectory, Pose2d, SwerveDrivetrain, SwervePathBuilder, SwerveTrajectory, Translation2d};
use trajoptlib_macros::create_builder;

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
    translationConstrained: bool,
    headingConstrained: bool,
    controlIntervalCount: usize,
}

#[allow(non_snake_case)]
#[derive(serde::Serialize, serde::Deserialize)]
struct ChoreoRobotConfig {
    mass: f64,
    rotationalInertia: f64,
    wheelMaxVelocity: f64,
    wheelMaxTorque: f64,
    wheelRadius: f64,
    bumperWidth: f64,
    bumperLength: f64,
    wheelbase: f64,
    trackWidth: f64,
    tank: bool
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

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
enum Trajectory {
    Swerve(SwerveTrajectory),
    Differential(DifferentialTrajectory)
}

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
struct ProgressUpdate {
    traj: Trajectory,
    handle: i64,
}

enum PathBuilder {
    Swerve(SwervePathBuilder),
    Differential(DifferentialPathBuilder),
}

enum Drivetrain {
    Swerve(SwerveDrivetrain),
    Differential(DifferentialDrivetrain)
}

enum ProgressCallback {
    Swerve(fn(SwerveTrajectory, i64)),
    Differential(fn(DifferentialTrajectory, i64))
}

impl PathBuilder {
    fn sgmt_initial_guess_points(&mut self, index: usize, points: &Vec<Pose2d>) {
        match self {
            PathBuilder::Swerve(builder) => builder.sgmt_initial_guess_points(index, points),
            PathBuilder::Differential(builder) => builder.sgmt_initial_guess_points(index, points),
        }
    }

    fn pose_wpt(&mut self, index: usize, x: f64, y: f64, heading: f64) {
        match self {
            PathBuilder::Swerve(builder) => builder.pose_wpt(index, x, y, heading),
            PathBuilder::Differential(builder) => builder.pose_wpt(index, x, y, heading),
        }
    }

    fn translation_wpt(&mut self, index: usize, x: f64, y: f64, heading: f64) {
        match self {
            PathBuilder::Swerve(builder) => builder.translation_wpt(index, x, y, heading),
            PathBuilder::Differential(builder) => builder.translation_wpt(index, x, y, heading),
        }
    }

    fn empty_wpt(&mut self, index: usize, x: f64, y: f64, heading: f64) {
        match self {
            PathBuilder::Swerve(builder) => builder.empty_wpt(index, x, y, heading),
            PathBuilder::Differential(builder) => builder.empty_wpt(index, x, y, heading),
        }
    }

    fn set_control_interval_counts(&mut self, counts: Vec<usize>) {
        match self {
            PathBuilder::Swerve(builder) => builder.set_control_interval_counts(counts),
            PathBuilder::Differential(builder) => builder.set_control_interval_counts(counts),
        }
    }

    fn wpt_linear_velocity_direction(&mut self, index: usize, direction: f64) {
        match self {
            PathBuilder::Swerve(builder) => builder.wpt_linear_velocity_direction(index, direction),
            PathBuilder::Differential(builder) => builder.wpt_linear_velocity_direction(index, direction),
        }
    }

    fn wpt_linear_velocity_max_magnitude(&mut self, index: usize, magnitude: f64) {
        match self {
            PathBuilder::Swerve(builder) => builder.wpt_linear_velocity_max_magnitude(index, magnitude),
            PathBuilder::Differential(builder) => builder.wpt_linear_velocity_max_magnitude(index, magnitude),
        }
    }

    fn wpt_angular_velocity_max_magnitude(&mut self, index: usize, magnitude: f64) {
        match self {
            PathBuilder::Swerve(builder) => builder.wpt_angular_velocity_max_magnitude(index, magnitude),
            PathBuilder::Differential(builder) => builder.wpt_angular_velocity_max_magnitude(index, magnitude),
        }
    }

    fn sgmt_linear_velocity_max_magnitude(&mut self, start_index: usize, end_index: usize, magnitude: f64) {
        match self {
            PathBuilder::Swerve(builder) => builder.sgmt_linear_velocity_max_magnitude(start_index, end_index, magnitude),
            PathBuilder::Differential(builder) => builder.sgmt_linear_velocity_max_magnitude(start_index, end_index, magnitude),
        }
    }

    fn sgmt_angular_velocity_max_magnitude(&mut self, start_index: usize, end_index: usize, magnitude: f64) {
        match self {
            PathBuilder::Swerve(builder) => builder.sgmt_angular_velocity_max_magnitude(start_index, end_index, magnitude),
            PathBuilder::Differential(builder) => builder.sgmt_angular_velocity_max_magnitude(start_index, end_index, magnitude),
        }
    }

    fn sgmt_linear_velocity_direction(&mut self, start_index: usize, end_index: usize, direction: f64) {
        match self {
            PathBuilder::Swerve(builder) => builder.sgmt_linear_velocity_direction(start_index, end_index, direction),
            PathBuilder::Differential(builder) => builder.sgmt_linear_velocity_direction(start_index, end_index, direction),
        }
    }

    fn wpt_point_at(&mut self, index: usize, x: f64, y: f64, tolerance: f64) {
        match self {
            PathBuilder::Swerve(builder) => builder.wpt_point_at(index, x, y, tolerance),
            PathBuilder::Differential(builder) => builder.wpt_point_at(index, x, y, tolerance),
        }
    }

    fn sgmt_point_at(&mut self, start_index: usize, end_index: usize, x: f64, y: f64, tolerance: f64) {
        match self {
            PathBuilder::Swerve(builder) => builder.sgmt_point_at(start_index, end_index, x, y, tolerance),
            _ => {}
        }
    }

    fn set_bumpers(&mut self, length: f64, width: f64) {
        match self {
            PathBuilder::Swerve(builder) => builder.set_bumpers(length, width),
            PathBuilder::Differential(builder) => builder.set_bumpers(length, width),
        }
    }

    fn add_progress_callback(&mut self, callback: ProgressCallback) {
        match self {
            PathBuilder::Swerve(builder) => {
                match callback {
                    ProgressCallback::Swerve(c) => builder.add_progress_callback(c),
                    ProgressCallback::Differential(c) => panic!("Incorrect Callback"),
                }
            },
            PathBuilder::Differential(builder) => {
                match callback {
                    ProgressCallback::Differential(c) => builder.add_progress_callback(c),
                    ProgressCallback::Swerve(c) => panic!("Incorrect Callback"),
                }
            },
        }
    }

    fn sgmt_circle_obstacle(&mut self, start_index: usize, end_index: usize, x: f64, y: f64, radius: f64) {
        match self {
            PathBuilder::Swerve(builder) => builder.sgmt_circle_obstacle(start_index, end_index, x, y, radius),
            PathBuilder::Differential(builder) => builder.sgmt_circle_obstacle(start_index, end_index, x, y, radius),
        }
    }

    fn sgmt_polygon_obstacle(&mut self, start_index: usize, end_index: usize, x: Vec<f64>, y: Vec<f64>, radius: f64) {
        match self {
            PathBuilder::Swerve(builder) => builder.sgmt_polygon_obstacle(start_index, end_index, x, y, radius),
            PathBuilder::Differential(builder) => builder.sgmt_polygon_obstacle(start_index, end_index, x, y, radius),
        }
    }

    fn set_drivetrain(&mut self, drivetrain: &Drivetrain) {
        match self {
            PathBuilder::Swerve(builder) => {
                match drivetrain {
                    Drivetrain::Swerve(drivetrain) => {
                        builder.set_drivetrain(drivetrain)
                    },
                    _ => { panic!("Incorrect Drivetrain"); }
                }
            },
            PathBuilder::Differential(builder) => {
                match drivetrain {
                    Drivetrain::Differential(drivetrain) => {
                        builder.set_drivetrain(drivetrain)
                    },
                    _ => { panic!("Incorrect Drivetrain"); }
                }
            },
        }
    }

    fn generate(&mut self, generate: bool, handle: i64) -> TrajectoryExport {
        match self {
            PathBuilder::Swerve(builder) => TrajectoryExport::Swerve(builder.generate(generate, handle)),
            PathBuilder::Differential(builder) => TrajectoryExport::Differential(builder.generate(generate, handle)),
        }
    }
}

#[derive(serde::Serialize)]
enum TrajectoryExport {
    Swerve(Result<SwerveTrajectory, String>),
    Differential(Result<DifferentialTrajectory, String>)
}

#[allow(non_snake_case)]
#[tauri::command]
async fn generate_trajectory(
    _app_handle: tauri::AppHandle,
    path: Vec<ChoreoWaypoint>,
    config: ChoreoRobotConfig,
    constraints: Vec<Constraints>,
    circleObstacles: Vec<CircleObstacle>,
    polygonObstacles: Vec<PolygonObstacle>,
    // The handle referring to this path for the solver state callback
    handle: i64,
) -> TrajectoryExport {
    create_builder!(config.tank);

    let mut wpt_cnt: usize = 0;
    let mut rm: Vec<usize> = Vec::new();
    let mut control_interval_counts: Vec<usize> = Vec::new();
    let mut guess_points_after_waypoint: Vec<Pose2d> = Vec::new();
    for i in 0..path.len() {
        let wpt: &ChoreoWaypoint = &path[i];
        if wpt.isInitialGuess {
            let guess_point = Pose2d {
                x: wpt.x,
                y: wpt.y,
                heading: wpt.heading,
            };
            guess_points_after_waypoint.push(guess_point);
            rm.push(i);
            if let Some(last) = control_interval_counts.last_mut() {
                *last += wpt.controlIntervalCount;
            }
        } else {
            if wpt_cnt > 0 {
                path_builder.sgmt_initial_guess_points(wpt_cnt - 1, &guess_points_after_waypoint);
            }

            guess_points_after_waypoint.clear();
            if wpt.headingConstrained && wpt.translationConstrained {
                path_builder.pose_wpt(wpt_cnt, wpt.x, wpt.y, wpt.heading);
                wpt_cnt += 1;
            } else if wpt.translationConstrained {
                path_builder.translation_wpt(wpt_cnt, wpt.x, wpt.y, wpt.heading);
                wpt_cnt += 1;
            } else {
                path_builder.empty_wpt(wpt_cnt, wpt.x, wpt.y, wpt.heading);
                wpt_cnt += 1;
            }
            if i != path.len() - 1 {
                control_interval_counts.push(wpt.controlIntervalCount);
            }
        }
    }

    path_builder.set_control_interval_counts(control_interval_counts);

    for constraint in &constraints {
        match constraint {
            Constraints::WptVelocityDirection { scope, direction } => {
                if let ChoreoConstraintScope::Waypoint(idx) = scope {
                    path_builder.wpt_linear_velocity_direction(fix_scope(idx[0], &rm), *direction);
                }
            }
            Constraints::StopPoint { scope } => {
                if let ChoreoConstraintScope::Waypoint(idx) = scope {
                    path_builder.wpt_linear_velocity_max_magnitude(fix_scope(idx[0], &rm), 0.0f64);
                    path_builder.wpt_angular_velocity_max_magnitude(fix_scope(idx[0], &rm), 0.0f64);
                }
            }
            Constraints::MaxVelocity { scope, velocity } => match scope {
                ChoreoConstraintScope::Waypoint(idx) => path_builder
                    .wpt_linear_velocity_max_magnitude(fix_scope(idx[0], &rm), *velocity),
                ChoreoConstraintScope::Segment(idx) => path_builder
                    .sgmt_linear_velocity_max_magnitude(
                        fix_scope(idx[0], &rm),
                        fix_scope(idx[1], &rm),
                        *velocity,
                    ),
            },
            Constraints::MaxAngularVelocity {
                scope,
                angular_velocity,
            } => match scope {
                ChoreoConstraintScope::Waypoint(idx) => path_builder
                    .wpt_angular_velocity_max_magnitude(fix_scope(idx[0], &rm), *angular_velocity),
                ChoreoConstraintScope::Segment(idx) => path_builder
                    .sgmt_angular_velocity_max_magnitude(
                        fix_scope(idx[0], &rm),
                        fix_scope(idx[1], &rm),
                        *angular_velocity,
                    ),
            },
            Constraints::StraightLine { scope } => {
                if let ChoreoConstraintScope::Segment(idx) = scope {
                    for point in idx[0]..idx[1] {
                        let this_pt = fix_scope(point, &rm);
                        let next_pt = fix_scope(point + 1, &rm);
                        if this_pt != fix_scope(idx[0], &rm) {
                            // points in between straight-line segments are automatically zero-velocity points
                            path_builder.wpt_linear_velocity_max_magnitude(this_pt, 0.0f64);
                        }
                        let x1 = path[this_pt].x;
                        let x2 = path[next_pt].x;
                        let y1 = path[this_pt].y;
                        let y2 = path[next_pt].y;
                        path_builder.sgmt_linear_velocity_direction(
                            this_pt,
                            next_pt,
                            (y2 - y1).atan2(x2 - x1),
                        )
                    }
                }
            }
            Constraints::PointAt {
                scope,
                x,
                y,
                tolerance,
            } => match scope {
                ChoreoConstraintScope::Waypoint(idx) => {
                    path_builder.wpt_point_at(fix_scope(idx[0], &rm), *x, *y, *tolerance)
                }
                ChoreoConstraintScope::Segment(idx) => path_builder.sgmt_point_at(
                    fix_scope(idx[0], &rm),
                    fix_scope(idx[1], &rm),
                    *x,
                    *y,
                    *tolerance,
                ),
            }, // add more cases here to impl each constraint.
        }
    }
    let half_wheel_base = config.wheelbase / 2.0;
    let half_track_width = config.trackWidth / 2.0;
    let drivetrain: Drivetrain;
    if config.tank {
        drivetrain = Drivetrain::Swerve(SwerveDrivetrain {
            mass: config.mass,
            moi: config.rotationalInertia,
            wheel_radius: config.wheelRadius,
            wheel_max_angular_velocity: config.wheelMaxVelocity,
            wheel_max_torque: config.wheelMaxTorque,
            modules: vec![
                Translation2d {
                    x: half_wheel_base,
                    y: half_track_width,
                },
                Translation2d {
                    x: half_wheel_base,
                    y: -half_track_width,
                },
                Translation2d {
                    x: -half_wheel_base,
                    y: half_track_width,
                },
                Translation2d {
                    x: -half_wheel_base,
                    y: -half_track_width,
                },
            ],
        });
    } else {
        drivetrain = Drivetrain::Differential(DifferentialDrivetrain {
            mass: config.mass,
            moi: config.rotationalInertia,
            trackwidth: config.trackWidth,
            wheel_max_angular_velocity: config.wheelMaxVelocity,
            wheel_max_torque: config.wheelMaxTorque,
            wheel_radius: config.wheelRadius
        })
    }

    path_builder.set_bumpers(config.bumperLength, config.bumperWidth);
    if config.tank {
        path_builder.add_progress_callback(ProgressCallback::Swerve(solver_status_callback));
    } else {
        path_builder.add_progress_callback(ProgressCallback::Differential(solver_status_callback_diff));
    }
    // Skip obstacles for now while we figure out whats wrong with them
    for o in circleObstacles {
        path_builder.sgmt_circle_obstacle(0, wpt_cnt - 1, o.x, o.y, o.radius);
    }

    // Skip obstacles for now while we figure out whats wrong with them
    for o in polygonObstacles {
        path_builder.sgmt_polygon_obstacle(0, wpt_cnt - 1, o.x, o.y, o.radius);
    }

    path_builder.set_drivetrain(&drivetrain);

    path_builder.generate(true, handle)
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
        let _ = tx.send(ProgressUpdate { traj: Trajectory::Swerve(traj), handle });
    };
}

fn solver_status_callback_diff(traj: DifferentialTrajectory, handle: i64) {
    let tx_opt = PROGRESS_SENDER_LOCK.get();
    if let Some(tx) = tx_opt {
        let _ = tx.send(ProgressUpdate { traj: Trajectory::Differential(traj), handle });
    };
}

fn main() {
    let (tx, rx) = channel::<ProgressUpdate>();
    PROGRESS_SENDER_LOCK.get_or_init(move || tx);

    tauri::Builder::default()
        .setup(|app| {
            let progress_emitter = app.handle().clone();
            thread::spawn(move || {
                for received in rx {
                    let _ = progress_emitter.emit_all("solver-status", received);
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            generate_trajectory,
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
