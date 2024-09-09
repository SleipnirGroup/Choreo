use trajoptlib::{DifferentialDrivetrain, PathBuilder, SwerveDrivetrain};

use crate::spec::project::{Module, RobotConfig};

use super::{DiffyGenerationTransformer, FeatureLockedTransformer, GenerationContext, SwerveGenerationTransformer};


pub struct DrivetrainAndBumpersSetter {
    config: RobotConfig<f64>
}

impl DrivetrainAndBumpersSetter {
    // separately implement initialize to share between diffy and swerve
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
                .modules
                .map(|modu: Module<f64>| modu.translation())
                .to_vec(),
        };

        builder.set_drivetrain(&drivetrain);
        builder.set_bumpers(
            config.bumper.back + config.bumper.front,
            config.bumper.left + config.bumper.right,
        );
    }
}

impl DiffyGenerationTransformer for DrivetrainAndBumpersSetter {
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
            trackwidth: config.modules[1].y * 2.0,
        };

        builder.set_drivetrain(&drivetrain);
        builder.set_bumpers(
            config.bumper.back + config.bumper.front,
            config.bumper.left + config.bumper.right,
        );
    }
}
