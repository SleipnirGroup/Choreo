use crate::error::ChoreoError;
use crate::spec::project::RobotConfig;
use crate::spec::trajectory::{ConstraintData, ConstraintScope, Parameters, Waypoint};
use crate::{angle_modulus, ChoreoResult};

pub fn initial_guess_waypoints(params: &Parameters<f64>) -> Vec<bool> {
    let waypoint_count = params.waypoints.len();
    let mut guess_points = vec![true; params.waypoints.len()];

    for constraint in &params.constraints {
        let from = constraint.from.get_idx(waypoint_count);
        let to = constraint
            .to
            .as_ref()
            .and_then(|id| id.get_idx(waypoint_count));

        if let Some(from_idx) = from {
            let valid_wpt = to.is_none();
            let valid_sgmt = to.is_some();
            // Check for valid scope
            if match constraint.data.scope() {
                ConstraintScope::Waypoint => valid_wpt,
                ConstraintScope::Segment => valid_sgmt,
                ConstraintScope::Both => valid_wpt || valid_sgmt,
            } {
                guess_points[from_idx] = false;
                match to {
                    Some(to_idx) if to_idx != from_idx => {
                        guess_points[to_idx] = false;
                    }
                    _ => {}
                }
            }
        }
    }

    guess_points
}

pub fn guess_control_interval_counts(
    config: &RobotConfig<f64>,
    params: &Parameters<f64>,
) -> ChoreoResult<Vec<usize>> {
    if config.wheel_max_torque() <= 0.0 {
        return Err(ChoreoError::sign("Wheel max torque", "positive"));
    } else if config.wheel_max_velocity() <= 0.0 {
        return Err(ChoreoError::sign("Wheel max velocity", "positive"));
    } else if config.mass <= 0.0 {
        return Err(ChoreoError::sign("Robot mass", "positive"));
    } else if config.radius <= 0.0 {
        return Err(ChoreoError::sign("Wheel radius", "positive"));
    }
    Ok(params
        .waypoints
        .iter()
        .enumerate()
        .map(|(i, w)| {
            if w.override_intervals {
                w.intervals
            } else {
                guess_control_interval_count(i, params, config, w)
            }
        })
        .collect::<Vec<usize>>())
}

pub fn guess_control_interval_count(
    i: usize,
    params: &Parameters<f64>,
    config: &RobotConfig<f64>,
    this: &Waypoint<f64>,
) -> usize {
    let next = params.waypoints.get(i + 1);
    match next {
        None => this.intervals,
        Some(next) => {
            let dx = next.x - this.x;
            let dy = next.y - this.y;
            let distance = dx.hypot(dy);
            let dtheta = angle_modulus(next.heading - this.heading).abs();
            let max_force = config.wheel_max_torque() / config.radius;

            // Default to robotConfig's max velocity and acceleration
            let mut max_linear_vel = config.wheel_max_velocity() * config.radius;
            let mut max_linear_accel = (max_force * 4.0) / config.mass; // times 4 for 4 modules

            // find max wheel position radius for calculating max angular velocity
            let max_wheel_position_radius =
                config.back_left.radius().max(config.front_left.radius());
            let mut max_ang_vel = max_linear_vel / max_wheel_position_radius;
            let max_ang_accel = max_linear_accel / max_wheel_position_radius;

            // Iterate through constraints to find applicable constraints
            params
                .get_enabled_constraints()
                .iter()
                .for_each(|constraint| {
                    if let Some(to) = constraint
                        .to
                        .and_then(|id| id.get_idx(params.waypoints.len()))
                    {
                        if let Some(from) = constraint.from.get_idx(params.waypoints.len()) {
                            if i < to && i >= from {
                                match constraint.data {
                                    ConstraintData::MaxVelocity { max } => {
                                        max_linear_vel = max_linear_vel.min(max);
                                    }
                                    ConstraintData::MaxAcceleration { max } => {
                                        max_linear_accel = max_linear_accel.min(max);
                                    }
                                    ConstraintData::MaxAngularVelocity { max } => {
                                        max_ang_vel = max_ang_vel.min(max);

                                        let time = calculate_trapezoidal_time(
                                            dtheta,
                                            max_ang_vel,
                                            max_ang_accel,
                                        );
                                        max_linear_vel = max_linear_vel.min(distance / time);
                                    }
                                    _ => {}
                                };
                            }
                        }
                    }
                });

            // anti-tunneling used to find ceiling value of dt
            let mut min_width = f64::INFINITY;
            let translations = config.module_translations();
            for idx in 0..translations.len() {
                let mod_a = translations
                    .get(idx)
                    .expect("Module expected when finding minimum width.");
                let mod_b_idx = if idx == 0 {
                    translations.len() - 1
                } else {
                    idx - 1
                };
                let mod_b = translations
                    .get(mod_b_idx)
                    .expect("Module expected when finding minimum width.");
                min_width = min_width.min(mod_a.x - mod_b.x).hypot(mod_a.y - mod_b.y);
            }
            let dt_ceiling = min_width / (config.wheel_max_velocity() * config.radius);
            let dt = dt_ceiling.min(params.target_dt);
            let linear_time =
                calculate_trapezoidal_time(distance, max_linear_vel, max_linear_accel);
            let angular_time = calculate_trapezoidal_time(dtheta, max_ang_vel, max_ang_accel);
            tracing::debug!(
                "ang time: {angular_time}, dtheta: {dtheta}, maxAngVel: {max_ang_vel}, maxAngAccel: {max_ang_accel}"
            );
            let total_time = linear_time + angular_time;
            tracing::debug!("dt estimate: {dt} - total time estimate: {total_time}");
            (total_time / dt).ceil() as usize
        }
    }
}

fn calculate_trapezoidal_time(distance: f64, max_vel: f64, max_accel: f64) -> f64 {
    // accel + deccel distance = (max_linear_vel * max_linear_vel) / max_linear_accel
    if distance > (max_vel * max_vel) / max_accel {
        // trapezoid
        distance / max_vel + max_vel / max_accel
    } else {
        // triangle
        2.0 * ((distance * max_accel).sqrt() / max_accel)
    }
}
