// Prevents additional console window on Windows in release, DO NOT REMOVE!!
// #![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use trajoptlib::{SwervePathBuilder, HolonomicTrajectory, SwerveDrivetrain, SwerveModule};
// A way to make properties that exist on all enum variants accessible from the generic variant
// I have no idea how it works but it came from
// https://users.rust-lang.org/t/generic-referencing-enum-inner-data/66342/9
macro_rules! define_enum_macro {
  ($Type:ident, $($variant:ident),+ $(,)?) => {
      define_enum_macro!{#internal, [$], $Type, $($variant),+}
  };
  (#internal, [$dollar:tt], $Type:ident, $($variant:ident),+) => {
      macro_rules! $Type {
          ($dollar($field:ident $dollar(: $p:pat)?,)* ..) => {
              $($Type::$variant { $dollar($field $dollar(: $p)?,)* .. } )|+
          }
      }
  };
}

#[allow(non_snake_case)]
#[derive(serde::Serialize, serde::Deserialize)]
struct ChoreoWaypoint {
    x: f64,
    y: f64,
    heading: f64,
    velocityMagnitude: f64,
    velocityAngle: f64,
    angularVelocity: f64,
    translationConstrained: bool,
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

#[allow(non_snake_case)]
#[derive(serde::Serialize, serde::Deserialize)]
struct ChoreoSegmentScope {
  start: usize, end:usize
}

#[allow(non_snake_case)]
#[derive(serde::Serialize, serde::Deserialize)]
#[serde(untagged)]
enum ChoreoConstraintScope {
  
  Segment(ChoreoSegmentScope),
  Waypoint(usize)
}

#[derive(serde::Serialize, serde::Deserialize)]
#[serde(tag="type")]
// Add constraint type, scope, and properties
enum Constraints {
  WptVelocityDirection{scope: ChoreoConstraintScope, direction:f64},
  WptZeroVelocity{scope: ChoreoConstraintScope},
  MaxVelocity{scope: ChoreoConstraintScope, velocity:f64},
  ZeroAngularVelocity{scope: ChoreoConstraintScope}
}
// Also add the constraint type here
define_enum_macro!(Constraints, BoundsZeroVelocity, WptVelocityDirection, WptZeroVelocity);

#[tauri::command]
async fn generate_trajectory(path: Vec<ChoreoWaypoint>, config: ChoreoRobotConfig, constraints: Vec<Constraints>) -> Result<HolonomicTrajectory, String> {

    let mut path_builder = SwervePathBuilder::new();
    for i in 0..path.len() {
        let wpt: &ChoreoWaypoint = &path[i];
        if wpt.headingConstrained {
            path_builder.pose_wpt(i, wpt.x, wpt.y, wpt.heading);
        } else {
            path_builder.translation_wpt(i, wpt.x, wpt.y, wpt.heading);
        }
    }
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
          match scope { ChoreoConstraintScope::Waypoint(idx) => {
              println!("WptVelocityDirection {} {}", *idx, *direction);
              path_builder.wpt_linear_velocity_direction(*idx, *direction);
            },_ => {}}
        },
        Constraints::WptZeroVelocity { scope } => {
          match scope { ChoreoConstraintScope::Waypoint(idx) => {
              println!("WptZeroVelocity {}", *idx);
              path_builder.wpt_linear_velocity_max_magnitude(*idx, 0.0f64);
            },_=>{}}
        },
        Constraints::MaxVelocity { scope , velocity} => {
          match scope { ChoreoConstraintScope::Waypoint(idx) => {
              println!("WptMaxVelocity {}", *idx);
              path_builder.wpt_linear_velocity_max_magnitude(*idx, *velocity)
            },
            ChoreoConstraintScope::Segment(range) => {
              println!("From {} to {}", range.start, range.end);
              path_builder.sgmt_linear_velocity_max_magnitude(range.start, range.end, *velocity)
            }}
        },
        Constraints::ZeroAngularVelocity { scope } => {
          match scope { ChoreoConstraintScope::Waypoint(idx) => {
              println!("WptMaxVelocity {}", *idx);
              path_builder.wpt_angular_velocity(*idx, 0.0)
            },
            ChoreoConstraintScope::Segment(range) => {
              println!("From {} to {}", range.start, range.end);
              path_builder.sgmt_angular_velocity(range.start, range.end, 0.0)
            }}
        },
        // add more cases here to impl each constraint.
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
    //path_builder.set_bumpers(config.bumperLength, config.bumperWidth);
    path_builder.sgmt_circle_obstacle(0, path.len()-1, 3.0, 3.0, 1.0);
    path_builder.set_drivetrain(&drivetrain);
    path_builder.generate()
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![generate_trajectory])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
