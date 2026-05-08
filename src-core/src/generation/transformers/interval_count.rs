use trajoptlib::Pose2d;

use crate::spec::trajectory::Waypoint;

use super::{
    DifferentialGenerationTransformer, FeatureLockedTransformer, GenerationContext,
    SwerveGenerationTransformer,
};

pub struct IntervalCountSetter {
    waypoints: Vec<Waypoint<f64>>,
}

impl SwerveGenerationTransformer for IntervalCountSetter {
    fn initialize(context: &GenerationContext) -> FeatureLockedTransformer<Self> {
        FeatureLockedTransformer::always(Self {
            waypoints: context.params.waypoints.clone(),
        })
    }

    fn transform(&self, generator: &mut trajoptlib::SwerveTrajectoryGenerator) {
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
                    *last += wpt.intervals;
                }
            } else {
                if wpt_cnt > 0 {
                    generator.sgmt_initial_guess_points(wpt_cnt - 1, &guess_points_after_waypoint);
                }
                guess_points_after_waypoint.clear();
                if wpt.fix_heading && wpt.fix_translation {
                    generator.pose_wpt(wpt_cnt, wpt.x, wpt.y, wpt.heading);
                } else if wpt.fix_translation {
                    generator.translation_wpt(wpt_cnt, wpt.x, wpt.y, wpt.heading);
                } else {
                    generator.empty_wpt(wpt_cnt, wpt.x, wpt.y, wpt.heading);
                }
                wpt_cnt += 1;
                if i != waypoints.len() - 1 {
                    control_interval_counts.push(wpt.intervals);
                }
            }
        }

        generator.set_control_interval_counts(control_interval_counts);
    }
}

impl DifferentialGenerationTransformer for IntervalCountSetter {
    fn initialize(context: &GenerationContext) -> FeatureLockedTransformer<Self> {
        FeatureLockedTransformer::always(Self {
            waypoints: context.params.waypoints.clone(),
        })
    }

    fn transform(&self, generator: &mut trajoptlib::DifferentialTrajectoryGenerator) {
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
                    *last += wpt.intervals;
                }
            } else {
                if wpt_cnt > 0 {
                    generator.sgmt_initial_guess_points(wpt_cnt - 1, &guess_points_after_waypoint);
                }
                guess_points_after_waypoint.clear();
                if wpt.fix_heading && wpt.fix_translation {
                    generator.pose_wpt(wpt_cnt, wpt.x, wpt.y, wpt.heading);
                } else if wpt.fix_translation {
                    generator.translation_wpt(wpt_cnt, wpt.x, wpt.y, wpt.heading);
                } else {
                    generator.empty_wpt(wpt_cnt, wpt.x, wpt.y, wpt.heading);
                }
                wpt_cnt += 1;
                if i != waypoints.len() - 1 {
                    control_interval_counts.push(wpt.intervals);
                }
            }
        }

        generator.set_control_interval_counts(control_interval_counts);
    }
}
