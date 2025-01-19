use std::{cell::RefCell, sync::mpsc::Sender};

use trajoptlib::{DifferentialTrajectory, SwerveTrajectory};

use crate::generation::generate::{HandledLocalProgressUpdate, LocalProgressUpdate};

use super::{DifferentialGenerationTransformer, FeatureLockedTransformer, GenerationContext, SwerveGenerationTransformer};

thread_local! {
    static PROGRESS_SENDER: RefCell<Option<Sender<HandledLocalProgressUpdate>>> = const { RefCell::new(None) };
}

pub struct CallbackSetter {
    progress_updater: Sender<HandledLocalProgressUpdate>,
    handle: i64
}

impl Drop for CallbackSetter {
    fn drop(&mut self) {
        PROGRESS_SENDER.with(|sender| {
            *sender.borrow_mut() = None;
        });
    }
}

fn swerve_status_callback(trajectory: SwerveTrajectory, handle: i64) {
    PROGRESS_SENDER.with(|sender| {
        if let Some(tx) = &*sender.borrow() {
            let _ = tx.send(LocalProgressUpdate::from(trajectory).handled(handle));
        }
    });
}

fn differential_status_callback(trajectory: DifferentialTrajectory, handle: i64) {
    PROGRESS_SENDER.with(|sender| {
        if let Some(tx) = &*sender.borrow() {
            let _ = tx.send(LocalProgressUpdate::from(trajectory).handled(handle));
        }
    });
}

impl SwerveGenerationTransformer for CallbackSetter {
    fn initialize(ctx: &GenerationContext) -> FeatureLockedTransformer<Self> {
        FeatureLockedTransformer::always(Self {
            progress_updater: ctx.progress_updater.clone(),
            handle: ctx.handle
        })
    }

    fn transform(&self, generator: &mut trajoptlib::SwerveTrajectoryGenerator) {
        PROGRESS_SENDER.with(|sender| {
            *sender.borrow_mut() = Some(self.progress_updater.clone());
        });
        generator.add_callback(swerve_status_callback);
    }
}

impl DifferentialGenerationTransformer for CallbackSetter {
    fn initialize(ctx: &GenerationContext) -> FeatureLockedTransformer<Self> {
        FeatureLockedTransformer::always(Self {
            progress_updater: ctx.progress_updater.clone(),
            handle: ctx.handle
        })
    }

    fn transform(&self, generator: &mut trajoptlib::DifferentialTrajectoryGenerator) {
        PROGRESS_SENDER.with(|sender| {
            *sender.borrow_mut() = Some(self.progress_updater.clone());
        });
        generator.add_callback(differential_status_callback);
    }
}
