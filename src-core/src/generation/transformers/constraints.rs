use trajoptlib::PathBuilder;

use crate::spec::trajectory::{ConstraintData, ConstraintIDX, ConstraintScope};

use super::{DifferentialGenerationTransformer, FeatureLockedTransformer, GenerationContext, SwerveGenerationTransformer};

fn fix_scope(idx: usize, removed_idxs: &[usize]) -> usize {
    let mut to_subtract: usize = 0;
    for removed in removed_idxs {
        if *removed < idx {
            to_subtract += 1;
        }
    }
    idx - to_subtract
}

pub struct ConstraintSetter {
    guess_points: Vec<usize>,
    constraint_idx: Vec<ConstraintIDX<f64>>
}

impl ConstraintSetter {
    // separately implement initialize to share between differential and swerve
    fn initialize(ctx: &GenerationContext) -> FeatureLockedTransformer<Self> {
        let mut guess_points: Vec<usize> = Vec::new();
        let mut constraint_idx = Vec::<ConstraintIDX<f64>>::new();
        let num_wpts = ctx.params.waypoints.len();

        ctx.params.waypoints.iter()
            .enumerate()
            .filter(|(_, w)| w.is_initial_guess && !w.fix_heading && !w.fix_translation)
            .for_each(|(idx, _)| guess_points.push(idx));

        for constraint in ctx.params.get_enabled_constraints() {
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
                            data: constraint.data,
                            enabled: constraint.enabled
                        });
                    }
                }
            };
        }

        FeatureLockedTransformer::always(Self {
            guess_points,
            constraint_idx
        })
    }
}

impl SwerveGenerationTransformer for ConstraintSetter {
    fn initialize(context: &GenerationContext) -> FeatureLockedTransformer<Self> {
        Self::initialize(context)
    }
    fn transform(&self, builder: &mut trajoptlib::SwervePathBuilder) {
        for constraint in &self.constraint_idx {
            println!("constraint: {:?}", constraint);
            let from = fix_scope(constraint.from, &self.guess_points);
            let to_opt = constraint.to.map(|idx| fix_scope(idx, &self.guess_points));
            match constraint.data {
                ConstraintData::PointAt {
                    x,
                    y,
                    tolerance,
                    flip,
                } => match to_opt {
                    None => builder.wpt_point_at(from, x, y, tolerance, flip),
                    Some(to) => builder.sgmt_point_at(from, to, x, y, tolerance, flip)
                },
                ConstraintData::MaxVelocity { max } => match to_opt {
                    None => builder.wpt_linear_velocity_max_magnitude(from, max),
                    Some(to) => builder.sgmt_linear_velocity_max_magnitude(from, to, max),
                },
                ConstraintData::MaxAcceleration { max } => match to_opt {
                    None => builder.wpt_linear_acceleration_max_magnitude(from, max),
                    Some(to) => builder.sgmt_linear_acceleration_max_magnitude(from, to, max),
                },
                ConstraintData::MaxAngularVelocity { max } => match to_opt {
                    None => builder.wpt_angular_velocity_max_magnitude(from, max),
                    Some(to) => builder.sgmt_angular_velocity_max_magnitude(from, to, max),
                },
                ConstraintData::StopPoint {} => {
                    if to_opt.is_none() {
                        builder.wpt_linear_velocity_max_magnitude(from, 0.0f64);
                        builder.wpt_angular_velocity_max_magnitude(from, 0.0f64);
                    }
                },
                ConstraintData::KeepInCircle { x, y, r } => match to_opt {
                    None => builder.wpt_keep_in_circle(from, x, y, r),
                    Some(to) => builder.sgmt_keep_in_circle(from, to, x, y, r),
                },
                ConstraintData::KeepInRectangle { x, y, w, h } => {
                    let xs = vec![x, x + w, x + w, x];
                    let ys = vec![y, y, y + h, y + h];
                    match to_opt {
                        None => builder.wpt_keep_in_polygon(from, xs, ys),
                        Some(to) => builder.sgmt_keep_in_polygon(from, to, xs, ys),
                    }
                }
                ConstraintData::KeepOutCircle { x, y, r } => {
                    match to_opt {
                        None => builder.wpt_keep_out_circle(from, x, y, r),
                        Some(to) => builder.sgmt_keep_out_circle(from, to, x, y, r),
                    }
                },
            };
        }
    }
}

impl DifferentialGenerationTransformer for ConstraintSetter {
    fn initialize(context: &GenerationContext) -> FeatureLockedTransformer<Self> {
        Self::initialize(context)
    }
    fn transform(&self, builder: &mut trajoptlib::DifferentialPathBuilder) {
        for constraint in &self.constraint_idx {
            let from = fix_scope(constraint.from, &self.guess_points);
            let to_opt = constraint.to.map(|idx| fix_scope(idx, &self.guess_points));
            match constraint.data {
                ConstraintData::PointAt {
                    x,
                    y,
                    tolerance,
                    flip,
                } => if to_opt.is_none() { builder.wpt_point_at(from, x, y, tolerance, flip) },
                ConstraintData::MaxVelocity { max } => match to_opt {
                    None => builder.wpt_linear_velocity_max_magnitude(from, max),
                    Some(to) => builder.sgmt_linear_velocity_max_magnitude(from, to, max),
                },
                ConstraintData::MaxAcceleration { max } => match to_opt {
                    None => builder.wpt_linear_acceleration_max_magnitude(from, max),
                    Some(to) => builder.sgmt_linear_acceleration_max_magnitude(from, to, max),
                },
                ConstraintData::MaxAngularVelocity { max } => match to_opt {
                    None => builder.wpt_angular_velocity_max_magnitude(from, max),
                    Some(to) => builder.sgmt_angular_velocity_max_magnitude(from, to, max),
                },
                ConstraintData::StopPoint {} => {
                    if to_opt.is_none() {
                        builder.wpt_linear_velocity_max_magnitude(from, 0.0f64);
                        builder.wpt_angular_velocity_max_magnitude(from, 0.0f64);
                    }
                },
                ConstraintData::KeepInCircle { x, y, r } => match to_opt {
                    None => builder.wpt_keep_in_circle(from, x, y, r),
                    Some(to) => builder.sgmt_keep_in_circle(from, to, x, y, r),
                },
                ConstraintData::KeepInRectangle { x, y, w, h } => {
                    let xs = vec![x, x + w, x + w, x];
                    let ys = vec![y, y, y + h, y + h];
                    match to_opt {
                        None => builder.wpt_keep_in_polygon(from, xs, ys),
                        Some(to) => builder.sgmt_keep_in_polygon(from, to, xs, ys),
                    }
                }
                ConstraintData::KeepOutCircle { x, y, r } => {
                    match to_opt {
                        None => builder.wpt_keep_out_circle(from, x, y, r),
                        Some(to) => builder.sgmt_keep_out_circle(from, to, x, y, r),
                    }
                },
            };
        }
    }
}
