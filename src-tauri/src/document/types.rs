use std::{collections::HashMap, fmt::Debug};

use serde::{Deserialize, Serialize};
use trajoptlib::Translation2d;

/// A trait for types that can be snapshotted.
/// This allows for the type to be converted to a f64.
/// This trait is only implemented for [`f64`] and [`Expr`].
pub trait SnapshottableType: Debug + Clone {
    fn snapshot(&self) -> f64;
}

impl SnapshottableType for f64 {
    #[inline]
    fn snapshot(&self) -> f64 {
        *self
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Expr(pub String, pub f64);
pub fn expr(ex: &str, val: f64) -> Expr {
    Expr(ex.to_string(), val)
}
impl SnapshottableType for Expr {
    #[inline]
    fn snapshot(&self) -> f64 {
        self.1
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, Copy)]
pub enum Unit {
    Meter,
    MeterPerSecond,
    Radian,
    RadianPerSecond,
    KgM2,
}
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Variable {
    pub unit: Unit,
    pub var: Expr,
}
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PoseVariable {
    pub x: Expr,
    pub y: Expr,
    pub heading: Expr,
}
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Variables {
    pub expressions: HashMap<String, Variable>,
    pub poses: HashMap<String, PoseVariable>,
}
#[derive(Debug, Serialize, Deserialize, Clone, Copy)]
pub struct Bumper<T: SnapshottableType> {
    pub front: T,
    pub left: T,
    pub back: T,
    pub right: T,
}

impl<T: SnapshottableType> Bumper<T> {
    pub fn snapshot(&self) -> Bumper<f64> {
        Bumper {
            front: self.front.snapshot(),
            left: self.left.snapshot(),
            back: self.back.snapshot(),
            right: self.right.snapshot(),
        }
    }
}
#[derive(Debug, Serialize, Deserialize, Clone, Copy)]
pub struct Module<T: SnapshottableType> {
    pub x: T,
    pub y: T,
}

impl<T: SnapshottableType> Module<T> {
    pub fn snapshot(&self) -> Module<f64> {
        Module {
            x: self.x.snapshot(),
            y: self.y.snapshot(),
        }
    }
}
impl Module<f64> {
    pub fn translation(&self) -> Translation2d {
        Translation2d {
            x: self.x,
            y: self.y,
        }
    }
}
#[derive(Debug, Serialize, Deserialize, Clone, Copy)]
pub struct RobotConfig<T: SnapshottableType> {
    pub modules: [Module<T>; 4],
    pub mass: T,
    pub inertia: T,
    pub gearing: T,
    pub radius: T,
    /// motor rad/s
    pub vmax: T, // motor rad/s
    /// motor N*m
    pub tmax: T, // N*m
    pub bumper: Bumper<T>,
}

impl<T: SnapshottableType> RobotConfig<T> {
    pub fn snapshot(&self) -> RobotConfig<f64> {
        RobotConfig {
            modules: self.modules.clone().map(|modu: Module<T>| modu.snapshot()),
            mass: self.mass.snapshot(),
            inertia: self.inertia.snapshot(),
            gearing: self.gearing.snapshot(),
            radius: self.radius.snapshot(),
            vmax: self.vmax.snapshot(),
            tmax: self.tmax.snapshot(),
            bumper: self.bumper.snapshot(),
        }
    }
}
impl<T: SnapshottableType> RobotConfig<T> {
    pub fn wheel_max_torque(&self) -> f64 {
        self.tmax.snapshot() * self.gearing.snapshot()
    }
    pub fn wheel_max_velocity(&self) -> f64 {
        self.vmax.snapshot() / self.gearing.snapshot()
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Project {
    pub version: String,
    pub variables: Variables,
    pub config: RobotConfig<Expr>,
}

// traj file
#[derive(Serialize, Deserialize, Clone, Copy)]
#[serde(rename_all = "camelCase")]
pub struct Waypoint<T: SnapshottableType> {
    pub x: T,
    pub y: T,
    pub heading: T,
    pub intervals: usize,
    pub split: bool,
    pub fix_translation: bool,
    pub fix_heading: bool,
    pub override_intervals: bool,
}

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

#[derive(Serialize, Deserialize, Clone, Copy)]
pub enum WaypointID {
    #[serde(rename = "first")]
    First,
    #[serde(rename = "last")]
    Last,
    #[serde(untagged)]
    Idx(usize),
}
impl WaypointID {
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

#[derive(PartialEq, Eq)]
pub enum ConstraintType {
    Waypoint,
    Segment,
    Both,
}
#[derive(Serialize, Deserialize, Clone, Copy)]
#[serde(tag = "type", content = "props")]
pub enum ConstraintData<T: SnapshottableType> {
    MaxVelocity {
        max: T,
    },
    MaxAcceleration {
        max: T,
    },
    PointAt {
        x: T,
        y: T,
        tolerance: T,
        flip: bool,
    },
    StopPoint {},
}

impl<T: SnapshottableType> ConstraintData<T> {
    pub fn scope(&self) -> ConstraintType {
        match self {
            ConstraintData::StopPoint {} => ConstraintType::Waypoint,
            _ => ConstraintType::Both,
        }
    }

    pub fn snapshot(&self) -> ConstraintData<f64> {
        match self {
            ConstraintData::MaxVelocity { max } => ConstraintData::MaxVelocity {
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
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Copy)]
pub struct Constraint<T: SnapshottableType> {
    pub from: WaypointID,
    pub to: Option<WaypointID>,
    pub data: ConstraintData<T>,
}

impl<T: SnapshottableType> Constraint<T> {
    pub fn snapshot(&self) -> Constraint<f64> {
        Constraint::<f64> {
            from: self.from,
            to: self.to,
            data: self.data.snapshot(),
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Copy)]
pub struct ConstraintIDX<T: SnapshottableType> {
    pub from: usize,
    pub to: Option<usize>,
    pub data: ConstraintData<T>,
}

#[derive(Serialize, Deserialize, Clone, Copy)]
pub struct Sample {
    pub t: f64,
    pub x: f64,
    pub y: f64,
    pub heading: f64,
    pub vx: f64,
    pub vy: f64,
    pub omega: f64,
    pub fx: [f64; 4],
    pub fy: [f64; 4],
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ChoreoPath<T: SnapshottableType> {
    pub waypoints: Vec<Waypoint<T>>,
    pub constraints: Vec<Constraint<T>>,
}

impl<T: SnapshottableType> ChoreoPath<T> {
    pub fn snapshot(&self) -> ChoreoPath<f64> {
        ChoreoPath {
            waypoints: self.waypoints.iter().map(Waypoint::snapshot).collect(),
            constraints: self.constraints.iter().map(Constraint::snapshot).collect(),
        }
    }
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Output {
    pub waypoints: Vec<f64>,
    pub samples: Vec<Vec<Sample>>,

    pub use_module_forces: bool,
}

#[derive(Serialize, Deserialize, Clone)]
#[allow(clippy::struct_field_names)]
pub struct Traj {
    pub name: String,
    pub version: String,
    pub path: ChoreoPath<Expr>,
    // Captures the path that formed the current generated trajectory
    pub snapshot: Option<ChoreoPath<f64>>,
    // TODO: maybe rename to `output`, this is a breaking change for frontend though
    pub traj: Output,
}
