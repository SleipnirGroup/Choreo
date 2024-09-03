#![allow(dead_code)]

use std::collections::{HashMap, HashSet};

use trajoptlib::{DifferentialPathBuilder, DifferentialTrajectory, SwervePathBuilder, SwerveTrajectory};

use crate::{spec::{project::ProjectFile, traj::{Parameters, SampleType, TrajFile}}, ChoreoError, ChoreoResult};

macro_rules! add_transformers (
    ($module:ident : $($transformer:ident),*) => {
        mod $module;
        $(pub use $module::$transformer;)*
    };
);


add_transformers!(interval_count: IntervalCountSetter);
add_transformers!(drivetrain_and_bumpers: DrivetrainAndBumpersSetter);



struct GenerationContext {
    pub project: ProjectFile,
    pub params: Parameters<f64>
}

pub(super) struct TrajFileGenerator {
    ctx: GenerationContext,
    trajfile: TrajFile,
    swerve_transformers: HashMap<String, Vec<Box<dyn InitializedSwerveGenerationTransformer>>>,
    swerve_post_processor: Option<fn(TrajFile, SwerveTrajectory) -> ChoreoResult<TrajFile>>,
    diffy_transformers: HashMap<String, Vec<Box<dyn InitializedDiffyGenerationTransformer>>>,
    diffy_post_processor: Option<fn(TrajFile, DifferentialTrajectory) -> ChoreoResult<TrajFile>>
}

impl TrajFileGenerator {
    pub fn new(project: ProjectFile, trajfile: TrajFile) -> Self {
        Self {
            ctx: GenerationContext {
                project,
                params: trajfile.params.snapshot()
            },
            trajfile,
            swerve_transformers: HashMap::new(),
            diffy_transformers: HashMap::new(),
            swerve_post_processor: None,
            diffy_post_processor: None
        }
    }

    pub fn add_swerve_transformer<T: SwerveGenerationTransformer + 'static>(&mut self) {
        let featurelocked_transformer = T::initialize(&mut self.ctx);
        let feature = featurelocked_transformer.feature;
        let transformer = Box::new(featurelocked_transformer.inner);
        self.swerve_transformers.entry(feature).or_default().push(transformer);
    }

    pub fn add_diffy_transformer<T: DiffyGenerationTransformer + 'static>(&mut self) {
        let featurelocked_transformer = T::initialize(&mut self.ctx);
        let feature = featurelocked_transformer.feature;
        let transformer = Box::new(featurelocked_transformer.inner);
        self.diffy_transformers.entry(feature).or_default().push(transformer);
    }

    pub fn add_omni_transformer<T: SwerveGenerationTransformer + DiffyGenerationTransformer + 'static>(&mut self) {
        self.add_swerve_transformer::<T>();
        self.add_diffy_transformer::<T>();
    }

    pub fn set_swerve_post_processor(&mut self, post_processor: fn(TrajFile, SwerveTrajectory) -> ChoreoResult<TrajFile>) {
        self.swerve_post_processor = Some(post_processor);
    }

    pub fn set_diffy_post_processor(&mut self, post_processor: fn(TrajFile, DifferentialTrajectory) -> ChoreoResult<TrajFile>) {
        self.diffy_post_processor = Some(post_processor);
    }

    fn generate_swerve(&self, handle: i64, features: Vec<String>) -> ChoreoResult<SwerveTrajectory> {
        let mut builder = SwervePathBuilder::new();
        let mut feature_set = HashSet::new();
        feature_set.extend(features);
        feature_set.insert("".to_string());

        for feature in feature_set.iter() {
            if let Some(transformers) = self.swerve_transformers.get(feature) {
                for transformer in transformers.iter() {
                    transformer.trans(&mut builder);
                }
            }
        }

        builder.generate(true, handle).map_err(ChoreoError::TrajOpt)
    }

    fn generate_diffy(&self, handle: i64, features: Vec<String>) -> ChoreoResult<DifferentialTrajectory> {
        let mut builder = DifferentialPathBuilder::new();
        let mut feature_set = HashSet::new();
        feature_set.extend(features);
        feature_set.insert("".to_string());

        for feature in feature_set.iter() {
            if let Some(transformers) = self.diffy_transformers.get(feature) {
                for transformer in transformers.iter() {
                    transformer.trans(&mut builder);
                }
            }
        }

        builder.generate(true, handle).map_err(ChoreoError::TrajOpt)
    }

    pub fn generate(self, r#type: SampleType, handle: i64, features: Vec<String>) -> ChoreoResult<TrajFile> {
        match r#type {
            SampleType::Swerve => {
                let gen_traj = self.generate_swerve(handle, features)?;
                self.swerve_post_processor
                    .unwrap_or(|trajfile, _| Ok(trajfile))
                    (self.trajfile, gen_traj)
            },
            SampleType::Differential => {
                let gen_traj = self.generate_diffy(handle, features)?;
                self.diffy_post_processor
                    .unwrap_or(|trajfile, _| Ok(trajfile))
                    (self.trajfile, gen_traj)
            }
        }
    }
}

pub(super) struct FeatureLockedTransformer<T> {
    feature: String,
    inner: T
}

impl <T> FeatureLockedTransformer<T> {
    pub fn new(feature: String, inner: T) -> Self {
        Self {
            feature,
            inner
        }
    }

    pub fn always(inner: T) -> Self {
        Self::new("".to_string(), inner)
    }
}

/// An object safe variant of the [`SwerveGenerationTransformer`] trait,
/// 
/// Should not be implemented directly, instead implement [`SwerveGenerationTransformer`]
pub(super) trait InitializedSwerveGenerationTransformer {
    fn trans(&self, builder: &mut SwervePathBuilder);
}

/// A trait for objects that can transform a [`SwervePathBuilder`]
pub(super) trait SwerveGenerationTransformer: InitializedSwerveGenerationTransformer + Sized {
    fn initialize(context: &GenerationContext) -> FeatureLockedTransformer<Self>;
    fn transform(&self, builder: &mut SwervePathBuilder);
}

impl<T: SwerveGenerationTransformer> InitializedSwerveGenerationTransformer for T {
    fn trans(&self, builder: &mut SwervePathBuilder) {
        self.transform(builder);
    }
}


/// An object safe variant of the [`DiffyGenerationTransformer`] trait,
/// 
/// Should not be implemented directly, instead implement [`DiffyGenerationTransformer`]
pub(super) trait InitializedDiffyGenerationTransformer {
    fn trans(&self, builder: &mut DifferentialPathBuilder);
}

/// A trait for objects that can transform a [`DifferentialPathBuilder`]
pub(super) trait DiffyGenerationTransformer: InitializedDiffyGenerationTransformer + Sized {
    fn initialize(context: &GenerationContext) -> FeatureLockedTransformer<Self>;
    fn transform(&self, builder: &mut DifferentialPathBuilder);
}

impl<T: DiffyGenerationTransformer> InitializedDiffyGenerationTransformer for T {
    fn trans(&self, builder: &mut DifferentialPathBuilder) {
        self.transform(builder);
    }
}