use super::angle_modulus;
use crate::error::ChoreoError;
use crate::spec::project::RobotConfig;
use crate::spec::trajectory::{ConstraintData, Parameters, Waypoint};
use crate::ChoreoResult;

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
            let mut max_vel = config.wheel_max_velocity() * config.radius;
            let mut max_accel = (max_force * 4.0) / config.mass; // times 4 for 4 modules

            // find max wheel position radius for calculating max angular velocity
            let max_wheel_position_radius =
                config.back_left.radius().max(config.front_left.radius());
            let mut max_ang_vel = max_vel / max_wheel_position_radius;

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
                                        max_vel = max_vel.min(max);
                                    }
                                    ConstraintData::MaxAcceleration { max } => {
                                        max_accel = max_accel.min(max);
                                    }
                                    ConstraintData::MaxAngularVelocity { max } => {
                                        // Proof for T = 1.5 * θ / ω:
                                        //
                                        // The position function of a cubic Hermite spline
                                        // where t∈[0, 1] and θ∈[0, dtheta]:
                                        // x(t) = (-2t^3 +3t^2)θ
                                        //
                                        // The velocity function derived from the cubic Hermite spline is:
                                        // v(t) = (-6t^2 + 6t)θ.
                                        //
                                        // The peak velocity occurs at t = 0.5, where t∈[0, 1] :
                                        // v(0.5) = 1.5*θ, which is the max angular velocity during the motion.
                                        //
                                        // To ensure this peak velocity does not exceed ω, max_ang_vel, we set:
                                        // 1.5 * θ = ω.
                                        //
                                        // The total time T needed to reach the final θ and
                                        // not exceed ω is thus derived as:
                                        // T = θ / (ω / 1.5) = 1.5 * θ / ω.
                                        //
                                        // This calculation ensures the peak velocity meets but does not exceed ω,
                                        // extending the time proportionally to meet this requirement.
                                        // This is an alternative estimation method to finding the trapezoidal or
                                        // triangular profile for the change heading.
                                        if max >= 0.1 {
                                            let time = (1.5 * dtheta) / max;
                                            max_vel = max_vel.min(distance / time);
                                        }
                                        max_ang_vel = max_ang_vel.min(max);
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
            let distance_at_cruise = distance - (max_vel * max_vel) / max_accel;
            let linear_time = if distance_at_cruise < 0.0 {
                // triangle
                2.0 * ((distance * max_accel).sqrt() / max_accel)
            } else {
                // trapezoid
                distance / max_vel + max_vel / max_accel
            };

            // avoid divide by 0
            let angular_time = if max_ang_vel >= 0.1 {
                // see note above for math reasoning
                (1.5 * dtheta) / max_ang_vel
            } else {
                0.0f64
            }
            .max(0.2); // keep some time allocated for rotating
            let total_time = linear_time + angular_time;
            tracing::debug!("dt estimate: {dt} - total time estimate: {total_time}");
            (total_time / dt).ceil() as usize
        }
    }
}
