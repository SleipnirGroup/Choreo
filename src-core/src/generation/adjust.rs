use std::f64::consts::PI;

use super::angle_modulus;
use super::generate::{convert_constraints_to_index, fix_scope};
use crate::error::ChoreoError;
use crate::spec::traj::ConstraintData::{MaxAngularVelocity, PointAt};
use crate::spec::traj::TrajFile;
use crate::ChoreoResult;

pub fn adjust_waypoint_headings(traj: &TrajFile) -> ChoreoResult<Vec<f64>> {
    let mut new_headings = vec![0f64; traj.params.waypoints.len()];

    let mut wpt_has_point_at = vec![0u8; traj.params.waypoints.len()];
    let mut sgmt_has_point_at = vec![0u8; traj.params.waypoints.len()];
    let mut wpt_has_0_ang_vel = vec![0u8; traj.params.waypoints.len()];
    let mut sgmt_has_0_ang_vel = vec![0u8; traj.params.waypoints.len()];
    let mut wpt_is_pose = vec![false; traj.params.waypoints.len()];

    let mut last_fixed_idx = 0;

    for (idx, wpt) in traj.params.waypoints.iter().enumerate() {
        if idx == 0 && !wpt.fix_heading {
            return Err(ChoreoError::HeadingConflict(
                idx + 1,
                "First waypoint must have fixed heading.",
            ));
        }
        if wpt.fix_heading {
            // set heading for fixed heading wpt
            new_headings[idx] = wpt.heading.1;
            wpt_is_pose[idx] = true;
            if idx > 0 {
                // interpolate headings from last fixed idx
                let start = traj.params.waypoints[last_fixed_idx].heading.1;
                let dtheta = angle_modulus(wpt.heading.1 - start);
                new_headings
                    .iter_mut()
                    .take(idx) // up to not including current fixed heading wpt
                    .skip(last_fixed_idx + 1) // skip last fixed heading wpt
                    .enumerate()
                    .for_each(|(i, heading)| {
                        let scalar = (i + 1) as f64 / (idx - last_fixed_idx) as f64;
                        *heading = start + scalar * dtheta;
                    })
            }
            last_fixed_idx = idx;
        }
    }

    let num_wpts = traj.params.waypoints.len();
    let (constraints_idx, is_initial_guess) =
        convert_constraints_to_index(&traj.params.snapshot(), num_wpts);
    let mut guess_point_idxs: Vec<usize> = Vec::new();
    is_initial_guess
        .iter()
        .zip(&traj.params.snapshot().waypoints)
        .enumerate()
        .for_each(|(i, (&is_guess, wpt))| {
            if is_guess && !wpt.fix_heading && !wpt.fix_translation {
                guess_point_idxs.push(i);
            }
        });
    for constraint in &constraints_idx {
        let from = fix_scope(constraint.from, &guess_point_idxs);
        let to_opt = constraint.to.map(|idx| fix_scope(idx, &guess_point_idxs));

        match constraint.data {
            MaxAngularVelocity { max } => {
                if max == 0.0 {
                    match to_opt {
                        None => {
                            wpt_has_0_ang_vel[from] += 1;
                        }
                        Some(to) => {
                            if from == to {
                                wpt_has_0_ang_vel[from] += 1;
                            } else {
                                sgmt_has_0_ang_vel
                                    .iter_mut()
                                    .take(to + 1)
                                    .skip(from)
                                    .for_each(|b| *b += 1);
                            }
                            let mut fixed_count = 0u8;
                            let mut idx = 0;
                            let mut fixed_heading = None;
                            traj.params
                                .waypoints
                                .iter()
                                .enumerate()
                                .take(to + 1)
                                .skip(from)
                                .for_each(|(wpt_idx, wpt)| {
                                    if wpt.fix_heading {
                                        fixed_count += 1;
                                        match fixed_heading {
                                            Some(_) => {
                                                idx = wpt_idx;
                                            }
                                            None => {
                                                fixed_heading = Some(wpt.heading.1);
                                            }
                                        }
                                    }
                                });
                            if fixed_count > 1 {
                                return Err(ChoreoError::HeadingConflict(
                                    idx + 1,
                                    "Multiple Pose wpts within 0 MaxAngVel Constraints.",
                                ));
                            }
                            if let Some(heading) = fixed_heading {
                                new_headings.iter_mut().take(to + 1).skip(from).for_each(
                                    |new_heading| {
                                        *new_heading = heading;
                                    },
                                )
                            }
                        }
                    }
                }
            }
            PointAt {
                x,
                y,
                tolerance: _,
                flip,
            } => {
                match to_opt {
                    None => {
                        // heading can point at target
                        let robot_x = traj.params.waypoints[from].x.1;
                        let robot_y = traj.params.waypoints[from].y.1;
                        let new_x = x - robot_x;
                        let new_y = y - robot_y;
                        let heading = new_y.atan2(new_x);
                        let heading = if flip {
                            angle_modulus(heading + PI)
                        } else {
                            heading
                        };
                        if traj.params.waypoints[from].fix_heading
                            && (traj.params.waypoints[from].heading.1 != heading)
                        {
                            return Err(ChoreoError::HeadingConflict(from + 1, "Point At and Pose."));
                        } else {
                            new_headings[from] = heading;
                        }
                        wpt_has_point_at[from] += 1;
                    }
                    Some(to) => {
                        for wpt_idx in from..=to {
                            let robot_x = traj.params.waypoints[wpt_idx].x.1;
                            let robot_y = traj.params.waypoints[wpt_idx].y.1;
                            let new_x = x - robot_x;
                            let new_y = y - robot_y;
                            let heading = new_y.atan2(new_x);
                            let heading = if flip {
                                angle_modulus(heading + PI)
                            } else {
                                heading
                            };
                            if from == to {
                                sgmt_has_point_at[from] += 1;
                            } else {
                                sgmt_has_point_at
                                    .iter_mut()
                                    .take(to + 1)
                                    .skip(from)
                                    .for_each(|b| *b += 1);
                            }
                            if !traj.params.waypoints[wpt_idx].fix_heading {
                                new_headings[wpt_idx] = heading;
                            } else {
                                return Err(ChoreoError::HeadingConflict(
                                    wpt_idx + 1,
                                    "Point At and Pose.",
                                ));
                            }
                        }
                    }
                }
            }
            _ => {}
        }
    }
    tracing::debug!(
        "heading conflict references:\n
    {wpt_has_point_at:?}\n
    {sgmt_has_point_at:?}\n
    {wpt_has_0_ang_vel:?}\n
    {sgmt_has_0_ang_vel:?}\n
    {wpt_is_pose:?}"
    );
    Ok(new_headings)
}
