// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{fs, path::Path};
use tauri::{
    api::{dialog::blocking::FileDialogBuilder, file},
    Manager,
};
use trajoptlib::{
    HolonomicTrajectory, InitialGuessPoint, SwerveDrivetrain, SwerveModule, SwervePathBuilder,
};
// A way to make properties that exist on all enum variants accessible from the generic variant
// I have no idea how it works but it came from
// https://users.rust-lang.org/t/generic-referencing-enum-inner-data/66342/9
// macro_rules! define_enum_macro {
//   ($Type:ident, $($variant:ident),+ $(,)?) => {
//       define_enum_macro!{#internal, [$], $Type, $($variant),+}
//   };
//   (#internal, [$dollar:tt], $Type:ident, $($variant:ident),+) => {
//       macro_rules! $Type {
//           ($dollar($field:ident $dollar(: $p:pat)?,)* ..) => {
//               $($Type::$variant { $dollar($field $dollar(: $p)?,)* .. } )|+
//           }
//       }
//   };
// }

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
            for entry in dir_path.read_dir().expect("read_dir call failed") {
                if let Ok(other_file) = entry {
                    found_build_gradle |= other_file.file_name().eq("build.gradle")
                }
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
    match file_path {
        Some(path) => {
            let dir = path.parent();
            let name = path.file_name();
            let adjacent_gradle = contains_build_gradle(dir).await;
            if dir.is_some() && name.is_some() && adjacent_gradle.is_ok() {
                let _ = app_handle.emit_all(
                    "open-file",
                    OpenFileEventPayload {
                        dir: dir.unwrap().as_os_str().to_str(),
                        name: name.unwrap().to_str(),
                        contents: file::read_string(path.clone()).ok().as_deref(),
                        adjacent_gradle: adjacent_gradle.unwrap_or(false),
                    },
                );
            }
        }
        None => {}
    }
}

#[tauri::command]
async fn delete_file(dir: String, name: String) {
    let dir_path = Path::new(&dir);
    let name_path = Path::join(dir_path, name);
    let _ = fs::remove_file(name_path);
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
    WptZeroVelocity {
        scope: ChoreoConstraintScope,
    },
    StopPoint {
        scope: ChoreoConstraintScope,
    },
    MaxVelocity {
        scope: ChoreoConstraintScope,
        velocity: f64,
    },
    ZeroAngularVelocity {
        scope: ChoreoConstraintScope,
    },
    StraightLine {
        scope: ChoreoConstraintScope,
    },
}
// Also add the constraint type here
//define_enum_macro!(BoundsZeroVelocity, WptVelocityDirection, WptZeroVelocity);

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
    return idx - to_subtract;
}

#[tauri::command]
async fn cancel() {
    let mut builder = SwervePathBuilder::new();
    builder.cancel_all();
}

#[allow(non_snake_case)]
#[tauri::command]
async fn generate_trajectory(
    path: Vec<ChoreoWaypoint>,
    config: ChoreoRobotConfig,
    constraints: Vec<Constraints>,
    circleObstacles: Vec<CircleObstacle>,
    polygonObstacles: Vec<PolygonObstacle>,
) -> Result<HolonomicTrajectory, String> {
    let mut path_builder = SwervePathBuilder::new();
    let mut wpt_cnt: usize = 0;
    let mut rm: Vec<usize> = Vec::new();
    let mut control_interval_counts: Vec<usize> = Vec::new();
    for i in 0..path.len() {
        let wpt: &ChoreoWaypoint = &path[i];
        if wpt.isInitialGuess {
            let guess_point: InitialGuessPoint = InitialGuessPoint {
                x: wpt.x,
                y: wpt.y,
                heading: wpt.heading,
            };
            path_builder.sgmt_initial_guess_points(wpt_cnt, &vec![guess_point]);
            rm.push(i);
            if let Some(last) = control_interval_counts.last_mut() {
                *last += wpt.controlIntervalCount;
            }
        } else {
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

    for c in 0..constraints.len() {
        let constraint: &Constraints = &constraints[c];
        match constraint {
            Constraints::WptVelocityDirection { scope, direction } => {
                // maybe make a macro or find a way to specify some constraints have a specific scope
                /*
                ifWaypoint((idx)=>{
                    println!("WptVelocityDirection {} {}", *idx, *direction);
                    path_builder.wpt_velocity_direction(*idx, *direction);
                })
                */
                match scope {
                    ChoreoConstraintScope::Waypoint(idx) => {
                        path_builder
                            .wpt_linear_velocity_direction(fix_scope(idx[0], &rm), *direction);
                    }
                    _ => {}
                }
            }
            Constraints::WptZeroVelocity { scope } => match scope {
                ChoreoConstraintScope::Waypoint(idx) => {
                    path_builder.wpt_linear_velocity_max_magnitude(fix_scope(idx[0], &rm), 0.0f64);
                }
                _ => {}
            },
            Constraints::StopPoint { scope } => match scope {
                ChoreoConstraintScope::Waypoint(idx) => {
                    path_builder.wpt_linear_velocity_max_magnitude(fix_scope(idx[0], &rm), 0.0f64);
                    path_builder.wpt_angular_velocity(fix_scope(idx[0], &rm), 0.0);
                }
                _ => {}
            },
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
            Constraints::ZeroAngularVelocity { scope } => match scope {
                ChoreoConstraintScope::Waypoint(idx) => {
                    path_builder.wpt_angular_velocity(fix_scope(idx[0], &rm), 0.0)
                }
                ChoreoConstraintScope::Segment(idx) => path_builder.sgmt_angular_velocity(
                    fix_scope(idx[0], &rm),
                    fix_scope(idx[1], &rm),
                    0.0,
                ),
            },
            Constraints::StraightLine { scope } => {
                match scope {
                    ChoreoConstraintScope::Segment(idx) => {
                        println!("Scope {} {}", idx[0], idx[1]);
                        for point in idx[0]..idx[1] {
                            let this_pt = fix_scope(point, &rm);
                            let next_pt = fix_scope(point + 1, &rm);
                            println!("{} {}", this_pt, next_pt);
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
                    _ => {}
                }
            } // add more cases here to impl each constraint.
        }
        // The below might be helpful
        // let Constraints!(scope, ..) = constraint;
        // match scope {
        //   ChoreoConstraintScope::Full(_) =>
        //     println!("Full Path")
        //   ,
        //   ChoreoConstraintScope::Segment(range) =>
        //     println!("From {} to {}", range.start, range.end),
        //   ChoreoConstraintScope::Waypoint(idx) =>
        //     println!("At {}", idx)
        // }
    }
    let half_wheel_base = config.wheelbase / 2.0;
    let half_track_width = config.trackWidth / 2.0;
    let drivetrain = SwerveDrivetrain {
        mass: config.mass,
        moi: config.rotationalInertia,
        modules: vec![
            SwerveModule {
                x: half_wheel_base,
                y: half_track_width,
                wheel_radius: config.wheelRadius,
                wheel_max_angular_velocity: config.wheelMaxVelocity,
                wheel_max_torque: config.wheelMaxTorque,
            },
            SwerveModule {
                x: half_wheel_base,
                y: -half_track_width,
                wheel_radius: config.wheelRadius,
                wheel_max_angular_velocity: config.wheelMaxVelocity,
                wheel_max_torque: config.wheelMaxTorque,
            },
            SwerveModule {
                x: -half_wheel_base,
                y: half_track_width,
                wheel_radius: config.wheelRadius,
                wheel_max_angular_velocity: config.wheelMaxVelocity,
                wheel_max_torque: config.wheelMaxTorque,
            },
            SwerveModule {
                x: -half_wheel_base,
                y: -half_track_width,
                wheel_radius: config.wheelRadius,
                wheel_max_angular_velocity: config.wheelMaxVelocity,
                wheel_max_torque: config.wheelMaxTorque,
            },
        ],
    };

    path_builder.set_bumpers(config.bumperLength, config.bumperWidth);

    // Skip obstacles for now while we figure out whats wrong with them
    // for o in circleObstacles {
    //   path_builder.sgmt_circle_obstacle(0, wpt_cnt - 1, o.x, o.y, o.radius);
    // }

    // Skip obstacles for now while we figure out whats wrong with them
    // for o in polygonObstacles {
    //   path_builder.sgmt_polygon_obstacle(0, wpt_cnt - 1, o.x, o.y, o.radius);
    // }
    path_builder.set_drivetrain(&drivetrain);
    path_builder.generate()
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            generate_trajectory,
            cancel,
            open_file_dialog,
            save_file,
            contains_build_gradle,
            delete_file,
            open_file_app
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
