#![allow(dead_code)]

use std::collections::{HashMap, HashSet};

use trajoptlib::{
    DifferentialPathBuilder, DifferentialTrajectory, SwervePathBuilder, SwerveTrajectory,
};

use crate::{
    spec::{
        project::ProjectFile,
        traj::{DriveType, Parameters, Sample, TrajFile},
    },
    ChoreoResult,
};

use super::intervals::guess_control_interval_counts;

macro_rules! add_transformers (
    ($module:ident : $($transformer:ident),*) => {
        mod $module;
        $(pub use $module::$transformer;)*
    };
);

add_transformers!(interval_count: IntervalCountSetter);
add_transformers!(drivetrain_and_bumpers: DrivetrainAndBumpersSetter);
add_transformers!(constraints: ConstraintSetter);
add_transformers!(callback: CallbackSetter);

pub(super) struct GenerationContext {
    pub project: ProjectFile,
    pub params: Parameters<f64>,
    pub handle: i64,
}

pub(super) struct TrajFileGenerator {
    ctx: GenerationContext,
    trajfile: TrajFile,
    swerve_transformers: HashMap<String, Vec<Box<dyn InitializedSwerveGenerationTransformer>>>,
    diffy_transformers: HashMap<String, Vec<Box<dyn InitializedDiffyGenerationTransformer>>>,
}

impl TrajFileGenerator {
    /// Create a new generator
    pub fn new(project: ProjectFile, trajfile: TrajFile, handle: i64) -> Self {
        Self {
            ctx: GenerationContext {
                project,
                params: trajfile.params.snapshot(),
                handle,
            },
            trajfile,
            swerve_transformers: HashMap::new(),
            diffy_transformers: HashMap::new(),
        }
    }

    /// Add a transformer to the generator that is only applied when generating a swerve trajectory
    pub fn add_swerve_transformer<T: SwerveGenerationTransformer + 'static>(&mut self) {
        let featurelocked_transformer = T::initialize(&self.ctx);
        let feature = featurelocked_transformer.feature;
        let transformer = Box::new(featurelocked_transformer.inner);
        self.swerve_transformers
            .entry(feature)
            .or_default()
            .push(transformer);
    }

    /// Add a transformer to the generator that is only applied when generating a differential trajectory
    pub fn add_diffy_transformer<T: DiffyGenerationTransformer + 'static>(&mut self) {
        let featurelocked_transformer = T::initialize(&self.ctx);
        let feature = featurelocked_transformer.feature;
        let transformer = Box::new(featurelocked_transformer.inner);
        self.diffy_transformers
            .entry(feature)
            .or_default()
            .push(transformer);
    }

    /// Add a transformer to the generator that is applied when generating both swerve and differential trajectories
    pub fn add_omni_transformer<
        T: SwerveGenerationTransformer + DiffyGenerationTransformer + 'static,
    >(
        &mut self,
    ) {
        self.add_swerve_transformer::<T>();
        self.add_diffy_transformer::<T>();
    }

    fn generate_swerve(&self, handle: i64) -> ChoreoResult<SwerveTrajectory> {
        let mut builder = SwervePathBuilder::new();
        let mut feature_set = HashSet::new();
        feature_set.extend(self.ctx.project.generation_features.clone());
        feature_set.insert("".to_string());

        println!("Generating Swerve Trajectory");
        println!("Features: {:?}", feature_set);

        for feature in feature_set.iter() {
            if let Some(transformers) = self.swerve_transformers.get(feature) {
                for transformer in transformers.iter() {
                    transformer.trans(&mut builder);
                }
            }
        }

        builder.generate(true, handle).map_err(Into::into)
    }

    fn generate_diffy(&self, handle: i64) -> ChoreoResult<DifferentialTrajectory> {
        let mut builder = DifferentialPathBuilder::new();
        let mut feature_set = HashSet::new();
        feature_set.extend(self.ctx.project.generation_features.clone());
        feature_set.insert("".to_string());

        println!("Generating Diffy Trajectory");
        println!("Features: {:?}", feature_set);

        for feature in feature_set.iter() {
            if let Some(transformers) = self.diffy_transformers.get(feature) {
                for transformer in transformers.iter() {
                    transformer.trans(&mut builder);
                }
            }
        }

        builder.generate(true, handle).map_err(Into::into)
    }

    /// Generate the trajectory file
    pub fn generate(self) -> ChoreoResult<TrajFile> {
        let samples: Vec<Sample> = match &self.ctx.project.r#type {
            DriveType::Swerve => self
                .generate_swerve(self.ctx.handle)?
                .samples
                .into_iter()
                .map(Into::into)
                .collect(),
            DriveType::Differential => self
                .generate_diffy(self.ctx.handle)?
                .samples
                .into_iter()
                .map(Into::into)
                .collect(),
        };

        let counts_vec = guess_control_interval_counts(
            &self.ctx.project.config.snapshot(),
            &self.trajfile.params.snapshot(),
        )?;

        Ok(postprocess(&samples, self.trajfile, counts_vec))
    }
}

pub(super) struct FeatureLockedTransformer<T> {
    feature: String,
    inner: T,
}

impl<T> FeatureLockedTransformer<T> {
    pub fn new(feature: String, inner: T) -> Self {
        Self { feature, inner }
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
pub(super) trait SwerveGenerationTransformer:
    InitializedSwerveGenerationTransformer + Sized
{
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
pub(super) trait DiffyGenerationTransformer:
    InitializedDiffyGenerationTransformer + Sized
{
    fn initialize(context: &GenerationContext) -> FeatureLockedTransformer<Self>;
    fn transform(&self, builder: &mut DifferentialPathBuilder);
}

impl<T: DiffyGenerationTransformer> InitializedDiffyGenerationTransformer for T {
    fn trans(&self, builder: &mut DifferentialPathBuilder) {
        self.transform(builder);
    }
}

fn postprocess(result: &[Sample], mut path: TrajFile, counts_vec: Vec<usize>) -> TrajFile {
    println!("Postprocessing");

    let mut snapshot = path.params.snapshot();
    path.params
        .waypoints
        .iter_mut()
        .zip(snapshot.waypoints.iter_mut())
        .zip(counts_vec)
        .for_each(|w| {
            w.0 .0.intervals = w.1;
            w.0 .1.intervals = w.1;
        });
    // convert the result from trajoptlib to a format matching the save file.
    // Calculate the waypoint timing
    let mut interval = 0;
    let intervals = snapshot
        .waypoints
        .iter()
        .enumerate()
        .map(|pt| {
            let total_intervals = interval;
            interval += pt.1.intervals;
            (
                pt.1.split || pt.0 == 0 || pt.0 == snapshot.waypoints.len() - 1,
                total_intervals,
                result.get(total_intervals).map_or(0.0, |s| match s {
                    Sample::Swerve { t, .. } => *t,
                    Sample::DifferentialDrive { t, .. } => *t,
                }),
            )
        })
        .collect::<Vec<(bool, usize, f64)>>();

    let waypoint_times = intervals.iter().map(|a| a.2).collect::<Vec<f64>>();
    // Calculate splits
    let splits = intervals
        .iter()
        .filter(|a| a.0) // filter by split flag
        .map(|a| a.1) // map to associate interval
        .collect::<Vec<usize>>();
    path.traj.samples = splits
        .windows(2) // get adjacent pairs of interval counts
        .filter_map(|window| {
            result
                // grab the range including both endpoints,
                // there are no bounds checks on this slice so be weary of crashes
                .get((window[0])..=(window[1]))
                .map(|slice| slice.to_vec())
        })
        .collect::<Vec<Vec<Sample>>>();
    path.traj.waypoints = waypoint_times;
    path.snapshot = Some(snapshot);
    path
}
