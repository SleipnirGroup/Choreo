use crate::spec::trajectory::{ConstraintData, ConstraintIDX, ConstraintScope, Waypoint};

use super::{
    DifferentialGenerationTransformer, FeatureLockedTransformer, GenerationContext,
    SwerveGenerationTransformer,
};

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
    constraint_idx: Vec<ConstraintIDX<f64>>,
    /// A vector of remaining waypoints matching the indexing scheme of constraint_idx
    waypoint_idx: Vec<Waypoint<f64>>
}

impl ConstraintSetter {
    fn initialize(context: &GenerationContext) -> FeatureLockedTransformer<Self> {
        let mut guess_points: Vec<usize> = Vec::new();
        let mut constraint_idx = Vec::<ConstraintIDX<f64>>::new();
        let mut waypoint_idx = Vec::<Waypoint<f64>>::new();
        let num_wpts = context.params.waypoints.len();

        context.params
            .waypoints
            .iter()
            .enumerate()
            .for_each(|(idx, w)| {
                if w.is_initial_guess && !w.fix_heading && !w.fix_translation {
                    // filtered out, save the index
                    guess_points.push(idx);
                } else {
                    waypoint_idx.push(*w);
                }
            });

        for constraint in context.params.get_enabled_constraints() {
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
                            enabled: constraint.enabled,
                        });
                    }
                }
            };
        }

        FeatureLockedTransformer::always(Self {
            guess_points,
            constraint_idx,
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
            let from = fix_scope(constraint.from, &self.guess_points);
            let to_opt = constraint.to.map(|idx| fix_scope(idx, &self.guess_points));
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
                ConstraintData::KeepInRectangle { x, y, w, h, rotation } => {
                    // Calculate the center of the rectangle
                    let center_x = x + w / 2.0;
                    let center_y = y + h / 2.0;

                    // Original corner points relative to bottom-left origin
                    let corners = vec![
                        (x, y),         // bottom-left
                        (x + w, y),     // bottom-right
                        (x + w, y + h), // top-right
                        (x, y + h),     // top-left
                    ];

                    // Apply rotation around center
                    let cos_r = rotation.cos();
                    let sin_r = rotation.sin();

                    let mut xs = Vec::new();
                    let mut ys = Vec::new();

                    for (corner_x, corner_y) in corners {
                        // Translate to origin (center of rectangle)
                        let rel_x = corner_x - center_x;
                        let rel_y = corner_y - center_y;

                        // Apply rotation
                        let rotated_x = rel_x * cos_r - rel_y * sin_r;
                        let rotated_y = rel_x * sin_r + rel_y * cos_r;

                        // Translate back
                        xs.push(center_x + rotated_x);
                        ys.push(center_y + rotated_y);
                    }

                    match to_opt {
                        None => generator.wpt_keep_in_polygon(from, xs, ys),
                        Some(to) => generator.sgmt_keep_in_polygon(from, to, xs, ys),
                    }
                },
                ConstraintData::KeepInLane {
                    tolerance
                } => {
                    if let Some(idx_to) = to_opt {
                        if let Some(wpt_from) = self.waypoint_idx.get(from) {
                            if let Some(wpt_to) = self.waypoint_idx.get(idx_to) {
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
            let from = fix_scope(constraint.from, &self.guess_points);
            let to_opt = constraint.to.map(|idx| fix_scope(idx, &self.guess_points));
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
                ConstraintData::KeepInRectangle { x, y, w, h, rotation } => {
                    // Calculate the center of the rectangle
                    let center_x = x + w / 2.0;
                    let center_y = y + h / 2.0;

                    // Original corner points relative to bottom-left origin
                    let corners = vec![
                        (x, y),         // bottom-left
                        (x + w, y),     // bottom-right
                        (x + w, y + h), // top-right
                        (x, y + h),     // top-left
                    ];

                    // Apply rotation around center
                    let cos_r = rotation.cos();
                    let sin_r = rotation.sin();

                    let mut xs = Vec::new();
                    let mut ys = Vec::new();

                    for (corner_x, corner_y) in corners {
                        // Translate to origin (center of rectangle)
                        let rel_x = corner_x - center_x;
                        let rel_y = corner_y - center_y;

                        // Apply rotation
                        let rotated_x = rel_x * cos_r - rel_y * sin_r;
                        let rotated_y = rel_x * sin_r + rel_y * cos_r;

                        // Translate back
                        xs.push(center_x + rotated_x);
                        ys.push(center_y + rotated_y);
                    }

                    match to_opt {
                        None => generator.wpt_keep_in_polygon(from, xs, ys),
                        Some(to) => generator.sgmt_keep_in_polygon(from, to, xs, ys),
                    }
                },
                ConstraintData::KeepInLane {
                    tolerance
                } => {
                    if let Some(idx_to) = to_opt {
                        if let Some(wpt_from) = self.waypoint_idx.get(from) {
                            if let Some(wpt_to) = self.waypoint_idx.get(idx_to) {
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
