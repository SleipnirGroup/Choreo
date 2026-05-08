use trajoptlib::{DifferentialDrivetrain, SwerveDrivetrain};

use crate::spec::project::RobotConfig;

use super::{
    DifferentialGenerationTransformer, FeatureLockedTransformer, GenerationContext,
    SwerveGenerationTransformer,
};

pub struct DrivetrainAndBumpersSetter {
    config: RobotConfig<f64>,
}

impl SwerveGenerationTransformer for DrivetrainAndBumpersSetter {
    fn initialize(context: &GenerationContext) -> FeatureLockedTransformer<Self> {
        FeatureLockedTransformer::always(Self {
            config: context.project.config.snapshot(),
        })
    }

    fn transform(&self, generator: &mut trajoptlib::SwerveTrajectoryGenerator) {
        let config = &self.config;
        let drivetrain = SwerveDrivetrain {
            mass: config.mass,
            moi: config.inertia,
            wheel_radius: config.radius,
            // rad per sec
            wheel_max_angular_velocity: config.vmax / config.gearing,
            wheel_max_torque: config.tmax * config.gearing,
            wheel_cof: config.cof,
            modules: config.module_translations(),
        };

        generator.set_drivetrain(&drivetrain);
        generator.set_bumpers(
            config.bumper.front,
            config.bumper.side,
            config.bumper.side,
            config.bumper.back,
        );
    }
}

impl DifferentialGenerationTransformer for DrivetrainAndBumpersSetter {
    fn initialize(context: &GenerationContext) -> FeatureLockedTransformer<Self> {
        FeatureLockedTransformer::always(Self {
            config: context.project.config.snapshot(),
        })
    }

    fn transform(&self, generator: &mut trajoptlib::DifferentialTrajectoryGenerator) {
        let config = &self.config;
        let drivetrain = DifferentialDrivetrain {
            mass: config.mass,
            moi: config.inertia,
            wheel_radius: config.radius,
            // rad per sec
            wheel_max_angular_velocity: config.vmax / config.gearing,
            wheel_max_torque: config.tmax * config.gearing,
            wheel_cof: config.cof,
            trackwidth: config.differential_track_width,
        };

        generator.set_drivetrain(&drivetrain);
        generator.set_bumpers(
            config.bumper.front,
            config.bumper.side,
            config.bumper.side,
            config.bumper.back,
        );
    }
}
