#![allow(dead_code)]

use std::collections::{HashMap, HashSet};

use trajoptlib::{
    DifferentialTrajectory, DifferentialTrajectoryGenerator, SwerveTrajectory,
    SwerveTrajectoryGenerator,
};

use crate::{
    ChoreoResult, ResultExt,
    generation::{
        generate::{LocalProgressUpdate, PROGRESS_SENDER_LOCK},
        heading::adjust_headings,
    },
    spec::{
        project::ProjectFile,
        trajectory::{DriveType, Parameters, Sample, Trajectory, TrajectoryFile},
    },
};

use super::intervals::guess_control_interval_counts;

// Add transformers
mod callback;
mod constraints;
mod drivetrain_and_bumpers;
mod interval_count;
use crate::spec::trajectory::ConstraintScope;
pub use callback::CallbackSetter;
pub use constraints::ConstraintSetter;
pub use drivetrain_and_bumpers::DrivetrainAndBumpersSetter;
pub use interval_count::IntervalCountSetter;

pub fn set_initial_guess(params: &mut Parameters<f64>) {
    fn not_initial_guess_wpt(params: &mut Parameters<f64>, idx: usize) {
        let wpt = &mut params.waypoints[idx];
        wpt.is_initial_guess = false;
    }
    let waypoint_count = params.waypoints.len();
    for waypoint in params.waypoints.iter_mut() {
        waypoint.is_initial_guess = true;
    }
    for constraint in params.snapshot().constraints {
        let from = constraint.from.get_idx(waypoint_count);
        let to = constraint
            .to
            .as_ref()
            .and_then(|id| id.get_idx(waypoint_count));

        if let Some(from_idx) = from {
            let valid_wpt = to.is_none();
            let valid_sgmt = to.is_some();
            // Check for valid scope
            if match constraint.data.scope() {
                ConstraintScope::Waypoint => valid_wpt,
                ConstraintScope::Segment => valid_sgmt,
                ConstraintScope::Both => valid_wpt || valid_sgmt,
            } {
                not_initial_guess_wpt(params, from_idx);
                if let Some(to_idx) = to
                    && to_idx != from_idx
                {
                    not_initial_guess_wpt(params, to_idx);
                }
            }
        }
    }
}

fn update_control_intervals(params: &mut Parameters<f64>, counts_vec: &Vec<usize>) {
    // set the intervals on the waypoints correctly (instead of copying counts_vec through everything)
    params
        .waypoints
        .iter_mut()
        .zip(counts_vec)
        .for_each(|(waypoint, counts)| {
            waypoint.intervals = *counts;
        });
}

fn send_interval_counts(counts: Vec<usize>, handle: i64) {
    let tx_opt = PROGRESS_SENDER_LOCK.get();
    if let Some(tx) = tx_opt {
        let _ = tx
            .send(LocalProgressUpdate::from(counts).handled(handle))
            .trace_warn();
    };
}
pub(super) struct GenerationContext {
    pub project: ProjectFile,
    pub params: Parameters<f64>,
    pub counts_vec: Vec<usize>,
    pub handle: i64,
}

pub(super) struct TrajectoryFileGenerator {
    ctx: GenerationContext,
    original_file: TrajectoryFile,
    swerve_transformers: HashMap<String, Vec<Box<dyn InitializedSwerveGenerationTransformer>>>,
    differential_transformers:
        HashMap<String, Vec<Box<dyn InitializedDifferentialGenerationTransformer>>>,
}

impl TrajectoryFileGenerator {
    /// Create a new generator
    pub fn new(
        project: ProjectFile,
        trajectory_file: TrajectoryFile,
        handle: i64,
    ) -> ChoreoResult<Self> {
        // Mark unconstrained empty waypoints as initial guess points.
        // Adjust non-equality-constrained waypoint headings to fit trajectory constraints; error if impossible.
        // Estimate control intervals
        let mut params = trajectory_file.params.snapshot();
        adjust_headings(&mut params)?;
        set_initial_guess(&mut params);
        let counts_vec = guess_control_interval_counts(&project.config.snapshot(), &params)?;
        update_control_intervals(&mut params, &counts_vec);
        send_interval_counts(counts_vec.clone(), handle);
        send_interval_counts(counts_vec.clone(), handle); // TODO: the double send is to get around a bug that consumes the first message from the IPC queue
        Ok(Self {
            ctx: GenerationContext {
                project,
                params,
                counts_vec,
                handle,
            },
            original_file: trajectory_file,
            swerve_transformers: HashMap::new(),
            differential_transformers: HashMap::new(),
        })
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
        let mut generator = SwerveTrajectoryGenerator::new();
        let mut feature_set = HashSet::new();
        feature_set.extend(self.ctx.project.generation_features.clone());
        feature_set.insert("".to_string());

        for feature in feature_set.iter() {
            if let Some(transformers) = self.swerve_transformers.get(feature) {
                for transformer in transformers.iter() {
                    transformer.trans(&mut generator);
                }
            }
        }

        generator.generate(true, handle).map_err(Into::into)
    }

    fn generate_differential(&self, handle: i64) -> ChoreoResult<DifferentialTrajectory> {
        let mut generator = DifferentialTrajectoryGenerator::new();
        let mut feature_set = HashSet::new();
        feature_set.extend(self.ctx.project.generation_features.clone());
        feature_set.insert("".to_string());

        for feature in feature_set.iter() {
            if let Some(transformers) = self.differential_transformers.get(feature) {
                for transformer in transformers.iter() {
                    transformer.trans(&mut generator);
                }
            }
        }

        generator.generate(true, handle).map_err(Into::into)
    }

    fn postprocess(&self, result: &[Sample]) -> TrajectoryFile {
        let mut original_params = self.original_file.params.clone();
        // Update the interval counts on each params waypoint.
        original_params
            .waypoints
            .iter_mut()
            .zip(&self.ctx.counts_vec)
            .for_each(|(waypoint, counts)| {
                if !waypoint.override_intervals {
                    waypoint.intervals = *counts;
                }
            });
        // Snapshot, capturing that interval count update
        let snapshot = original_params.snapshot();
        let mut original_events = self.original_file.events.clone();

        // Calculate the waypoint timing (a vec of the timestamps of each waypoint)
        // starting value of 0, plus 0 (intervals before the first waypoint) = 0 (index of the first waypoint)
        let mut interval = 0;
        // `intervals` contains (
        //    was the waypoint either a non-ending split point or the start point (i.e, was it the beginning of a split segment)
        //    the total number of intervals before this waypoint (not including the one the waypoint constrains),
        //    The timestamp of the sample indexed by the previous parameter
        // )
        let intervals = snapshot
            .waypoints
            .iter()
            .enumerate()
            .map(|pt| {
                let total_intervals = interval;
                interval += pt.1.intervals;
                (
                    pt.0 == 0 || (pt.1.split && pt.0 != snapshot.waypoints.len() - 1),
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
            .filter(|a| a.0) // filter by "start of split" flag
            .map(|a| a.1) // map to associate an index in the samples array
            .collect::<Vec<usize>>();

        // update event markers' target timestamps with the corresponding timestamp from waypoint_times
        // or None if the targeted index is None or out of bounds
        original_events.iter_mut().for_each(|marker| {
            marker.from.target_timestamp = marker.from.target.and_then(|idx| {
                waypoint_times
                    .get(idx)
                    .copied()
                    .or(marker.from.target_timestamp)
            });
        });
        TrajectoryFile {
            name: self.original_file.name.clone(),
            version: self.original_file.version,
            snapshot: Some(snapshot),
            params: original_params,
            trajectory: Trajectory {
                sample_type: Some(self.ctx.project.r#type),
                waypoints: waypoint_times,
                samples: result.to_vec(),
                splits,
                config: Some(self.ctx.project.config.snapshot()),
            },
            events: original_events,
        }
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

        Ok(self.postprocess(&samples))
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
    fn trans(&self, generator: &mut SwerveTrajectoryGenerator);
}

/// A trait for objects that can transform a [`SwerveTrajectoryGenerator`]
pub(super) trait SwerveGenerationTransformer:
    InitializedSwerveGenerationTransformer + Sized
{
    fn initialize(context: &GenerationContext) -> FeatureLockedTransformer<Self>;
    fn transform(&self, generator: &mut SwerveTrajectoryGenerator);
}

impl<T: SwerveGenerationTransformer> InitializedSwerveGenerationTransformer for T {
    fn trans(&self, generator: &mut SwerveTrajectoryGenerator) {
        self.transform(generator);
    }
}

/// An object safe variant of the [`DifferentialGenerationTransformer`] trait,
///
/// Should not be implemented directly, instead implement [`DifferentialGenerationTransformer`]
pub(super) trait InitializedDifferentialGenerationTransformer {
    fn trans(&self, generator: &mut DifferentialTrajectoryGenerator);
}

/// A trait for objects that can transform a [`DifferentialTrajectoryGenerator`]
pub(super) trait DifferentialGenerationTransformer:
    InitializedDifferentialGenerationTransformer + Sized
{
    fn initialize(context: &GenerationContext) -> FeatureLockedTransformer<Self>;
    fn transform(&self, generator: &mut DifferentialTrajectoryGenerator);
}

impl<T: DifferentialGenerationTransformer> InitializedDifferentialGenerationTransformer for T {
    fn trans(&self, generator: &mut DifferentialTrajectoryGenerator) {
        self.transform(generator);
    }
}
