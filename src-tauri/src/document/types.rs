use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use trajoptlib::Translation2d;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Expr(pub String, pub f64);
pub fn expr(ex: &str, val: f64) -> Expr {
    Expr(ex.to_string(), val)
}
impl Expr {
    pub fn snapshot(&self) -> f64 {
        self.1
    }
}
impl AsRef<f64> for Expr {
    fn as_ref(&self) -> &f64 {
        &(self.1)
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
pub struct Bumper<T> {
    pub front: T,
    pub left: T,
    pub back: T,
    pub right: T,
}

impl Bumper<Expr> {
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
pub struct Module<T> {
    pub x: T,
    pub y: T,
}

impl Module<Expr> {
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
pub struct RobotConfig<T> {
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

impl RobotConfig<Expr> {
    pub fn snapshot(&self) -> RobotConfig<f64> {
        RobotConfig {
            modules: self
                .modules
                .clone()
                .map(|modu: Module<Expr>| modu.snapshot()),
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
impl RobotConfig<f64> {
    pub fn wheel_max_torque(&self) -> f64 {
        self.tmax * self.gearing
    }
    pub fn wheel_max_velocity(&self) -> f64 {
        self.vmax / self.gearing
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
#[allow(non_snake_case)]
pub struct Waypoint<T> {
    pub x: T,
    pub y: T,
    pub heading: T,
    pub intervals: usize,
    pub split: bool,
    pub fixTranslation: bool,
    pub fixHeading: bool,
    pub overrideIntervals: bool,
}

impl Waypoint<Expr> {
    pub fn snapshot(&self) -> Waypoint<f64> {
        Waypoint {
            x: self.x.snapshot(),
            y: self.y.snapshot(),
            heading: self.heading.snapshot(),
            intervals: self.intervals,
            split: self.split,
            fixTranslation: self.fixTranslation,
            fixHeading: self.fixHeading,
            overrideIntervals: self.overrideIntervals,
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
    pub fn get_idx(&self, count: &usize) -> Option<usize> {
        match self {
            WaypointID::Idx(idx) => {
                if *idx < *count {
                    Some(*idx)
                } else {
                    None
                }
            }
            WaypointID::First => {
                if *count > 0 {
                    Some(0)
                } else {
                    None
                }
            }
            WaypointID::Last => {
                if *count > 0 {
                    Some(*count - 1)
                } else {
                    None
                }
            }
        }
    }
}

#[derive(PartialEq)]
pub enum ConstraintType {
    Waypoint,
    Segment,
    Both,
}
#[derive(Serialize, Deserialize, Clone, Copy)]
#[serde(tag = "type", content = "props")]
pub enum ConstraintData<T> {
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

impl<T> ConstraintData<T> {
    pub fn scope(&self) -> ConstraintType {
        match self {
            ConstraintData::StopPoint {} => ConstraintType::Waypoint,
            _ => ConstraintType::Both,
        }
    }
}
impl ConstraintData<Expr> {
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
pub struct Constraint<T> {
    pub from: WaypointID,
    pub to: Option<WaypointID>,
    pub data: ConstraintData<T>,
}

#[derive(Serialize, Deserialize, Clone, Copy)]
pub struct ConstraintIDX<T> {
    pub from: usize,
    pub to: Option<usize>,
    pub data: ConstraintData<T>,
}

impl Constraint<Expr> {
    pub fn snapshot(&self) -> Constraint<f64> {
        Constraint::<f64> {
            from: self.from,
            to: self.to,
            data: self.data.snapshot(),
        }
    }
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
pub struct ChoreoPath<T> {
    pub waypoints: Vec<Waypoint<T>>,
    pub constraints: Vec<Constraint<T>>,
}

impl ChoreoPath<Expr> {
    pub fn snapshot(&self) -> ChoreoPath<f64> {
        ChoreoPath {
            waypoints: self.waypoints.iter().map(Waypoint::snapshot).collect(),
            constraints: self.constraints.iter().map(Constraint::snapshot).collect(),
        }
    }
}
#[derive(Serialize, Deserialize, Clone)]
#[allow(non_snake_case)]
pub struct Output {
    pub waypoints: Vec<f64>,
    pub samples: Vec<Vec<Sample>>,

    pub useModuleForces: bool,
}
#[derive(Serialize, Deserialize, Clone)]
pub struct Traj {
    pub name: String,
    pub version: String,
    pub path: ChoreoPath<Expr>,
    // Captures the path that formed the current generated trajectory
    pub snapshot: Option<ChoreoPath<f64>>,
    pub traj: Output,
}
