use std::f64::consts::PI;

use super::generate::{convert_constraints_to_index, fix_scope};
use crate::error::ChoreoError;
use crate::spec::traj::ConstraintData::{MaxAngularVelocity, PointAt};
use crate::spec::traj::TrajFile;
use crate::ChoreoResult;
use super::angle_modulus;



pub fn adjust_waypoint_headings(traj: &TrajFile) -> ChoreoResult<Vec<f64>> {
    let mut new_headings = vec![0f64; traj.params.waypoints.len()];
    let mut heading_fixed_references = vec![0u8; traj.params.waypoints.len()];
    let mut last_fixed_idx = 0;

    for (idx, wpt) in traj.params.waypoints.iter().enumerate() {
        if idx == 0 && !wpt.fix_heading {
            return Err(ChoreoError::HeadingConflict(idx));
        }
        if wpt.fix_heading {
            // set heading for fixed heading wpt
            new_headings[idx] = wpt.heading.1;
            heading_fixed_references[idx] += 1;
            if idx > 0 {
                // interpolate headings from last fixed idx
                let start = traj.params.waypoints[last_fixed_idx].heading.1;
                let dtheta = angle_modulus(wpt.heading.1 - start);
                new_headings
                    .iter_mut()
                    .take(idx + 1)
                    .skip(last_fixed_idx + 1)
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
                        None => {}
                        Some(to) => {
                            let mut fixed_heading = None;
                            traj.params
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
                        if !traj.params.waypoints[from].fix_heading
                            && (traj.params.waypoints[from].heading.1 != heading)
                        {
                            new_headings[from] = heading;
                        } else {
                            tracing::debug!("heading conflict on wpt {from}");
                        }
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
                            heading_fixed_references[wpt_idx] += 1;
                            if !traj.params.waypoints[wpt_idx].fix_heading {
                                new_headings[wpt_idx] = heading;
                            }
                        }
                    }
                }
            }
            _ => {}
        }
    }
    tracing::debug!("heading_fixed_references: {heading_fixed_references:?}");
    Ok(new_headings)
}
