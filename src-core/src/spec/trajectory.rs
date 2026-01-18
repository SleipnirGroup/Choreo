use serde::{Deserialize, Serialize};
use trajoptlib::{DifferentialTrajectorySample, SwerveTrajectorySample};

use crate::spec::project::RobotConfig;

use super::{Expr, SnapshottableType, upgraders::upgrade_traj_file};

#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq)]
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
#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
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
#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq)]
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

/// A constraint on the robot's motion and where it applies.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
pub struct Constraint<T: SnapshottableType> {
    /// The waypoint the constraint starts at.
    pub from: WaypointID,
    /// The waypoint the constraint ends at.
    ///
    /// If `None`, the constraint applies for all waypoints after `from`.
    pub to: Option<WaypointID>,
    /// The constraint to apply.
    pub data: ConstraintData<T>,
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

/// A constraint on the robot's motion and where it applies.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
pub struct ConstraintIDX<T: SnapshottableType> {
    /// The index of the waypoint the constraint starts at.
    pub from: usize,
    /// The index of the waypoint the constraint ends at.
    ///
    /// If `None`, the constraint applies for all waypoints after `from`.
    pub to: Option<usize>,
    /// The constraint to apply.
    pub data: ConstraintData<T>,
    pub enabled: bool,
}

/// A sample of the robot's state at a point in time during the trajectory.
#[allow(missing_docs)]
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
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
        alpha: f64,
        fl: f64,
        fr: f64,
    },
}
impl Sample {
    pub fn t(&self) -> f64 {
        match self {
            Sample::Swerve { t, .. } => *t,
            Sample::DifferentialDrive { t, .. } => *t,
        }
    }

    pub fn x(&self) -> f64 {
        match self {
            Sample::Swerve { x, .. } => *x,
            Sample::DifferentialDrive { x, .. } => *x,
        }
    }

    pub fn y(&self) -> f64 {
        match self {
            Sample::Swerve { y, .. } => *y,
            Sample::DifferentialDrive { y, .. } => *y,
        }
    }

    pub fn heading(&self) -> f64 {
        match self {
            Sample::Swerve { heading, .. } => *heading,
            Sample::DifferentialDrive { heading, .. } => *heading,
        }
    }
}
fn round(input: f64) -> f64 {
    let factor = 100_000.0;
    let result = (input * factor).round() / factor;
    if result == -0.0 { 0.0 } else { result }
}

impl From<&SwerveTrajectorySample> for Sample {
    fn from(swerve_sample: &SwerveTrajectorySample) -> Self {
        Sample::Swerve {
            t: round(swerve_sample.timestamp),
            x: round(swerve_sample.x),
            y: round(swerve_sample.y),
            vx: round(swerve_sample.velocity_x),
            vy: round(swerve_sample.velocity_y),
            heading: round(swerve_sample.heading),
            omega: round(swerve_sample.angular_velocity),
            ax: round(swerve_sample.acceleration_x),
            ay: round(swerve_sample.acceleration_y),
            alpha: round(swerve_sample.angular_acceleration),
            fx: [
                round(swerve_sample.module_forces_x[0]),
                round(swerve_sample.module_forces_x[1]),
                round(swerve_sample.module_forces_x[2]),
                round(swerve_sample.module_forces_x[3]),
            ],
            fy: [
                round(swerve_sample.module_forces_y[0]),
                round(swerve_sample.module_forces_y[1]),
                round(swerve_sample.module_forces_y[2]),
                round(swerve_sample.module_forces_y[3]),
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
            t: round(differential_sample.timestamp),
            x: round(differential_sample.x),
            y: round(differential_sample.y),
            heading: round(differential_sample.heading),
            vl: round(differential_sample.velocity_l),
            vr: round(differential_sample.velocity_r),
            omega: round(differential_sample.angular_velocity),
            al: round(differential_sample.acceleration_l),
            ar: round(differential_sample.acceleration_r),
            alpha: round(differential_sample.angular_acceleration),
            fl: round(differential_sample.force_l),
            fr: round(differential_sample.force_r),
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
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
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
        }
    }
}

impl<T: SnapshottableType> Parameters<T> {
    pub fn get_enabled_constraints(&self) -> Vec<&Constraint<T>> {
        self.constraints.iter().filter(|c| c.enabled).collect()
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
/// The trajectory the robot will follow.
pub struct Trajectory {
    pub config: Option<RobotConfig<f64>>,
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
    #[serde(default)]
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
        serde_json::from_value(val).map_err(Into::into)
    }

    pub fn up_to_date(&self) -> bool {
        // Can't use is_some_and due to its move semantics.
        if let Some(snap) = &self.snapshot {
            snap == &self.params.snapshot()
        } else {
            false
        }
    }

    pub fn config_up_to_date(&self, config: &RobotConfig<f64>) -> bool {
        // Can't use is_some_and due to its move semantics.
        if let Some(snap) = &self.trajectory.config {
            snap == config
        } else {
            false
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

#[cfg(test)]
mod tests {
    use crate::spec::{TRAJ_SCHEMA_VERSION, project::ProjectFile};

    use super::*;
    fn test_trajectory() -> TrajectoryFile {
        let parameters = Parameters::<Expr> {
            waypoints: vec![Waypoint::<Expr> {
                x: Expr::fill_in_value(0.0, "m"),
                y: Expr::fill_in_value(0.0, "m"),
                heading: Expr::fill_in_value(0.0, "rad"),
                intervals: 20,
                split: false,
                fix_translation: false,
                fix_heading: false,
                override_intervals: false,
                is_initial_guess: false,
            }],
            constraints: vec![],
            target_dt: Expr::fill_in_value(0.05, "s"),
        };
        TrajectoryFile {
            name: "Test".to_string(),
            version: TRAJ_SCHEMA_VERSION,
            snapshot: Some(parameters.snapshot()),
            params: parameters,
            trajectory: Trajectory {
                sample_type: Some(DriveType::Swerve),
                waypoints: Vec::new(),
                samples: Vec::new(),
                splits: Vec::new(),
                config: Some(ProjectFile::default().config.snapshot()),
            },
            events: Vec::new(),
        }
    }
    #[test]
    fn snapshot_equality() {
        assert!(test_trajectory().up_to_date());
    }

    #[test]
    fn snapshot_equality_through_serde() -> serde_json::Result<()> {
        use crate::file_management::formatter;
        let trajectory = test_trajectory();
        let serde_trajectory = formatter::to_string_pretty(&trajectory)?;
        let deser_trajectory = TrajectoryFile::from_content(serde_trajectory.as_str());
        assert!(deser_trajectory.is_ok_and(|t| t.up_to_date()));
        Ok(())
    }
}
