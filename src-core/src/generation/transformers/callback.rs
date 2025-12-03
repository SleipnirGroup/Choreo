use trajoptlib::{DifferentialTrajectory, SwerveTrajectory};

use crate::{
    ResultExt,
    generation::generate::{LocalProgressUpdate, PROGRESS_SENDER_LOCK},
};

use super::{
    DifferentialGenerationTransformer, FeatureLockedTransformer, GenerationContext,
    SwerveGenerationTransformer,
};

pub struct CallbackSetter;

fn swerve_status_callback(trajectory: SwerveTrajectory, handle: i64) {
    let tx_opt = PROGRESS_SENDER_LOCK.get();
    if let Some(tx) = tx_opt {
        let _ = tx
            .send(LocalProgressUpdate::from(trajectory).handled(handle))
            .trace_warn();
    };
}

fn differential_status_callback(trajectory: DifferentialTrajectory, handle: i64) {
    let tx_opt = PROGRESS_SENDER_LOCK.get();
    if let Some(tx) = tx_opt {
        let _ = tx
            .send(LocalProgressUpdate::from(trajectory).handled(handle))
            .trace_warn();
    };
}

impl SwerveGenerationTransformer for CallbackSetter {
    fn initialize(_: &GenerationContext) -> FeatureLockedTransformer<Self> {
        FeatureLockedTransformer::always(Self)
    }

    fn transform(&self, generator: &mut trajoptlib::SwerveTrajectoryGenerator) {
        generator.add_callback(swerve_status_callback);
    }
}

impl DifferentialGenerationTransformer for CallbackSetter {
    fn initialize(_: &GenerationContext) -> FeatureLockedTransformer<Self> {
        FeatureLockedTransformer::always(Self)
    }

    fn transform(&self, generator: &mut trajoptlib::DifferentialTrajectoryGenerator) {
        generator.add_callback(differential_status_callback);
    }
}
