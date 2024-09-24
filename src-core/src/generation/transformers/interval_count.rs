use trajoptlib::{PathBuilder, Pose2d};

use crate::{generation::intervals::guess_control_interval_counts, spec::trajectory::Waypoint};

use super::{DifferentialGenerationTransformer, FeatureLockedTransformer, GenerationContext, SwerveGenerationTransformer};


pub struct IntervalCountSetter {
    counts: Vec<usize>,
    waypoints: Vec<Waypoint<f64>>
}

impl IntervalCountSetter {
    // separately implement initialize to share between differential and swerve
    fn initialize(ctx: &GenerationContext) -> FeatureLockedTransformer<Self> {
        FeatureLockedTransformer::always(Self {
            counts: guess_control_interval_counts(&ctx.project.config.snapshot(), &ctx.params).unwrap_or_default(),
            waypoints: ctx.params.waypoints.clone()
        })
    }
    fn transform<T: PathBuilder>(&self, builder: &mut T) {
        let waypoints = &self.waypoints;
        let mut guess_points_after_waypoint = Vec::new();
        let mut control_interval_counts = Vec::new();
        let mut wpt_cnt = 0;
        for i in 0..waypoints.len() {
            let wpt = &waypoints[i];
            // add initial guess points (actually unconstrained empty wpts in Choreo terms)
            if wpt.is_initial_guess && !wpt.fix_heading && !wpt.fix_translation {
                let guess_point = Pose2d {
                    x: wpt.x,
                    y: wpt.y,
                    heading: wpt.heading,
                };
                guess_points_after_waypoint.push(guess_point);
                if let Some(last) = control_interval_counts.last_mut() {
                    *last += self.counts[i];
                }
            } else {
                if wpt_cnt > 0 {
                    builder.sgmt_initial_guess_points(wpt_cnt - 1, &guess_points_after_waypoint);
                }
                guess_points_after_waypoint.clear();
                if wpt.fix_heading && wpt.fix_translation {
                    builder.pose_wpt(wpt_cnt, wpt.x, wpt.y, wpt.heading);
                } else if wpt.fix_translation {
                    builder.translation_wpt(wpt_cnt, wpt.x, wpt.y, wpt.heading);
                } else {
                    builder.empty_wpt(wpt_cnt, wpt.x, wpt.y, wpt.heading);
                }
                wpt_cnt += 1;
                if i != waypoints.len() - 1 {
                    control_interval_counts.push(self.counts[i]);
                }
            }
        }

        println!("Control Interval Counts: {:?}", control_interval_counts);

        builder.set_control_interval_counts(control_interval_counts);
    }
}

impl SwerveGenerationTransformer for IntervalCountSetter {
    fn initialize(context: &GenerationContext) -> FeatureLockedTransformer<Self> {
        Self::initialize(context)
    }
    fn transform(&self, builder: &mut trajoptlib::SwervePathBuilder) {
        self.transform(builder);
    }
}

impl DifferentialGenerationTransformer for IntervalCountSetter {
    fn initialize(context: &GenerationContext) -> FeatureLockedTransformer<Self> {
        Self::initialize(context)
    }
    fn transform(&self, builder: &mut trajoptlib::DifferentialPathBuilder) {
        self.transform(builder);
    }
}
