use std::f64::consts::PI;

use crate::generation::angle_modulus;
use crate::izip;
use crate::spec::trajectory::ConstraintData::{MaxAngularVelocity, PointAt};
use crate::spec::trajectory::{ConstraintIDX, ConstraintScope, TrajectoryFile};
use crate::spec::Expr;
use crate::{ChoreoError, ChoreoResult};

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
    let waypoints = &trajectory.params.waypoints;

    let num_wpts = waypoints.len();
    let mut new_headings = vec![0f64; num_wpts];

    let mut wpt_has_point_at = vec![0u8; num_wpts];
    let mut sgmt_has_point_at = vec![0u8; num_wpts];
    let mut wpt_has_0_ang_vel = vec![0u8; num_wpts];
    let mut sgmt_has_0_ang_vel = vec![0u8; num_wpts];
    let mut headings_from_constraints = vec![None; num_wpts];

    let (guess_point_idxs, constraints_idx) = fix_constraint_indices(trajectory);

    // find pose waypoints
    for (w, maybe_h) in waypoints.iter().zip(headings_from_constraints.iter_mut()) {
        if w.fix_heading {
            *maybe_h = Some(w.heading.val);
        }
    }

    let constraints_fixed_scope: Vec<_> = constraints_idx
        .iter()
        .map(|c| {
            let mut cc = c.to_owned();
            cc.from = fix_scope(c.from, &guess_point_idxs);
            cc.to = c.to.map(|idx| fix_scope(idx, &guess_point_idxs));
            cc
        })
        .collect();

    // count constraint references
    for constraint in &constraints_fixed_scope {
        let from = constraint.from;
        let to_opt = constraint.to;
        match constraint.data {
            MaxAngularVelocity { max } if max == 0.0 => {
                if let Some(to) = to_opt {
                    wpt_has_0_ang_vel[from..=to]
                        .iter_mut()
                        .for_each(|count| *count += 1);
                    sgmt_has_0_ang_vel[from..to]
                        .iter_mut()
                        .for_each(|count| *count += 1);
                } else {
                    wpt_has_0_ang_vel[from] += 1;
                }
            }
            PointAt {
                x,
                y,
                tolerance: _,
                flip,
            } => {
                let to = to_opt.unwrap_or(from);
                for wpt_idx in from..=to {
                    wpt_has_point_at[wpt_idx] += 1;
                    if wpt_idx < to {
                        sgmt_has_point_at[wpt_idx] += 1;
                    }

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

    println!(
        "heading conflict references:\n
    {wpt_has_point_at:?} - wpt_has_point_at\n
    {sgmt_has_point_at:?} - sgmt_has_point_at\n
    {wpt_has_0_ang_vel:?} - wpt_has_0_ang_vel\n
    {sgmt_has_0_ang_vel:?} - sgmt_has_0_ang_vel\n
    {headings_from_constraints:?} - headings_from_constraints"
    );

    // conflict checking
    for (idx_i, &sgmt_0v, &_wpt_0v, &sgmt_pa, &wpt_pa, wpt) in izip!(
        0..,
        &sgmt_has_0_ang_vel,
        &wpt_has_0_ang_vel,
        &sgmt_has_point_at,
        &wpt_has_point_at,
        waypoints
    ) {
        if idx_i == 0 && !wpt.fix_heading {
            return Err(ChoreoError::HeadingConflict(
                1,
                "First waypoints must have fixed heading.".to_string(),
            ));
        }
        if sgmt_0v >= 1 && sgmt_pa >= 1 {
            return Err(ChoreoError::HeadingConflict(
                idx_i + 1,
                "Segment has a 0 maxAngVel and Point At".to_string(),
            ));
        }
        if wpt_pa > 1 || sgmt_pa > 1 {
            return Err(ChoreoError::HeadingConflict(
                idx_i + 1,
                "Waypoint has multiple Point At constraints.".to_string(),
            ));
        }
        if idx_i > 0 && sgmt_pa > 0 {
            for idx in (0..idx_i - 1).rev() {
                if sgmt_has_0_ang_vel[idx] > 0 {
                    if waypoints[idx].fix_heading || waypoints[idx + 1].fix_heading {
                        return Err(ChoreoError::HeadingConflict(
                            idx_i + 1,
                            "0 maxAngVel with a Pose prior to Point At".to_string(),
                        ));
                    }
                } else {
                    break;
                }
            }
        }
        if idx_i < num_wpts - 1 && sgmt_pa > 0 {
            for idx in idx_i + 1..num_wpts - 1 {
                if sgmt_has_0_ang_vel[idx] > 0 {
                    if waypoints[idx].fix_heading || waypoints[idx + 1].fix_heading {
                        return Err(ChoreoError::HeadingConflict(
                            idx_i + 1,
                            "0 maxAngVel with a Pose after Point At".to_string(),
                        ));
                    }
                } else {
                    break;
                }
            }
        }
        if wpt.fix_heading && (sgmt_pa >= 1 || wpt_pa >= 1) {
            return Err(ChoreoError::HeadingConflict(
                idx_i + 1,
                "Point At and Pose constraints".to_string(),
            ));
        }
    }

    // check for multiple pose waypoints in 0 angular velocity range
    // if only one pose, return that heading
    let mut idx_mult_pose = 0;
    while idx_mult_pose < num_wpts {
        if sgmt_has_0_ang_vel[idx_mult_pose] > 0 {
            let mut num_pose_wpts_in_zero_ang_vel_sgmt = 0;

            for &zero_count in sgmt_has_0_ang_vel.iter().skip(idx_mult_pose) {
                if waypoints[idx_mult_pose].fix_heading {
                    num_pose_wpts_in_zero_ang_vel_sgmt += 1;
                }
                if zero_count == 0 {
                    break;
                }
                idx_mult_pose += 1;
            }
            if num_pose_wpts_in_zero_ang_vel_sgmt > 1 {
                return Err(ChoreoError::HeadingConflict(
                    idx_mult_pose + 1,
                    "Multiple Pose waypoints within 0 maxAngVel Constraints".to_string(),
                ));
            }
        } else {
            idx_mult_pose += 1;
        }
    }

    // adjust target headings for 0 angular velocity segments
    let mut last_fixed: Option<f64> = None;
    let mut start = None;
    for (idx, (&heading, is_zero_velocity)) in headings_from_constraints
        .clone()
        .iter()
        .zip(sgmt_has_0_ang_vel.iter().map(|&c| c > 0))
        .enumerate()
    {
        if is_zero_velocity {
            if let Some(h) = heading {
                last_fixed = Some(h);
            }
            if start.is_none() {
                start = Some(idx);
            }
        } else if start.is_some() {
            if last_fixed.is_none() && heading.is_some() {
                last_fixed = heading;
            }
            headings_from_constraints[start.unwrap()..=idx]
                .iter_mut()
                .for_each(|x| *x = last_fixed);
            start = None;
            last_fixed = None;
        }
    }

    // interpolate non fixed headings between fixed ones.
    let mut last_fixed_heading = (0, waypoints[0].heading.val);
    for (idx, &maybe_fixed_heading) in headings_from_constraints.iter().enumerate() {
        if let Some(target_heading) = maybe_fixed_heading {
            // set heading for fixed heading wpt
            new_headings[idx] = target_heading;

            // interpolate headings from last fixed idx
            let start = last_fixed_heading.1;
            let dtheta = angle_modulus(target_heading - start);
            new_headings
                .iter_mut()
                .take(idx) // up to not including current fixed heading wpt
                .skip(last_fixed_heading.0 + 1) // skip last fixed heading wpt
                .enumerate()
                .for_each(|(i, heading)| {
                    let scalar = (i + 1) as f64 / (idx - last_fixed_heading.0) as f64;
                    *heading = angle_modulus(start + scalar * dtheta);
                });
            last_fixed_heading = (idx, target_heading);
        }
    }

    // sanity check that fix heading waypoints are not modified
    if let Some((i, _)) = waypoints
        .iter()
        .enumerate()
        .filter(|(_, w)| w.fix_heading)
        .find(|(i, w)| w.heading.val != new_headings[*i])
    {
        return Err(ChoreoError::HeadingConflict(
            i + 1,
            "Fixed waypoint heading was modified.".to_string(),
        ));
    }
    println!("Adjusted headings: {new_headings:?}");

    Ok(new_headings)
}

// This is duplicated in constraints::ConstraintSetter
pub fn fix_scope(idx: usize, removed_idxs: &[usize]) -> usize {
    let mut to_subtract: usize = 0;
    for removed in removed_idxs {
        if *removed < idx {
            to_subtract += 1;
        }
    }
    idx - to_subtract
}

// This is duplicated in constraints::ConstraintSetter
pub fn fix_constraint_indices(
    trajectory: &TrajectoryFile,
) -> (Vec<usize>, Vec<ConstraintIDX<f64>>) {
    let mut guess_points: Vec<usize> = Vec::new();
    let mut constraint_idx = Vec::<ConstraintIDX<f64>>::new();
    let num_wpts = trajectory.params.waypoints.len();

    trajectory
        .params
        .waypoints
        .iter()
        .enumerate()
        .filter(|(_, w)| w.is_initial_guess && !w.fix_heading && !w.fix_translation)
        .for_each(|(idx, _)| guess_points.push(idx));

    for constraint in &trajectory.params.get_enabled_constraints() {
        let from = constraint.from.get_idx(num_wpts);
        let to = constraint.to.as_ref().and_then(|id| id.get_idx(num_wpts));
        // from and to are None if they did not point to a valid waypoint.
        match from {
            None => {}
            Some(from_idx) => {
                let valid_wpt = to.is_none();
                let valid_sgmt = to.is_some();
                // Check for valid scope
                if match constraint.data.scope() {
                    ConstraintScope::Waypoint => valid_wpt,
                    ConstraintScope::Segment => valid_sgmt,
                    ConstraintScope::Both => valid_wpt || valid_sgmt,
                } {
                    let mut fixed_to = to;
                    let mut fixed_from = from_idx;
                    if let Some(to_idx) = to {
                        if to_idx < from_idx {
                            fixed_to = Some(from_idx);
                            fixed_from = to_idx;
                        }
                        if to_idx == from_idx {
                            if constraint.data.scope() == ConstraintScope::Segment {
                                continue;
                            }
                            fixed_to = None;
                        }
                    }
                    constraint_idx.push(ConstraintIDX {
                        from: fixed_from,
                        to: fixed_to,
                        data: constraint.data.snapshot(),
                        enabled: constraint.enabled,
                    });
                }
            }
        };
    }

    (guess_points, constraint_idx)
}

// taken from itertools
#[macro_export]
macro_rules! izip {
    // @closure creates a tuple-flattening closure for .map() call. usage:
    // @closure partial_pattern => partial_tuple , rest , of , iterators
    // eg. izip!( @closure ((a, b), c) => (a, b, c) , dd , ee )
    ( @closure $p:pat => $tup:expr ) => {
        |$p| $tup
    };

    // The "b" identifier is a different identifier on each recursion level thanks to hygiene.
    ( @closure $p:pat => ( $($tup:tt)* ) , $_iter:expr $( , $tail:expr )* ) => {
        $crate::izip!(@closure ($p, b) => ( $($tup)*, b ) $( , $tail )*)
    };

    // unary
    ($first:expr $(,)*) => {
        IntoIterator::into_iter($first)
    };

    // binary
    ($first:expr, $second:expr $(,)*) => {
        $crate::izip!($first)
            .zip($second)
    };

    // n-ary where n > 2
    ( $first:expr $( , $rest:expr )* $(,)* ) => {
        $crate::izip!($first)
            $(
                .zip($rest)
            )*
            .map(
                $crate::izip!(@closure a => (a) $( , $rest )*)
            )
    };
}
