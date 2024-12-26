
use std::f64::consts::PI;

use crate::generation::constraints::fix_constraint_indices;
use crate::spec::trajectory::{ConstraintData, TrajectoryFile};
use crate::spec::Expr;
use crate::{angle_modulus, ChoreoError, ChoreoResult};

// This should be used before sending to solver
pub fn adjust_headings(trajectory: &mut TrajectoryFile) -> ChoreoResult<()> {
    let new_headings = calculate_adjusted_headings(trajectory)?;
    // new_headings, set to file
    for (i, &h) in new_headings.iter().enumerate() {
        trajectory.params.waypoints[i].heading = Expr::new(format!("{h} rad").as_str(), h);
    }
    Ok(())
}

pub fn calculate_adjusted_headings(trajectory: &TrajectoryFile) -> ChoreoResult<Vec<f64>> {
    let waypoints: &Vec<crate::spec::trajectory::Waypoint<Expr>> = &trajectory.params.waypoints;

    let num_wpts = waypoints.len();
    let mut new_headings = vec![0f64; num_wpts];
    let mut headings_from_constraints = vec![None; num_wpts];
    let mut sgmt_has_0_ang_vel = vec![0u8; num_wpts];

    // find pose waypoints
    for (w, maybe_h) in waypoints.iter().zip(headings_from_constraints.iter_mut()) {
        if w.fix_heading {
            *maybe_h = Some(w.heading.val);
        }
    }

    for constraint in &fix_constraint_indices(&trajectory.params.snapshot()) {
        let from = constraint.from;
        let to_opt = constraint.to;
        match constraint.data {
            ConstraintData::MaxAngularVelocity { max } if max == 0.0 => {
                if let Some(to) = to_opt {
                    sgmt_has_0_ang_vel[from..to]
                        .iter_mut()
                        .for_each(|count| *count += 1);
                }
            },
            ConstraintData::PointAt {
                x,
                y,
                flip,
                ..
            } => {
                let to = to_opt.unwrap_or(from);
                for wpt_idx in from..=to {
                    let new_x = x - waypoints[wpt_idx].x.val;
                    let new_y = y - waypoints[wpt_idx].y.val;
                    let heading = new_y.atan2(new_x);
                    let heading = if flip {
                        angle_modulus(heading + PI)
                    } else {
                        heading
                    };
                    headings_from_constraints[wpt_idx].get_or_insert(heading);
                }
            }
            _ => {}
        }
    }

    // adjust target headings for 0 angular velocity segments
    let mut last_fixed: Option<f64> = None;
    let mut start = None;
    for (wpt_idx, (&heading, is_zero_velocity)) in headings_from_constraints
        .clone()
        .iter()
        .zip(sgmt_has_0_ang_vel.iter().map(|&count| count > 0))
        .enumerate()
    {
        if is_zero_velocity {
            if let Some(h) = heading {
                last_fixed = Some(h);
            }
            if start.is_none() {
                start = Some(wpt_idx);
            }
        } else if start.is_some() {
            if last_fixed.is_none() {
                // check last waypoint
                match heading {
                    Some(h) => last_fixed = Some(h),
                    None => {
                        // all points in constraint were translation,
                        // so pick the pose before or after
                        let start = start.unwrap();
                        let heading_from_surrounding = headings_from_constraints[0..=start]
                            .iter()
                            .rev()
                            .chain(
                                headings_from_constraints[start..headings_from_constraints.len()]
                                    .iter(),
                            )
                            .find(|&&h| h.is_some());
                        if let Some(h) = heading_from_surrounding {
                            last_fixed = *h;
                        } else {
                            last_fixed = Some(0.0);
                        }
                    }
                }
            }
            headings_from_constraints[start.unwrap()..=wpt_idx]
                .iter_mut()
                .for_each(|x| *x = last_fixed);
            start = None;
            last_fixed = None;
        }
    }

    // interpolate non fixed headings between fixed ones.
    let mut last_fixed_heading = (0, waypoints[0].heading.val);
    for (wpt_idx, &maybe_fixed_heading) in headings_from_constraints.iter().enumerate() {
        if let Some(target_heading) = maybe_fixed_heading {
            // set heading for fixed heading wpt
            new_headings[wpt_idx] = target_heading;

            // interpolate headings from last fixed idx
            let start = last_fixed_heading.1;
            let dtheta = angle_modulus(target_heading - start);
            new_headings
                .iter_mut()
                .take(wpt_idx) // up to not including current fixed heading wpt
                .skip(last_fixed_heading.0 + 1) // skip last fixed heading wpt
                .enumerate()
                .for_each(|(i, heading)| {
                    let scalar = (i + 1) as f64 / (wpt_idx - last_fixed_heading.0) as f64;
                    *heading = angle_modulus(start + scalar * dtheta);
                });
            last_fixed_heading = (wpt_idx, target_heading);
        }
    }

    // sanity check that fix heading waypoints are not modified
    if let Some((i, _)) = waypoints
        .iter()
        .enumerate()
        .filter(|(_, w)| w.fix_heading)
        .find(|(i, w)| w.heading.val != new_headings[*i])
    {
        return Err(ChoreoError::ConstraintConflict(
            i + 1,
            "Fixed waypoint heading was modified.".to_string(),
        ));
    }
    println!("Adjusted headings: {new_headings:?}");

    Ok(new_headings)
}
