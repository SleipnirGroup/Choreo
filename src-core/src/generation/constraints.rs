use crate::spec::trajectory::ConstraintData;
use crate::{
    round,
    spec::{
        trajectory::{ConstraintIDX, ConstraintScope, Parameters, TrajectoryFile},
        Expr,
    },
    ChoreoError, ChoreoResult,
};

pub fn fix_constraint_indices(params: &Parameters<f64>) -> Vec<ConstraintIDX<f64>> {
    let mut constraint_idx = Vec::<ConstraintIDX<f64>>::new();
    let num_wpts = params.waypoints.len();

    for constraint in &params.get_enabled_constraints() {
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

    constraint_idx
}

// taken from itertools crate
macro_rules! izip {
    // @closure creates a tuple-flattening closure for .map() call. usage:
    // @closure partial_pattern => partial_tuple , rest , of , iterators
    // eg. izip!( @closure ((a, b), c) => (a, b, c) , dd , ee )
    ( @closure $p:pat => $tup:expr ) => {
        |$p| $tup
    };

    // The "b" identifier is a different identifier on each recursion level thanks to hygiene.
    ( @closure $p:pat => ( $($tup:tt)* ) , $_iter:expr $( , $tail:expr )* ) => {
        izip!(@closure ($p, b) => ( $($tup)*, b ) $( , $tail )*)
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
        izip!($first)
            $(
                .zip($rest)
            )*
            .map(
                izip!(@closure a => (a) $( , $rest )*)
            )
    };
}

pub fn check_constraint_conflicts(trajectory: &TrajectoryFile) -> ChoreoResult<()> {
    let waypoints: &Vec<crate::spec::trajectory::Waypoint<Expr>> = &trajectory.params.waypoints;
    let num_wpts = waypoints.len();

    let mut wpt_has_point_at = vec![0u8; num_wpts];
    let mut sgmt_has_point_at = vec![0u8; num_wpts];
    let mut wpt_has_0_ang_vel = vec![0u8; num_wpts];
    let mut sgmt_has_0_ang_vel = vec![0u8; num_wpts];

    let constraints_idx = fix_constraint_indices(&trajectory.params.snapshot());

    // count constraint references
    for constraint in &constraints_idx {
        let from = constraint.from;
        let to_opt = constraint.to;
        match constraint.data {
            ConstraintData::MaxAngularVelocity { max } if round(max) == 0.0 => {
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
            ConstraintData::PointAt { .. } => {
                let to = to_opt.unwrap_or(from);
                for wpt_idx in from..=to {
                    wpt_has_point_at[wpt_idx] += 1;
                    if wpt_idx < to {
                        sgmt_has_point_at[wpt_idx] += 1;
                    }
                }
            }
            _ => {}
        }
    }

    for (idx_i, &sgmt_0v, &_wpt_0v, &sgmt_pa, &wpt_pa, wpt) in izip!(
        0..,
        &sgmt_has_0_ang_vel,
        &wpt_has_0_ang_vel,
        &sgmt_has_point_at,
        &wpt_has_point_at,
        waypoints
    ) {
        if idx_i == 0 && !wpt.fix_heading {
            return Err(ChoreoError::ConstraintConflict(
                1,
                "First waypoints must have fixed heading.".to_string(),
            ));
        }
        if sgmt_0v >= 1 && sgmt_pa >= 1 {
            return Err(ChoreoError::ConstraintConflict(
                idx_i + 1,
                "Segment has a 0 maxAngVel and Point At".to_string(),
            ));
        }
        if wpt_pa > 1 || sgmt_pa > 1 {
            return Err(ChoreoError::ConstraintConflict(
                idx_i + 1,
                "Waypoint has multiple Point At constraints.".to_string(),
            ));
        }
        if idx_i > 0 && sgmt_pa > 0 {
            for idx in (0..idx_i - 1).rev() {
                if sgmt_has_0_ang_vel[idx] > 0 {
                    if waypoints[idx].fix_heading || waypoints[idx + 1].fix_heading {
                        return Err(ChoreoError::ConstraintConflict(
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
                        return Err(ChoreoError::ConstraintConflict(
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
            return Err(ChoreoError::ConstraintConflict(
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
                return Err(ChoreoError::ConstraintConflict(
                    idx_mult_pose + 1,
                    "Multiple Pose waypoints within 0 maxAngVel Constraints".to_string(),
                ));
            }
        } else {
            idx_mult_pose += 1;
        }
    }

    Ok(())
}
