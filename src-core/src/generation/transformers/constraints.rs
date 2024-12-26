use crate::{generation::{constraints::fix_constraint_indices, intervals::initial_guess_waypoints}, spec::trajectory::{ConstraintData, ConstraintIDX, Waypoint}};

use super::{
    DifferentialGenerationTransformer, FeatureLockedTransformer, GenerationContext,
    SwerveGenerationTransformer,
};

/// Retruns an index of a constraint as if the removed indexes were never present.
fn skip_removed_indexes(idx: usize, removed_idxs: &[usize]) -> usize {
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
    constraint_idx: Vec<ConstraintIDX<f64>>,
    /// A vector of remaining waypoints matching the indexing scheme of constraint_idx
    waypoint_idx: Vec<Waypoint<f64>>
}

impl ConstraintSetter {
    fn initialize(context: &GenerationContext) -> FeatureLockedTransformer<Self> {
        let mut guess_points: Vec<usize> = Vec::new();
        let mut waypoint_idx = Vec::<Waypoint<f64>>::new();

        let initial_guess_indexes = initial_guess_waypoints(&context.params);

        context.params
            .waypoints
            .iter()
            .enumerate()
            .for_each(|(idx, w)| {
                if initial_guess_indexes[idx] && !w.fix_heading && !w.fix_translation {
                    // filtered out, save the index
                    guess_points.push(idx);
                } else {
                    waypoint_idx.push(*w);
                }
            });

        FeatureLockedTransformer::always(Self {
            guess_points,
            constraint_idx: fix_constraint_indices(&context.params),
            waypoint_idx
        })
    }
}

impl SwerveGenerationTransformer for ConstraintSetter {
    fn initialize(context: &GenerationContext) -> FeatureLockedTransformer<Self> {
        Self::initialize(context)
    }

    fn transform(&self, generator: &mut trajoptlib::SwerveTrajectoryGenerator) {
        for constraint in &self.constraint_idx {
            let from = skip_removed_indexes(constraint.from, &self.guess_points);
            let to_opt = constraint.to.map(|idx| skip_removed_indexes(idx, &self.guess_points));
            match constraint.data {
                ConstraintData::PointAt {
                    x,
                    y,
                    tolerance,
                    flip,
                } => match to_opt {
                    None => generator.wpt_point_at(from, x, y, tolerance, flip),
                    Some(to) => generator.sgmt_point_at(from, to, x, y, tolerance, flip),
                },
                ConstraintData::MaxVelocity { max } => match to_opt {
                    None => generator.wpt_linear_velocity_max_magnitude(from, max),
                    Some(to) => generator.sgmt_linear_velocity_max_magnitude(from, to, max),
                },
                ConstraintData::MaxAcceleration { max } => match to_opt {
                    None => generator.wpt_linear_acceleration_max_magnitude(from, max),
                    Some(to) => generator.sgmt_linear_acceleration_max_magnitude(from, to, max),
                },
                ConstraintData::MaxAngularVelocity { max } => match to_opt {
                    None => generator.wpt_angular_velocity_max_magnitude(from, max),
                    Some(to) => generator.sgmt_angular_velocity_max_magnitude(from, to, max),
                },
                ConstraintData::StopPoint {} => {
                    if to_opt.is_none() {
                        generator.wpt_linear_velocity_max_magnitude(from, 0.0f64);
                        generator.wpt_angular_velocity_max_magnitude(from, 0.0f64);
                    }
                },
                ConstraintData::KeepInCircle { x, y, r } => match to_opt {
                    None => generator.wpt_keep_in_circle(from, x, y, r),
                    Some(to) => generator.sgmt_keep_in_circle(from, to, x, y, r),
                },
                ConstraintData::KeepInRectangle { x, y, w, h } => {
                    let xs = vec![x, x + w, x + w, x];
                    let ys = vec![y, y, y + h, y + h];
                    match to_opt {
                        None => generator.wpt_keep_in_polygon(from, xs, ys),
                        Some(to) => generator.sgmt_keep_in_polygon(from, to, xs, ys),
                    }
                },
                ConstraintData::KeepInLane {
                    tolerance
                } => {
                    if let Some(idx_to) = to_opt {
                        if let Some(wpt_to) = self.waypoint_idx.get(idx_to) {
                            if let Some(wpt_from) = self.waypoint_idx.get(from) {
                                generator.sgmt_keep_in_lane(
                                    from,
                                    idx_to,
                                    wpt_from.x,
                                    wpt_from.y,
                                    wpt_to.x,
                                    wpt_to.y,
                                    tolerance,
                                );
                            }
                        }
                    }
                },
                ConstraintData::KeepOutCircle { x, y, r } => match to_opt {
                    None => generator.wpt_keep_out_circle(from, x, y, r),
                    Some(to) => generator.sgmt_keep_out_circle(from, to, x, y, r),
                },
            };
        }
    }
}

impl DifferentialGenerationTransformer for ConstraintSetter {
    fn initialize(context: &GenerationContext) -> FeatureLockedTransformer<Self> {
        Self::initialize(context)
    }

    fn transform(&self, generator: &mut trajoptlib::DifferentialTrajectoryGenerator) {
        for constraint in &self.constraint_idx {
            let from = skip_removed_indexes(constraint.from, &self.guess_points);
            let to_opt = constraint.to.map(|idx| skip_removed_indexes(idx, &self.guess_points));
            match constraint.data {
                ConstraintData::PointAt {
                    x,
                    y,
                    tolerance,
                    flip,
                } => {
                    if to_opt.is_none() {
                        generator.wpt_point_at(from, x, y, tolerance, flip)
                    }
                }
                ConstraintData::MaxVelocity { max } => match to_opt {
                    None => generator.wpt_linear_velocity_max_magnitude(from, max),
                    Some(to) => generator.sgmt_linear_velocity_max_magnitude(from, to, max),
                },
                ConstraintData::MaxAcceleration { max } => match to_opt {
                    None => generator.wpt_linear_acceleration_max_magnitude(from, max),
                    Some(to) => generator.sgmt_linear_acceleration_max_magnitude(from, to, max),
                },
                ConstraintData::MaxAngularVelocity { max } => match to_opt {
                    None => generator.wpt_angular_velocity_max_magnitude(from, max),
                    Some(to) => generator.sgmt_angular_velocity_max_magnitude(from, to, max),
                },
                ConstraintData::StopPoint {} => {
                    if to_opt.is_none() {
                        generator.wpt_linear_velocity_max_magnitude(from, 0.0f64);
                        generator.wpt_angular_velocity_max_magnitude(from, 0.0f64);
                    }
                }
                ConstraintData::KeepInCircle { x, y, r } => match to_opt {
                    None => generator.wpt_keep_in_circle(from, x, y, r),
                    Some(to) => generator.sgmt_keep_in_circle(from, to, x, y, r),
                },
                ConstraintData::KeepInRectangle { x, y, w, h } => {
                    let xs = vec![x, x + w, x + w, x];
                    let ys = vec![y, y, y + h, y + h];
                    match to_opt {
                        None => generator.wpt_keep_in_polygon(from, xs, ys),
                        Some(to) => generator.sgmt_keep_in_polygon(from, to, xs, ys),
                    }
                },
                ConstraintData::KeepInLane {
                    tolerance
                } => {
                    if let Some(idx_to) = to_opt {
                        if let Some(wpt_to) = self.waypoint_idx.get(idx_to) {
                            if let Some(wpt_from) = self.waypoint_idx.get(from) {
                                generator.sgmt_keep_in_lane(
                                    from,
                                    idx_to,
                                    wpt_from.x,
                                    wpt_from.y,
                                    wpt_to.x,
                                    wpt_to.y,
                                    tolerance,
                                );
                            }
                        }
                    }
                },
                ConstraintData::KeepOutCircle { x, y, r } => match to_opt {
                    None => generator.wpt_keep_out_circle(from, x, y, r),
                    Some(to) => generator.sgmt_keep_out_circle(from, to, x, y, r),
                },
            };
        }
    }
}
