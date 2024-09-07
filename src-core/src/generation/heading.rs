use std::f64::consts::PI;

use crate::generation::angle_modulus;
use crate::izip;
use crate::spec::traj::ConstraintData::{MaxAngularVelocity, PointAt};
use crate::spec::traj::{ConstraintIDX, ConstraintScope, TrajFile};
use crate::spec::Expr;
use crate::{ChoreoError, ChoreoResult};

pub fn calculate_adjusted_headings(traj: &TrajFile) -> ChoreoResult<Vec<f64>> {
    let waypoints = &traj.params.waypoints;

    let num_wpts = waypoints.len();
    let mut new_headings = vec![0f64; num_wpts];

    let mut wpt_has_point_at = vec![0u8; num_wpts];
    let mut sgmt_has_point_at = vec![0u8; num_wpts];
    let mut wpt_has_0_ang_vel = vec![0u8; num_wpts];
    let mut sgmt_has_0_ang_vel = vec![0u8; num_wpts];
    let mut wpt_is_pose = vec![false; num_wpts];

    let mut last_fixed_idx = 0;

    let (guess_point_idxs, constraints_idx) = fix_constraint_indices(traj);

    // find pose waypoints
    for (idx, wpt) in waypoints.iter().enumerate() {
        if wpt.fix_heading {
            // set heading for fixed heading wpt
            new_headings[idx] = wpt.heading.1;
            wpt_is_pose[idx] = true;
            if idx > 0 {
                // interpolate headings from last fixed idx
                let start = waypoints[last_fixed_idx].heading.1;
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
    // TODO: adjust heading of 0 ang vel sgmt immediately before or after point at
    // TODO: start with point at constraints, then 0 ang vel, then interpolate
    for constraint in &constraints_idx {
        let from = fix_scope(constraint.from, &guess_point_idxs);
        let to_opt = constraint.to.map(|idx| fix_scope(idx, &guess_point_idxs));
        let target_heading;
        match constraint.data {
            MaxAngularVelocity { max } => {
                if max == 0.0 {
                    match to_opt {
                        None => {
                            wpt_has_0_ang_vel[from] += 1;
                        }
                        Some(to) => {
                            wpt_has_0_ang_vel
                                .iter_mut()
                                .take(to + 1)
                                .skip(from)
                                .for_each(|count| *count += 1);
                            sgmt_has_0_ang_vel
                                .iter_mut()
                                .take(to)
                                .skip(from)
                                .for_each(|count| *count += 1);

                            target_heading = waypoints
                                .iter()
                                .take(to + 1)
                                .skip(from)
                                .find(|wpt| wpt.fix_heading)
                                .map(|wpt| wpt.heading.1);

                            if let Some(target_heading) = target_heading {
                                new_headings
                                    .iter_mut()
                                    .take(to + 1)
                                    .skip(from)
                                    .for_each(|h| *h = target_heading);
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
                        wpt_has_point_at[from] += 1;

                        // heading points at target
                        let robot_x = waypoints[from].x.1;
                        let robot_y = waypoints[from].y.1;
                        let new_x = x - robot_x;
                        let new_y = y - robot_y;
                        let heading = new_y.atan2(new_x);
                        let heading = if flip {
                            angle_modulus(heading + PI)
                        } else {
                            heading
                        };
                        if !waypoints[from].fix_heading {
                            new_headings[from] = heading;
                        }
                    }
                    Some(to) => {
                        for wpt_idx in from..=to {
                            wpt_has_point_at[from] += 1;
                            if wpt_idx < to {
                                sgmt_has_point_at[wpt_idx] += 1;
                            }

                            let robot_x = waypoints[wpt_idx].x.1;
                            let robot_y = waypoints[wpt_idx].y.1;
                            let new_x = x - robot_x;
                            let new_y = y - robot_y;
                            let heading = new_y.atan2(new_x);
                            let heading = if flip {
                                angle_modulus(heading + PI)
                            } else {
                                heading
                            };

                            if !waypoints[wpt_idx].fix_heading {
                                new_headings[wpt_idx] = heading;
                            }
                        }
                    }
                }
            }
            _ => {}
        }
    }
    println!("new headings: {new_headings:?}");
    println!(
        "heading conflict references:\n
    {wpt_has_point_at:?} - wpt_has_point_at\n
    {sgmt_has_point_at:?} - sgmt_has_point_at\n
    {wpt_has_0_ang_vel:?} - wpt_has_0_ang_vel\n
    {sgmt_has_0_ang_vel:?} - sgmt_has_0_ang_vel\n
    {wpt_is_pose:?} - wpt_is_pose"
    );

    // check for 0 ang vel and point at
    for (wpt, &sgmt_v, &_wpt_v, &sgmt_p, &wpt_p, &pose) in izip!(
        0..,
        &sgmt_has_0_ang_vel,
        &wpt_has_0_ang_vel,
        &sgmt_has_point_at,
        &wpt_has_point_at,
        &wpt_is_pose
    ) {
        if wpt == 0 && !pose {
            return Err(ChoreoError::HeadingConflict(
                1,
                "First waypoints must have fixed heading.".to_string(),
            ));
        }
        if sgmt_v >= 1 && sgmt_p >= 1 {
            return Err(ChoreoError::HeadingConflict(
                wpt + 1,
                "Segment has a 0 maxAngVel and Point At".to_string(),
            ));
        }
        if wpt > 0 && sgmt_p > 0 {
            println!("sgmt_p{sgmt_p}");
            for idx in (0..wpt - 1).rev() {
                println!("wpt{wpt} - p{}", wpt_is_pose[idx]);
                println!("idx{idx}");
                if sgmt_has_0_ang_vel[idx] > 0 {
                    if wpt_is_pose[idx] || wpt_is_pose[idx + 1] {
                        return Err(ChoreoError::HeadingConflict(
                            wpt + 1,
                            "0 maxAngVel with a Pose prior to Point At".to_string(),
                        ));
                    }
                } else {
                    break;
                }
            }
        }
        if wpt < num_wpts - 1 && sgmt_p > 0 {
            for idx in wpt + 1..num_wpts - 1 {
                if sgmt_has_0_ang_vel[idx] > 0 {
                    if wpt_is_pose[idx] || wpt_is_pose[idx + 1] {
                        return Err(ChoreoError::HeadingConflict(
                            wpt + 1,
                            "0 maxAngVel with a Pose after Point At".to_string(),
                        ));
                    }
                } else {
                    break;
                }
            }
        }
        if pose && (sgmt_p >= 1 || wpt_p >= 1) {
            return Err(ChoreoError::HeadingConflict(
                wpt + 1,
                "Point At and Pose constraints".to_string(),
            ));
        }
        // if is_in_zero_ang_vel_with_pose && pose {
        //     return Err(ChoreoError::HeadingConflict(
        //         wpt + 1,
        //         "Multiple Pose waypoints within 0 maxAngVel Contraints".to_string(),
        //     ));
        // } else if pose &&
        // let num_pose_wpts_in_zero_ang_vel_sgmt =
        //     for (vel_count, pose) in sgmt_has_0_ang_vel.iter().zip(&wpt_is_pose).skip(wpt) {

        //     }
        //         .take_while(|(&vel_count, _)| vel_count >= 1)
        //         .filter(|(_, &pose)| pose)
        //         .fold(0 as usize, |acc, _| acc + 1);
        // if num_pose_wpts_in_zero_ang_vel_sgmt > 1 as usize {
        //     return Err(ChoreoError::HeadingConflict(
        //         wpt + 1,
        //         "Multiple Pose waypoints within 0 maxAngVel Contraints".to_string(),
        //     ));
        // }
    }

    let mut idx = 0;
    while idx < wpt_is_pose.len() {
        if sgmt_has_0_ang_vel[idx] > 0 {
            let mut num_pose_wpts_in_zero_ang_vel_sgmt = 0;

            for &zero_count in sgmt_has_0_ang_vel.iter().skip(idx) {
                if wpt_is_pose[idx] {
                    num_pose_wpts_in_zero_ang_vel_sgmt += 1;
                }
                if zero_count == 0 {
                    break;
                }
                idx += 1;
            }
            if num_pose_wpts_in_zero_ang_vel_sgmt > 1 {
                return Err(ChoreoError::HeadingConflict(
                    idx + 1,
                    "Multiple Pose waypoints within 0 maxAngVel Contraints".to_string(),
                ));
            }
        } else {
            idx += 1;
        }
    }

    Ok(new_headings)
}

// This should be used before
pub fn adjust_headings(traj: &mut TrajFile) -> ChoreoResult<()> {
    let new_headings = calculate_adjusted_headings(traj)?;
    // new_headings, set to file
    new_headings.iter().enumerate().for_each(|(i, &h)| {
        traj.params.waypoints[i].heading = Expr::new(format!("{h} rad").as_str(), h);
    });
    Ok(())
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
pub fn fix_constraint_indices(traj: &TrajFile) -> (Vec<usize>, Vec<ConstraintIDX<f64>>) {
    let mut guess_points: Vec<usize> = Vec::new();
    let mut constraint_idx = Vec::<ConstraintIDX<f64>>::new();
    let num_wpts = traj.params.waypoints.len();

    traj.params
        .waypoints
        .iter()
        .enumerate()
        .filter(|(_, w)| w.is_initial_guess && !w.fix_heading && !w.fix_translation)
        .for_each(|(idx, _)| guess_points.push(idx));

    for constraint in &traj.params.constraints {
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
                    });
                }
            }
        };
    }

    (guess_points, constraint_idx)
}

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
