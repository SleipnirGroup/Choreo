use crate::document::types::ConstraintData;
use crate::util::math_util::angle_modulus;

use super::types::{Expr, RobotConfig, Traj, Waypoint};
// A value version since commands don't support borrows, but we need the borrow version for generation.
#[tauri::command]
pub fn cmd_guess_control_interval_counts(
    config: RobotConfig<Expr>,
    traj: Traj,
) -> Result<Vec<usize>, String> {
    guess_control_interval_counts(&config, &traj)
}
pub fn guess_control_interval_counts(
    config: &RobotConfig<Expr>,
    traj: &Traj,
) -> Result<Vec<usize>, String> {
    let config = config.snapshot();
    if config.wheel_max_torque() <= 0.0 {
        return Err("Wheel max torque must be positive".to_string());
    } else if config.wheel_max_velocity() <= 0.0 {
        return Err("Wheel max velocity must be positive".to_string());
    } else if config.mass <= 0.0 {
        return Err("Robot mass must be positive".to_string());
    } else if config.radius <= 0.0 {
        return Err("Wheel radius must be positive".to_string());
    }
    Ok(traj
        .path
        .waypoints
        .iter()
        .enumerate()
        .map(|(i, w)| {
            if w.overrideIntervals {
                w.intervals
            } else {
                guess_control_interval_count(i, traj, config, w)
            }
        })
        .collect::<Vec<usize>>())
}
pub fn guess_control_interval_count(
    i: usize,
    traj: &Traj,
    config: RobotConfig<f64>,
    w: &Waypoint<Expr>,
) -> usize {
    let this = w.snapshot();
    let next = traj.path.waypoints.get(i + 1).map(|w| w.snapshot());
    match next {
        None => this.intervals,
        Some(next) => {
            let dx = next.x - this.x;
            let dy = next.y - this.y;
            let dtheta = angle_modulus(next.heading - this.heading).abs();
            let distance = dx.hypot(dy);
            let max_force = config.wheel_max_torque() / config.radius;

            // Default to robotConfig's max velocity and acceleration
            let mut max_vel = config.wheel_max_velocity() * config.radius;
            let mut max_accel = (max_force * 4.0) / config.mass; // times 4 for 4 modules

            // find max wheel position radius for calculating max angular velocity
            let max_wheel_distance = config
                .modules
                .iter()
                .fold(0f64, |max, &module| max.max(module.x.hypot(module.y)));
            let max_ang_vel = max_vel / max_wheel_distance;

            // use peak angular velocity and dtheta to calculate the time
            // for theta to travel a cubic hermite spline profile
            // in which the max angular velocity is not exceeded as an estimate
            let time = (1.5 * dtheta) / max_ang_vel;
            max_vel = max_vel.min(distance / time);

            // Iterate through constraints to find applicable "Max Velocity" and "Max Acceleration" constraints
            traj.path
                .constraints
                .iter()
                .map(|c| c.snapshot())
                .for_each(|constraint| {
                    if let Some(to) = constraint
                        .to
                        .and_then(|id| id.get_idx(&traj.path.waypoints.len()))
                    {
                        if let Some(from) = constraint.from.get_idx(&traj.path.waypoints.len()) {
                            if i < to && i >= from {
                                match constraint.data {
                                    ConstraintData::MaxVelocity { max } => {
                                        max_vel = max_vel.min(max)
                                    }
                                    ConstraintData::MaxAcceleration { max } => {
                                        max_accel = max_accel.min(max)
                                    }
                                    ConstraintData::MaxAngularVelocity { max } => {
                                        // avoid divide by 0
                                        if max >= 0.1 {
                                            // see note above for math reasoning
                                            let time = (1.5 * dtheta) / max;
                                            max_vel = max_vel.min(distance / time);
                                        }
                                    }
                                    _ => {}
                                };
                            }
                        }
                    }
                });

            let distance_at_cruise = distance - (max_vel * max_vel) / max_accel;
            let total_time = if distance_at_cruise < 0.0 {
                // triangle
                2.0 * ((distance * max_accel).sqrt() / max_accel)
            } else {
                // trapezoid
                distance / max_vel + max_vel / max_accel
            };
            (total_time / 0.1).ceil() as usize
        }
    }
}
