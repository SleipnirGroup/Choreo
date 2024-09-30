use trajoptlib::{DifferentialDrivetrain, PathBuilder, SwerveDrivetrain};

use crate::spec::project::{RobotConfig};

use super::{DifferentialGenerationTransformer, FeatureLockedTransformer, GenerationContext, SwerveGenerationTransformer};


pub struct DrivetrainAndBumpersSetter {
    config: RobotConfig<f64>
}

impl DrivetrainAndBumpersSetter {
    // separately implement initialize to share between differential and swerve
    fn initialize(ctx: &GenerationContext) -> FeatureLockedTransformer<Self> {
        FeatureLockedTransformer::always(Self {
            config: ctx.project.config.snapshot()
        })
    }
}

impl SwerveGenerationTransformer for DrivetrainAndBumpersSetter {
    fn initialize(context: &GenerationContext) -> FeatureLockedTransformer<Self> {
        Self::initialize(context)
    }
    fn transform(&self, builder: &mut trajoptlib::SwervePathBuilder) {
        let config = &self.config;
        let drivetrain = SwerveDrivetrain {
            mass: config.mass,
            moi: config.inertia,
            wheel_radius: config.radius,
            // rad per sec
            wheel_max_angular_velocity: config.vmax / config.gearing,
            wheel_max_torque: config.tmax * config.gearing,
            modules: config
                .module_translations(),
        };

        builder.set_drivetrain(&drivetrain);
        builder.set_bumpers(
            config.bumper.front,
            config.bumper.side,
            config.bumper.side,
            config.bumper.back
        );
    }
}

impl DifferentialGenerationTransformer for DrivetrainAndBumpersSetter {
    fn initialize(context: &GenerationContext) -> FeatureLockedTransformer<Self> {
        Self::initialize(context)
    }
    fn transform(&self, builder: &mut trajoptlib::DifferentialPathBuilder) {
        let config = &self.config;
        let drivetrain = DifferentialDrivetrain {
            mass: config.mass,
            moi: config.inertia,
            wheel_radius: config.radius,
            // rad per sec
            wheel_max_angular_velocity: config.vmax / config.gearing,
            wheel_max_torque: config.tmax * config.gearing,
            trackwidth: config.differential_track_width,
        };

        builder.set_drivetrain(&drivetrain);
        builder.set_bumpers(
            config.bumper.front,
            config.bumper.side,
            config.bumper.side,
            config.bumper.back
        );
    }
}
