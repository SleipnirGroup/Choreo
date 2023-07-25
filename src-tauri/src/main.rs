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
    velocityMagnitude: f64,
    velocityAngle: f64,
    angularVelocity: f64,
    xConstrained: bool,
    yConstrained: bool,
    headingConstrained: bool,
    velocityMagnitudeConstrained: bool,
    velocityAngleConstrained: bool,
    angularVelocityConstrained: bool
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
  trackWidth: f64
}

#[tauri::command]
async fn generate_trajectory(path: Vec<UWEWaypoint>, config: ChoreoRobotConfig) -> Result<HolonomicTrajectory, String> {
    let mut path_builder = SwervePathBuilder::new();
    for i in 0..path.len() {
        let wpt = &path[i];
        if wpt.headingConstrained {
            path_builder.pose_wpt(i, wpt.x, wpt.y, wpt.heading);
        } else {
            path_builder.translation_wpt(i, wpt.x, wpt.y, wpt.heading);
        }

        if wpt.velocityAngleConstrained && wpt.velocityMagnitudeConstrained {
            path_builder.wpt_velocity_polar(i, wpt.velocityMagnitude, wpt.velocityAngle);
        } else if wpt.velocityAngleConstrained {
            path_builder.wpt_velocity_direction(i, wpt.velocityAngle);
        } else if wpt.velocityMagnitudeConstrained {
            path_builder.wpt_velocity_magnitude(i, wpt.velocityMagnitude);
        }

        if wpt.angularVelocityConstrained {
            path_builder.wpt_angular_velocity(i, wpt.angularVelocity);
        }
    }
    path_builder.wpt_zero_velocity(0);
    path_builder.wpt_zero_angular_velocity(0);
    path_builder.wpt_zero_velocity(path.len() - 1);
    path_builder.wpt_zero_angular_velocity(path.len() - 1);
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
            wheel_max_torque: config.wheelMaxTorque
          },
          SwerveModule {
            x: half_wheel_base,
            y: -half_track_width,
            wheel_radius: config.wheelRadius,
            wheel_max_angular_velocity: config.wheelMaxVelocity,
            wheel_max_torque: config.wheelMaxTorque
          },
          SwerveModule {
            x: -half_wheel_base,
            y: half_track_width,
            wheel_radius: config.wheelRadius,
            wheel_max_angular_velocity: config.wheelMaxVelocity,
            wheel_max_torque: config.wheelMaxTorque
          },
          SwerveModule {
            x: -half_wheel_base,
            y: -half_track_width,
            wheel_radius: config.wheelRadius,
            wheel_max_angular_velocity: config.wheelMaxVelocity,
            wheel_max_torque: config.wheelMaxTorque
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
