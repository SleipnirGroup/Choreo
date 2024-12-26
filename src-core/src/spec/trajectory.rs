use serde::{Deserialize, Serialize};
use trajoptlib::{DifferentialTrajectorySample, SwerveTrajectorySample};

use crate::round5;

use super::{version_handlers::upgrade_traj_file, Expr, SnapshottableType};

#[derive(Serialize, Deserialize, Clone, Copy, Debug)]
#[serde(rename_all = "camelCase")]
/// A waypoint parameter.
pub struct Waypoint<T: SnapshottableType> {
    /// The x coordinate of the waypoint (blue origin).
    ///
    /// Units: meters
    pub x: T,
    /// The y coordinate of the waypoint (blue origin).
    ///
    /// Units: meters
    pub y: T,
    /// The heading of the waypoint (blue origin).
    ///
    /// Units: radians
    pub heading: T,
    /// The number of control intervals to use between this waypoint and the next.
    pub intervals: usize,
    /// Whether to split the trajectory at this waypoint.
    pub split: bool,
    /// The waypoints translation is constraining the generated trajectory.
    pub fix_translation: bool,
    /// The waypoints heading is constraining the generated trajectory.
    pub fix_heading: bool,
    /// Whether to override the intervals. Not an Option because unused overrides still get persisted to file.
    pub override_intervals: bool,
}

#[allow(missing_docs)]
impl<T: SnapshottableType> Waypoint<T> {
    pub fn snapshot(&self) -> Waypoint<f64> {
        Waypoint {
            x: self.x.snapshot(),
            y: self.y.snapshot(),
            heading: self.heading.snapshot(),
            intervals: self.intervals,
            split: self.split,
            fix_translation: self.fix_translation,
            fix_heading: self.fix_heading,
            override_intervals: self.override_intervals,
        }
    }
}

impl Waypoint<f64> {
    pub fn round(&self) -> Waypoint<f64> {
        Waypoint {
            x: round5(self.x),
            y: round5(self.y),
            heading: round5(self.heading),
            intervals: self.intervals,
            split: self.split,
            fix_translation: self.fix_translation,
            fix_heading: self.fix_heading,
            override_intervals: self.override_intervals,
        }
    }
}

/// A waypoint identifier.
#[derive(Serialize, Deserialize, Clone, Copy, Debug)]
#[serde(rename_all = "camelCase")]
pub enum WaypointID {
    /// The first waypoint.
    First,
    /// The last waypoint.
    Last,
    /// An arbitrary waypoint index.
    #[serde(untagged)]
    Idx(usize),
}
impl WaypointID {
    /// TODO
    #[must_use]
    pub fn get_idx(&self, count: usize) -> Option<usize> {
        match self {
            WaypointID::Idx(idx) => {
                if *idx < count {
                    Some(*idx)
                } else {
                    None
                }
            }
            WaypointID::First => {
                if count > 0 {
                    Some(0)
                } else {
                    None
                }
            }
            WaypointID::Last => {
                if count > 0 {
                    Some(count - 1)
                } else {
                    None
                }
            }
        }
    }
}

/// A marker for the scope of a constraint.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ConstraintScope {
    /// The constraint applies only to the waypoint.
    Waypoint,
    /// The constraint applies to the segment between waypoints.
    Segment,
    /// The constraint applies to both the waypoint and the segment.
    Both,
}

/// A constraint on the robot's motion.
#[derive(Serialize, Deserialize, Clone, Copy, Debug)]
#[serde(tag = "type", content = "props")]
pub enum ConstraintData<T: SnapshottableType> {
    /// A constraint on the maximum velocity.
    MaxVelocity {
        /// The maximum velocity.
        max: T,
    },
    /// A constraint on the maximum acceleration.
    MaxAcceleration {
        /// The maximum acceleration.
        max: T,
    },
    /// A constraint on the maximum angular velocity.
    MaxAngularVelocity {
        /// The maximum angular velocity.
        max: T,
    },
    /// A constraint on the robot's orientation.
    PointAt {
        /// The x coordinate of the point to face (blue origin).
        ///
        /// Units: meters
        x: T,
        /// The y coordinate of the point to face (blue origin).
        ///
        /// Units: meters
        y: T,
        /// The tolerance for the orientation.
        ///
        /// Units: radians
        tolerance: T,
        /// Whether to flip the orientation.
        flip: bool,
    },
    /// A constraint to stop at a waypoint.
    StopPoint {},
    /// A constraint to contain the bumpers within a circlular region of the field
    KeepInCircle { x: T, y: T, r: T },
    /// A constraint to contain the bumpers within a rectangular region of the field
    KeepInRectangle { x: T, y: T, w: T, h: T },
    /// A constraint to contain the bumpers within two line
    KeepInLane { tolerance: T },
    /// A constraint to contain the bumpers outside a circlular region of the field
    KeepOutCircle { x: T, y: T, r: T },
}

impl<T: SnapshottableType> ConstraintData<T> {
    /// The scope of the constraint.
    pub fn scope(&self) -> ConstraintScope {
        match self {
            ConstraintData::StopPoint {} => ConstraintScope::Waypoint,
            ConstraintData::KeepInLane { tolerance: _ } => ConstraintScope::Segment,
            _ => ConstraintScope::Both,
        }
    }

    #[allow(missing_docs)]
    pub fn snapshot(&self) -> ConstraintData<f64> {
        match self {
            ConstraintData::MaxVelocity { max } => ConstraintData::MaxVelocity {
                max: max.snapshot(),
            },
            ConstraintData::MaxAngularVelocity { max } => ConstraintData::MaxAngularVelocity {
                max: max.snapshot(),
            },
            ConstraintData::PointAt {
                x,
                y,
                tolerance,
                flip,
            } => ConstraintData::PointAt {
                x: x.snapshot(),
                y: y.snapshot(),
                tolerance: tolerance.snapshot(),
                flip: *flip,
            },
            ConstraintData::MaxAcceleration { max } => ConstraintData::MaxAcceleration {
                max: max.snapshot(),
            },
            ConstraintData::StopPoint {} => ConstraintData::StopPoint {},
            ConstraintData::KeepInCircle { x, y, r } => ConstraintData::KeepInCircle {
                x: x.snapshot(),
                y: y.snapshot(),
                r: r.snapshot(),
            },
            ConstraintData::KeepInRectangle { x, y, w, h } => ConstraintData::KeepInRectangle {
                x: x.snapshot(),
                y: y.snapshot(),
                w: w.snapshot(),
                h: h.snapshot(),
            },
            ConstraintData::KeepInLane { tolerance } => ConstraintData::KeepInLane {
                tolerance: tolerance.snapshot(),
            },
            ConstraintData::KeepOutCircle { x, y, r } => ConstraintData::KeepOutCircle {
                x: x.snapshot(),
                y: y.snapshot(),
                r: r.snapshot(),
            },
        }
    }
}

impl ConstraintData<f64> {
    pub fn round(&self) -> ConstraintData<f64> {
        match self {
            ConstraintData::MaxVelocity { max } => ConstraintData::MaxVelocity {
                max: round5(*max),
            },
            ConstraintData::MaxAngularVelocity { max } => ConstraintData::MaxAngularVelocity {
                max: round5(*max),
            },
            ConstraintData::PointAt {
                x,
                y,
                tolerance,
                flip,
            } => ConstraintData::PointAt {
                x: round5(*x),
                y: round5(*y),
                tolerance: round5(*tolerance),
                flip: *flip,
            },
            ConstraintData::MaxAcceleration { max } => ConstraintData::MaxAcceleration {
                max: round5(*max),
            },
            ConstraintData::StopPoint {} => ConstraintData::StopPoint {},
            ConstraintData::KeepInCircle { x, y, r } => ConstraintData::KeepInCircle {
                x: round5(*x),
                y: round5(*y),
                r: round5(*r),
            },
            ConstraintData::KeepInRectangle { x, y, w, h } => ConstraintData::KeepInRectangle {
                x: round5(*x),
                y: round5(*y),
                w: round5(*w),
                h: round5(*h),
            },
            ConstraintData::KeepInLane { tolerance } => ConstraintData::KeepInLane {
                tolerance: round5(*tolerance),
            },
            ConstraintData::KeepOutCircle { x, y, r } => ConstraintData::KeepOutCircle {
                x: round5(*x),
                y: round5(*y),
                r: round5(*r),
            },
        }
    }
}

/// A constraint on the robot's motion and where it applies.
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct Constraint<T: SnapshottableType> {
    /// The waypoint the constraint starts at.
    pub from: WaypointID,
    /// The waypoint the constraint ends at.
    ///
    /// If `None`, the constraint applies for all waypoints after `from`.
    pub to: Option<WaypointID>,
    /// The constraint to apply.
    pub data: ConstraintData<T>,
    /// Whether the constraint is enabled.
    pub enabled: bool,
}

impl<T: SnapshottableType> Constraint<T> {
    #[allow(missing_docs)]
    pub fn snapshot(&self) -> Constraint<f64> {
        Constraint::<f64> {
            from: self.from,
            to: self.to,
            data: self.data.snapshot(),
            enabled: self.enabled,
        }
    }
}

impl Constraint<f64> {
    pub fn round(&self) -> Constraint<f64> {
        Constraint::<f64> {
            from: self.from,
            to: self.to,
            data: self.data.round(),
            enabled: self.enabled,
        }
    }
}

/// A constraint on the robot's motion and where it applies.
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct ConstraintIDX<T: SnapshottableType> {
    /// The index of the waypoint the constraint starts at.
    pub from: usize,
    /// The index of the waypoint the constraint ends at.
    ///
    /// If `None`, the constraint applies for all waypoints after `from`.
    pub to: Option<usize>,
    /// The constraint to apply.
    pub data: ConstraintData<T>,
    /// Whether the constraint is enabled.
    pub enabled: bool,
}

/// A sample of the robot's state at a point in time during the trajectory.
#[allow(missing_docs)]
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(untagged)]
pub enum Sample {
    /// A sample for a swerve drive.
    Swerve {
        t: f64,
        x: f64,
        y: f64,
        heading: f64,
        vx: f64,
        vy: f64,
        omega: f64,
        ax: f64,
        ay: f64,
        alpha: f64,
        fx: [f64; 4],
        fy: [f64; 4],
    },
    /// A sample for a differential drive.
    DifferentialDrive {
        t: f64,
        x: f64,
        y: f64,
        heading: f64,
        vl: f64,
        vr: f64,
        omega: f64,
        al: f64,
        ar: f64,
        fl: f64,
        fr: f64,
    },
}

impl From<&SwerveTrajectorySample> for Sample {
    fn from(swerve_sample: &SwerveTrajectorySample) -> Self {
        Sample::Swerve {
            t: round5(swerve_sample.timestamp),
            x: round5(swerve_sample.x),
            y: round5(swerve_sample.y),
            vx: round5(swerve_sample.velocity_x),
            vy: round5(swerve_sample.velocity_y),
            heading: round5(swerve_sample.heading),
            omega: round5(swerve_sample.angular_velocity),
            ax: round5(swerve_sample.acceleration_x),
            ay: round5(swerve_sample.acceleration_y),
            alpha: round5(swerve_sample.angular_acceleration),
            fx: [
                round5(swerve_sample.module_forces_x[0]),
                round5(swerve_sample.module_forces_x[1]),
                round5(swerve_sample.module_forces_x[2]),
                round5(swerve_sample.module_forces_x[3]),
            ],
            fy: [
                round5(swerve_sample.module_forces_y[0]),
                round5(swerve_sample.module_forces_y[1]),
                round5(swerve_sample.module_forces_y[2]),
                round5(swerve_sample.module_forces_y[3]),
            ],
        }
    }
}
impl From<SwerveTrajectorySample> for Sample {
    fn from(value: SwerveTrajectorySample) -> Self {
        Self::from(&value)
    }
}

impl From<&DifferentialTrajectorySample> for Sample {
    fn from(differential_sample: &DifferentialTrajectorySample) -> Self {
        Sample::DifferentialDrive {
            t: round5(differential_sample.timestamp),
            x: round5(differential_sample.x),
            y: round5(differential_sample.y),
            heading: round5(differential_sample.heading),
            vl: round5(differential_sample.velocity_l),
            vr: round5(differential_sample.velocity_r),
            omega: round5(differential_sample.angular_velocity),
            al: round5(differential_sample.acceleration_l),
            ar: round5(differential_sample.acceleration_r),
            fl: round5(differential_sample.force_l),
            fr: round5(differential_sample.force_r),
        }
    }
}
impl From<DifferentialTrajectorySample> for Sample {
    fn from(value: DifferentialTrajectorySample) -> Self {
        Self::from(&value)
    }
}

impl Sample {
    pub fn round(&self) -> Sample {
        match self {
            Sample::Swerve {
                t,
                x,
                y,
                heading,
                vx,
                vy,
                omega,
                ax,
                ay,
                alpha,
                fx,
                fy,
            } => Sample::Swerve {
                t: round5(*t),
                x: round5(*x),
                y: round5(*y),
                heading: round5(*heading),
                vx: round5(*vx),
                vy: round5(*vy),
                omega: round5(*omega),
                ax: round5(*ax),
                ay: round5(*ay),
                alpha: round5(*alpha),
                fx: [
                    round5(fx[0]),
                    round5(fx[1]),
                    round5(fx[2]),
                    round5(fx[3]),
                ],
                fy: [
                    round5(fy[0]),
                    round5(fy[1]),
                    round5(fy[2]),
                    round5(fy[3]),
                ],
            },
            Sample::DifferentialDrive {
                t,
                x,
                y,
                heading,
                vl,
                vr,
                omega,
                al,
                ar,
                fl,
                fr,
            } => Sample::DifferentialDrive {
                t: round5(*t),
                x: round5(*x),
                y: round5(*y),
                heading: round5(*heading),
                vl: round5(*vl),
                vr: round5(*vr),
                omega: round5(*omega),
                al: round5(*al),
                ar: round5(*ar),
                fl: round5(*fl),
                fr: round5(*fr),
            },
        }
    }
}

/// The type of samples in a trajectory.
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum DriveType {
    /// The variant for [`Sample::Swerve`].
    Swerve,
    /// The variant for [`Sample::DifferentialDrive`].
    Differential,
}

/// The parameters used for generating a trajectory.
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Parameters<T: SnapshottableType> {
    /// The waypoints the robot will pass through or use for initial guess.
    pub waypoints: Vec<Waypoint<T>>,
    /// The constraints on the robot's motion.
    pub constraints: Vec<Constraint<T>>,
    /// The target dt in seconds for the control interval algorithm.
    pub target_dt: T,
}

impl<T: SnapshottableType> Parameters<T> {
    #[allow(missing_docs)]
    pub fn snapshot(&self) -> Parameters<f64> {
        Parameters {
            waypoints: self.waypoints.iter().map(Waypoint::snapshot).collect(),
            constraints: self.constraints.iter().map(Constraint::snapshot).collect(),
            target_dt: self.target_dt.snapshot(),
        }.round()
    }
}

impl<T: SnapshottableType> Parameters<T> {
    pub fn get_enabled_constraints(&self) -> Vec<&Constraint<T>> {
        self.constraints.iter().filter(|c| c.enabled).collect()
    }
}

impl Parameters<f64> {
    pub fn round(&self) -> Parameters<f64> {
        Parameters {
            waypoints: self.waypoints.iter().map(Waypoint::round).collect(),
            constraints: self.constraints.iter().map(Constraint::round).collect(),
            target_dt: round5(self.target_dt),
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
/// The trajectory the robot will follow.
pub struct Trajectory {
    /// The sample type of this trajectory.
    /// Must match the type in samples if that list is non-empty
    /// Only None if trajectory was never generated.
    pub sample_type: Option<DriveType>,
    /// The times at which the robot will reach each waypoint.
    pub waypoints: Vec<f64>,
    /// The samples of the trajectory.
    pub samples: Vec<Sample>,
    /// The indices of samples which are associated with split waypoints.
    /// This includes 0, but the index of the last sample is never in this list even if the split toggle is set
    /// for the last waypoint
    pub splits: Vec<usize>,
}

impl Trajectory {
    pub fn round(&self) -> Trajectory {
        Trajectory {
            sample_type: self.sample_type,
            waypoints: self.waypoints.iter().map(|&x| round5(x)).collect(),
            samples: self.samples.iter().map(Sample::round).collect(),
            splits: self.splits.clone(),
        }
    }
}

/// A structure representing a `.traj` file.
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct TrajectoryFile {
    /// The name of the `.traj` file.
    /// Will always be in sync with the file name on disk.
    pub name: String,
    /// The version of the `.traj` file spec.
    pub version: u32,
    /// The snapshot of the parameters at the time of the last generation.
    pub snapshot: Option<Parameters<f64>>,
    /// The parameters used for generating the trajectory.
    pub params: Parameters<Expr>,
    /// The trajectory the robot will follow.
    pub trajectory: Trajectory,
    /// The choreo events.
    pub events: Vec<EventMarker>,
}

impl TrajectoryFile {
    /// The file extension to use when writing this file to disk.
    pub const EXTENSION: &'static str = "traj";

    /// Create a new `TrajectoryFile` from a json string.
    ///
    /// # Errors
    /// - [`crate::ChoreoError::Json`] if the json string is invalid.
    pub fn from_content(content: &str) -> crate::ChoreoResult<TrajectoryFile> {
        let val = upgrade_traj_file(serde_json::from_str(content)?)?;
        let tf: TrajectoryFile = serde_json::from_value(val)?;
        Ok(tf.round())
    }

    pub fn round(&self) -> TrajectoryFile {
        TrajectoryFile {
            name: self.name.clone(),
            version: self.version,
            snapshot: self.snapshot.as_ref().map(|s| s.round()),
            params: self.params.clone(),
            trajectory: self.trajectory.round(),
            events: self.events.clone(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EventMarkerData {
    pub target: Option<usize>,
    pub target_timestamp: Option<f64>,
    pub offset: Expr,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EventMarker {
    pub name: String,
    pub from: EventMarkerData,
    pub event: Option<PplibCommand>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", tag = "type", content = "data")]
pub enum PplibCommand {
    Named {
        name: String,
    },
    #[serde(rename_all = "camelCase")]
    Wait {
        wait_time: Expr,
    },
    Sequential {
        commands: Vec<PplibCommand>,
    },
    Parallel {
        commands: Vec<PplibCommand>,
    },
    Race {
        commands: Vec<PplibCommand>,
    },
    Deadline {
        commands: Vec<PplibCommand>,
    },
}
