// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use trajoptlib::{SwervePathBuilder, HolonomicTrajectory, SwerveDrivetrain, SwerveModule};

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[allow(non_snake_case)]
#[derive(serde::Serialize, serde::Deserialize)]
struct UWEWaypoint {
    x: f64,
    y: f64,
    heading: f64,
    xConstrained: bool,
    yConstrained: bool,
    headingConstrained: bool,
    controlIntervalCount: u64
}

// #[derive(serde::Serialize, serde::Deserialize)]
// struct UWEPath {
//     waypoints: Vec<UWEWaypoint>
// }


#[tauri::command]
async fn generate_trajectory(path: Vec<UWEWaypoint>) -> Result<HolonomicTrajectory, String> {
    let mut path_builder = SwervePathBuilder::new();
    for i in 0..path.len() {
        let wpt = &path[i];
        path_builder.pose_wpt(i, wpt.x, wpt.y, wpt.heading);
    }
    let drivetrain = SwerveDrivetrain {
        mass: 45.0,
        moi: 6.0,
        modules: vec![
          SwerveModule {
            x: 0.6,
            y: 0.6,
            wheel_radius: 0.04,
            wheel_max_angular_velocity: 70.0,
            wheel_max_torque: 2.0
          },
          SwerveModule {
            x: 0.6,
            y: -0.6,
            wheel_radius: 0.04,
            wheel_max_angular_velocity: 70.0,
            wheel_max_torque: 2.0
          },
          SwerveModule {
            x: -0.6,
            y: 0.6,
            wheel_radius: 0.04,
            wheel_max_angular_velocity: 70.0,
            wheel_max_torque: 2.0
          },
          SwerveModule {
            x: -0.6,
            y: -0.6,
            wheel_radius: 0.04,
            wheel_max_angular_velocity: 70.0,
            wheel_max_torque: 2.0
          }
        ]
      };
    path_builder.set_drivetrain(&drivetrain);
    path_builder.generate()
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![greet])
        .invoke_handler(tauri::generate_handler![generate_trajectory])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
