use trajoptlib::{DifferentialTrajectory, SwerveTrajectory};

use crate::{generation::generate::{LocalProgressUpdate, PROGRESS_SENDER_LOCK}, ResultExt};

use super::{DiffyGenerationTransformer, FeatureLockedTransformer, GenerationContext, SwerveGenerationTransformer};


pub struct CallbackSetter;

impl CallbackSetter {
    // separately implement initialize to share between diffy and swerve
    fn initialize(_: &GenerationContext) -> FeatureLockedTransformer<Self> {
        FeatureLockedTransformer::always(Self)
    }
}

fn swerve_status_callback(traj: SwerveTrajectory, handle: i64) {
    let tx_opt = PROGRESS_SENDER_LOCK.get();
    if let Some(tx) = tx_opt {
        tx.send(LocalProgressUpdate::from(traj).handled(handle))
        .trace_warn();
    };
}

fn diff_status_callback(traj: DifferentialTrajectory, handle: i64) {
    let tx_opt = PROGRESS_SENDER_LOCK.get();
    if let Some(tx) = tx_opt {
        tx.send(LocalProgressUpdate::from(traj).handled(handle))
        .trace_warn();
    };
}

impl SwerveGenerationTransformer for CallbackSetter {
    fn initialize(context: &GenerationContext) -> FeatureLockedTransformer<Self> {
        Self::initialize(context)
    }
    fn transform(&self, builder: &mut trajoptlib::SwervePathBuilder) {
        builder.add_progress_callback(swerve_status_callback);
    }
}

impl DiffyGenerationTransformer for CallbackSetter {
    fn initialize(context: &GenerationContext) -> FeatureLockedTransformer<Self> {
        Self::initialize(context)
    }
    fn transform(&self, builder: &mut trajoptlib::DifferentialPathBuilder) {
        builder.add_progress_callback(diff_status_callback);
    }
}
