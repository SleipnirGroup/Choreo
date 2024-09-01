use std::f64::consts::PI;

use super::generate::{convert_constraints_to_index, fix_scope};
// use super::types::{Constraint, Expr, RobotConfig, Traj, Waypoint, expr};
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
                for interp_idx in last_fixed_idx + 1..idx {
                    let scalar =
                        (interp_idx - last_fixed_idx) as f64 / (idx - last_fixed_idx) as f64;
                    new_headings[interp_idx] = start + scalar * dtheta;
                }
            }
            last_fixed_idx = idx;
        }
    }

    let num_wpts = traj.path.waypoints.len();
    let (constraints_idx, is_initial_guess) =
        convert_constraints_to_index(&traj.path.snapshot(), num_wpts);
    let mut guess_point_idxs: Vec<usize> = Vec::new();
    for i in 0..num_wpts {
        let wpt = &traj.path.snapshot().waypoints[i];
        // add initial guess points (actually unconstrained empty wpts in Choreo terms)
        if is_initial_guess[i] && !wpt.fix_heading && !wpt.fix_translation {
            guess_point_idxs.push(i);
        }
    }
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
                            for wpt_idx in from..=to {
                                heading_fixed_references[wpt_idx] += 1;
                                if traj.path.waypoints[wpt_idx].fix_heading {
                                    fixed_heading = Some(traj.path.waypoints[wpt_idx].heading.1);
                                }
                            }
                            if let Some(heading) = fixed_heading {
                                for wpt_idx in from..=to {
                                    if !traj.path.waypoints[wpt_idx].fix_heading {
                                        new_headings[wpt_idx] = heading;
                                    }
                                }
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
                        let heading = ((x - robot_x) / (y - robot_y)).acos();
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
                            let heading = ((new_x / new_y) / new_x.hypot(new_y)).acos();
                            
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
    // if heading_fixed_references.iter().any(|&x| x > 1) {}
    // modified_traj
    //     .path
    //     .waypoints
    //     .iter_mut()
    //     .zip(snapshot.waypoints.iter_mut())
    //     .zip(new_headings.into_iter())
    //     .for_each(|((path_wpt, snap_wpt), new_heading)| {
    //         path_wpt.heading = expr(format!("{new_heading} rad").as_str(), new_heading);
    //         snap_wpt.heading = new_heading;
    //     });
    // modified_traj.snapshot = Some(snapshot);
    Ok(new_headings)
}
