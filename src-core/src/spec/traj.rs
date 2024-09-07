use serde::{Deserialize, Serialize};
use trajoptlib::{DifferentialTrajectorySample, SwerveTrajectorySample};

use super::{Expr, SnapshottableType};

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
    /// TODO
    pub fix_translation: bool,
    /// TODO
    pub fix_heading: bool,
    /// Whether to override the intervals. Not an Option because unused overrides still get persisted to file.
    pub override_intervals: bool,
    /// Whether this waypoint is an initial guess,
    /// completely invisible to the frontend.
    #[serde(skip, default)]
    pub is_initial_guess: bool,
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
            is_initial_guess: self.is_initial_guess,
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
}

impl<T: SnapshottableType> ConstraintData<T> {
    /// The scope of the constraint.
    pub fn scope(&self) -> ConstraintScope {
        match self {
            ConstraintData::StopPoint {} => ConstraintScope::Waypoint,
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
}

impl<T: SnapshottableType> Constraint<T> {
    #[allow(missing_docs)]
    pub fn snapshot(&self) -> Constraint<f64> {
        Constraint::<f64> {
            from: self.from,
            to: self.to,
            data: self.data.snapshot(),
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
        al: f64,
        ar: f64,
        fl: f64,
        fr: f64,
    },
}
fn nudge_zero(f: f64) -> f64 {
    if f.abs() < 1e-12 {
        0.0
    } else {
        f
    }
}

impl From<&SwerveTrajectorySample> for Sample {
    fn from(swerve_sample: &SwerveTrajectorySample) -> Self {
        Sample::Swerve {
            t: nudge_zero(swerve_sample.timestamp),
            x: nudge_zero(swerve_sample.x),
            y: nudge_zero(swerve_sample.y),
            vx: nudge_zero(swerve_sample.velocity_x),
            vy: nudge_zero(swerve_sample.velocity_y),
            heading: nudge_zero(swerve_sample.heading),
            omega: nudge_zero(swerve_sample.angular_velocity),
            ax: nudge_zero(swerve_sample.acceleration_x),
            ay: nudge_zero(swerve_sample.acceleration_y),
            alpha: nudge_zero(swerve_sample.angular_acceleration),
            fx: [
                nudge_zero(swerve_sample.module_forces_x[0]),
                nudge_zero(swerve_sample.module_forces_x[1]),
                nudge_zero(swerve_sample.module_forces_x[2]),
                nudge_zero(swerve_sample.module_forces_x[3]),
            ],
            fy: [
                nudge_zero(swerve_sample.module_forces_y[0]),
                nudge_zero(swerve_sample.module_forces_y[1]),
                nudge_zero(swerve_sample.module_forces_y[2]),
                nudge_zero(swerve_sample.module_forces_y[3]),
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
    fn from(diff_sample: &DifferentialTrajectorySample) -> Self {
        Sample::DifferentialDrive {
            t: nudge_zero(diff_sample.timestamp),
            x: nudge_zero(diff_sample.x),
            y: nudge_zero(diff_sample.y),
            heading: nudge_zero(diff_sample.heading),
            vl: nudge_zero(diff_sample.velocity_l),
            vr: nudge_zero(diff_sample.velocity_r),
            al: nudge_zero(diff_sample.acceleration_l),
            ar: nudge_zero(diff_sample.acceleration_r),
            fl: nudge_zero(diff_sample.force_l),
            fr: nudge_zero(diff_sample.force_r),
        }
    }
}
impl From<DifferentialTrajectorySample> for Sample {
    fn from(value: DifferentialTrajectorySample) -> Self {
        Self::from(&value)
    }
}

/// The type of samples in a trajectory.
#[derive(Debug, Clone, Copy, Default, Serialize, Deserialize)]
pub enum DriveType {
    /// The variant for [`Sample::Swerve`].
    #[default]
    Swerve,
    /// The variant for [`Sample::DifferentialDrive`].
    Differential,
}

/// The parameters used for generating a trajectory.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Parameters<T: SnapshottableType> {
    /// The waypoints the robot will pass through or use for initial guess.
    pub waypoints: Vec<Waypoint<T>>,
    /// The constraints on the robot's motion.
    pub constraints: Vec<Constraint<T>>,
}

impl<T: SnapshottableType> Parameters<T> {
    #[allow(missing_docs)]
    pub fn snapshot(&self) -> Parameters<f64> {
        Parameters {
            waypoints: self.waypoints.iter().map(Waypoint::snapshot).collect(),
            constraints: self.constraints.iter().map(Constraint::snapshot).collect(),
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
/// The trajectory the robot will follow.
pub struct Trajectory {
    /// The times at which the robot will reach each waypoint.
    pub waypoints: Vec<f64>,
    /// The samples of the trajectory.
    pub samples: Vec<Vec<Sample>>,
    /// Whether the forces are available to use in the samples.
    #[serde(default)]
    pub forces_available: bool,
}

/// A structure representing a `.traj` file.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TrajFile {
    /// The name of the `.traj` file.
    /// Will always be in sync with the file name on disk.
    pub name: String,
    /// The version of the `.traj` file spec.
    pub version: String,
    /// The snapshot of the parameters at the time of the last generation.
    pub snapshot: Option<Parameters<f64>>,
    /// The parameters used for generating the trajectory.
    pub params: Parameters<Expr>,
    /// The trajectory the robot will follow.
    pub traj: Trajectory,
}

impl TrajFile {
    /// The file extension to use when writing this file to disk.
    pub const EXTENSION: &'static str = "traj";

    /// Create a new `TrajFile` from a json string.
    ///
    /// # Errors
    /// - [`crate::ChoreoError::Json`] if the json string is invalid.
    pub fn from_content(content: &str) -> crate::ChoreoResult<TrajFile> {
        serde_json::from_str(content).map_err(Into::into)
    }
}
