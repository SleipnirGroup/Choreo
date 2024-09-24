#![allow(dead_code)]

use std::collections::{HashMap, HashSet};

use trajoptlib::{
    DifferentialPathBuilder, DifferentialTrajectory, SwervePathBuilder, SwerveTrajectory,
};

use crate::{
    spec::{
        project::ProjectFile,
        trajectory::{DriveType, Parameters, Sample, TrajectoryFile},
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

pub(super) struct TrajectoryFileGenerator {
    ctx: GenerationContext,
    trajectory_file: TrajectoryFile,
    swerve_transformers: HashMap<String, Vec<Box<dyn InitializedSwerveGenerationTransformer>>>,
    differential_transformers:
        HashMap<String, Vec<Box<dyn InitializedDifferentialGenerationTransformer>>>,
}

impl TrajectoryFileGenerator {
    /// Create a new generator
    pub fn new(project: ProjectFile, trajectory_file: TrajectoryFile, handle: i64) -> Self {
        Self {
            ctx: GenerationContext {
                project,
                params: trajectory_file.params.snapshot(),
                handle,
            },
            trajectory_file,
            swerve_transformers: HashMap::new(),
            differential_transformers: HashMap::new(),
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
    pub fn add_differential_transformer<T: DifferentialGenerationTransformer + 'static>(&mut self) {
        let featurelocked_transformer = T::initialize(&self.ctx);
        let feature = featurelocked_transformer.feature;
        let transformer = Box::new(featurelocked_transformer.inner);
        self.differential_transformers
            .entry(feature)
            .or_default()
            .push(transformer);
    }

    /// Add a transformer to the generator that is applied when generating both swerve and differential trajectories
    pub fn add_omni_transformer<
        T: SwerveGenerationTransformer + DifferentialGenerationTransformer + 'static,
    >(
        &mut self,
    ) {
        self.add_swerve_transformer::<T>();
        self.add_differential_transformer::<T>();
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

    fn generate_differential(&self, handle: i64) -> ChoreoResult<DifferentialTrajectory> {
        let mut builder = DifferentialPathBuilder::new();
        let mut feature_set = HashSet::new();
        feature_set.extend(self.ctx.project.generation_features.clone());
        feature_set.insert("".to_string());

        println!("Generating Differential Trajectory");
        println!("Features: {:?}", feature_set);

        for feature in feature_set.iter() {
            if let Some(transformers) = self.differential_transformers.get(feature) {
                for transformer in transformers.iter() {
                    transformer.trans(&mut builder);
                }
            }
        }

        builder.generate(true, handle).map_err(Into::into)
    }

    /// Generate the trajectory file
    pub fn generate(self) -> ChoreoResult<TrajectoryFile> {
        let samples: Vec<Sample> = match &self.ctx.project.r#type {
            DriveType::Swerve => self
                .generate_swerve(self.ctx.handle)?
                .samples
                .into_iter()
                .map(Into::into)
                .collect(),
            DriveType::Differential => self
                .generate_differential(self.ctx.handle)?
                .samples
                .into_iter()
                .map(Into::into)
                .collect(),
        };

        let counts_vec = guess_control_interval_counts(
            &self.ctx.project.config.snapshot(),
            &self.trajectory_file.params.snapshot(),
        )?;

        Ok(postprocess(&samples, self.trajectory_file, counts_vec))
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

/// An object safe variant of the [`DifferentialGenerationTransformer`] trait,
///
/// Should not be implemented directly, instead implement [`DifferentialGenerationTransformer`]
pub(super) trait InitializedDifferentialGenerationTransformer {
    fn trans(&self, builder: &mut DifferentialPathBuilder);
}

/// A trait for objects that can transform a [`DifferentialPathBuilder`]
pub(super) trait DifferentialGenerationTransformer:
    InitializedDifferentialGenerationTransformer + Sized
{
    fn initialize(context: &GenerationContext) -> FeatureLockedTransformer<Self>;
    fn transform(&self, builder: &mut DifferentialPathBuilder);
}

impl<T: DifferentialGenerationTransformer> InitializedDifferentialGenerationTransformer for T {
    fn trans(&self, builder: &mut DifferentialPathBuilder) {
        self.transform(builder);
    }
}

fn postprocess(
    result: &[Sample],
    mut path: TrajectoryFile,
    counts_vec: Vec<usize>,
) -> TrajectoryFile {
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
                pt.1.split && !(pt.0 == 0 || pt.0 == snapshot.waypoints.len() - 1),
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
    path.trajectory.splits = splits;
    path.trajectory.samples = result.to_vec();
    path.trajectory.waypoints = waypoint_times;
    path.snapshot = Some(snapshot);
    path
}
