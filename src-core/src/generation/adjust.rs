use std::f64::consts::PI;

use super::generate::{convert_constraints_to_index, fix_scope};
use super::types::Traj;
use crate::document::types::ConstraintData::{MaxAngularVelocity, PointAt};
use crate::error::ChoreoError;
use crate::util::math_util::angle_modulus;
use crate::Result;

// A value version since commands don't support borrows, but we need the borrow
// version for generation.
#[tauri::command]
#[allow(clippy::needless_pass_by_value)]
pub fn cmd_adjust_waypoint_headings(traj: Traj) -> Result<Vec<f64>> {
    adjust_waypoint_headings(&traj)
}

pub fn adjust_waypoint_headings(traj: &Traj) -> Result<Vec<f64>> {
    let mut new_headings = vec![0f64; traj.path.waypoints.len()];
    let mut heading_fixed_references = vec![0u8; traj.path.waypoints.len()];
    let mut last_fixed_idx = 0;

    for (idx, wpt) in traj.path.waypoints.iter().enumerate() {
        if idx == 0 && !wpt.fix_heading {
            return Err(ChoreoError::HeadingConflict(idx));
        }
        if wpt.fix_heading {
            // set heading for fixed heading wpt
            new_headings[idx] = wpt.heading.1;
            heading_fixed_references[idx] += 1;
            if idx > 0 {
                // interpolate headings from last fixed idx
                let start = traj.path.waypoints[last_fixed_idx].heading.1;
                let dtheta = angle_modulus(wpt.heading.1 - start);
                new_headings
                    .iter_mut()
                    .take(idx + 1)
                    .skip(last_fixed_idx)
                    .enumerate()
                    .for_each(|(i, heading)| {
                        let scalar = (i + 1) as f64 / (idx - last_fixed_idx) as f64;
                        *heading = start + scalar * dtheta;
                    })
            }
            last_fixed_idx = idx;
        }
    }

    let num_wpts = traj.path.waypoints.len();
    let (constraints_idx, is_initial_guess) =
        convert_constraints_to_index(&traj.path.snapshot(), num_wpts);
    let mut guess_point_idxs: Vec<usize> = Vec::new();
    is_initial_guess
        .iter()
        .zip(&traj.path.snapshot().waypoints)
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
                        None => {}
                        Some(to) => {
                            let mut fixed_heading = None;
                            traj.path
                                .waypoints
                                .iter()
                                .enumerate()
                                .take(to + 1)
                                .skip(from)
                                .for_each(|(wpt_idx, wpt)| {
                                    heading_fixed_references[wpt_idx] += 1;
                                    if wpt.fix_heading {
                                        fixed_heading = Some(wpt.heading.1);
                                    }
                                });
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
                        let robot_x = traj.path.waypoints[from].x.1;
                        let robot_y = traj.path.waypoints[from].y.1;
                        let new_x = x - robot_x;
                        let new_y = y - robot_y;
                        let heading = new_y.atan2(new_x);
                        let heading = if flip {
                            angle_modulus(heading + PI)
                        } else {
                            heading
                        };
                        if !traj.path.waypoints[from].fix_heading
                            && (traj.path.waypoints[from].heading.1 != heading)
                        {
                            new_headings[from] = heading;
                        } else {
                            std::println!("heading conflict on wpt {from}");
                        }
                    }
                    Some(to) => {
                        for wpt_idx in from..=to {
                            let robot_x = traj.path.waypoints[wpt_idx].x.1;
                            let robot_y = traj.path.waypoints[wpt_idx].y.1;
                            let new_x = x - robot_x;
                            let new_y = y - robot_y;
                            let heading = new_y.atan2(new_x);
                            let heading = if flip {
                                angle_modulus(heading + PI)
                            } else {
                                heading
                            };
                            heading_fixed_references[wpt_idx] += 1;
                            if !traj.path.waypoints[wpt_idx].fix_heading {
                                new_headings[wpt_idx] = heading;
                            }
                        }
                    }
                }
            }
            _ => {}
        }
    }
    std::println!("heading_fixed_references: {heading_fixed_references:?}");
    Ok(new_headings)
}
