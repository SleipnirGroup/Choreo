use std::{collections::BTreeMap, f64::consts::PI};

use serde::{Deserialize, Serialize};
use trajoptlib::Translation2d;

use super::{Expr, SnapshottableType, trajectory::DriveType, upgraders::upgrade_project_file};

#[derive(Debug, Serialize, Deserialize, Clone, Copy)]
pub enum Dimension {
    Number,
    Length,
    LinVel,
    LinAcc,
    Angle,
    AngVel,
    AngAcc,
    Time,
    Mass,
    Torque,
    MoI,
}
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Variable {
    pub dimension: Dimension,
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
    pub expressions: BTreeMap<String, Variable>,
    pub poses: BTreeMap<String, PoseVariable>,
}
#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq)]
pub struct Bumper<T: SnapshottableType> {
    pub front: T,
    pub side: T,
    pub back: T,
}

#[allow(non_snake_case)]
#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq)]
pub struct MotorConfig<T: SnapshottableType> {
    pub free_speed: T,
    pub stall_torque: T,
    pub kT: T,
    pub kV: T,
    pub supply_limit: T,
    pub stator_limit: T,
}

impl<T: SnapshottableType> MotorConfig<T> {
    pub fn snapshot(&self) -> MotorConfig<f64> {
        MotorConfig {
            free_speed: self.free_speed.snapshot(),
            stall_torque: self.stall_torque.snapshot(),
            kT: self.kT.snapshot(),
            kV: self.kV.snapshot(),
            supply_limit: self.supply_limit.snapshot(),
            stator_limit: self.stator_limit.snapshot(),
        }
    }
}

impl<T: SnapshottableType> Bumper<T> {
    pub fn snapshot(&self) -> Bumper<f64> {
        Bumper {
            front: self.front.snapshot(),
            side: self.side.snapshot(),
            back: self.back.snapshot(),
        }
    }
}
#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq)]
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
    #[must_use]
    pub fn translation(&self) -> Translation2d {
        Translation2d {
            x: self.x,
            y: self.y,
        }
    }

    pub fn radius(&self) -> f64 {
        self.x.hypot(self.y)
    }
}
#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct RobotConfig<T: SnapshottableType> {
    // front left
    pub front_left: Module<T>,
    pub back_left: Module<T>,
    pub mass: T,
    pub inertia: T,
    pub gearing: T,
    pub radius: T,
    /// motor rad/s
    pub vmax: T, // motor rad/s
    /// motor N*m
    pub tmax: T, // N*m
    pub cof: T,
    pub bumper: Bumper<T>,
    pub differential_track_width: T,
    pub motor_config: MotorConfig<T>,
}

impl<T: SnapshottableType> RobotConfig<T> {
    pub fn snapshot(&self) -> RobotConfig<f64> {
        RobotConfig {
            front_left: self.front_left.snapshot(),
            back_left: self.back_left.snapshot(),
            mass: self.mass.snapshot(),
            inertia: self.inertia.snapshot(),
            gearing: self.gearing.snapshot(),
            radius: self.radius.snapshot(),
            vmax: self.vmax.snapshot(),
            tmax: self.tmax.snapshot(),
            cof: self.cof.snapshot(),
            bumper: self.bumper.snapshot(),
            differential_track_width: self.differential_track_width.snapshot(),
            motor_config: self.motor_config.snapshot(),
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
impl RobotConfig<f64> {
    pub fn module_translations(&self) -> Vec<Translation2d> {
        // FL, BL, BR, FR
        vec![
            self.front_left.translation(),
            self.back_left.translation(),
            Translation2d {
                x: self.back_left.x,
                y: -self.back_left.y,
            },
            Translation2d {
                x: self.front_left.x,
                y: -self.front_left.y,
            },
        ]
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CodeGenConfig {
    root: Option<String>,
    pub gen_vars: bool,
    pub gen_traj_data: bool,
    pub use_choreo_lib: bool,
}

impl CodeGenConfig {
    pub fn get_root(&self) -> Option<String> {
        let root = self.root.as_ref().map(|r| {
            r.replace("\\", std::path::MAIN_SEPARATOR_STR)
                .replace("/", std::path::MAIN_SEPARATOR_STR)
        });
        tracing::debug!("Codegen root: {:?}", root);
        root
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ProjectFile {
    pub name: String,
    pub version: u32,
    #[serde(rename = "type", default)]
    pub r#type: DriveType,
    pub variables: Variables,
    pub config: RobotConfig<Expr>,
    #[serde(default)]
    pub generation_features: Vec<String>,
    pub codegen: CodeGenConfig,
}

impl ProjectFile {
    pub const EXTENSION: &'static str = "chor";

    /// Create a new `ProjectFile` from a json string.
    ///
    /// # Errors
    /// - [`crate::ChoreoError::Json`] if the json string is invalid.
    pub fn from_content(content: &str) -> crate::ChoreoResult<ProjectFile> {
        let val = upgrade_project_file(serde_json::from_str(content)?)?;
        serde_json::from_value(val).map_err(Into::into)
    }
}

impl Default for ProjectFile {
    fn default() -> Self {
        ProjectFile {
            name: "New Project".to_string(),
            version: super::PROJECT_SCHEMA_VERSION,
            r#type: DriveType::Swerve,
            variables: Variables {
                expressions: BTreeMap::new(),
                poses: BTreeMap::new(),
            },
            config: RobotConfig {
                gearing: Expr::new("6.5", 6.5),
                radius: Expr::new("2 in", 0.0508),
                vmax: Expr::new("6000.0 RPM", (6000.0 / 60.0) * std::f64::consts::TAU),
                tmax: Expr::new("1.2 N*m", 1.2),
                front_left: Module {
                    x: Expr::new("11 in", 0.2794),
                    y: Expr::new("11 in", 0.2794),
                },
                back_left: Module {
                    x: Expr::new("-11 in", -0.2794),
                    y: Expr::new("11 in", 0.2794),
                },
                mass: Expr::new("150 lbs", 68.038_855_5),
                inertia: Expr::new("6 kg m^2", 6.0),
                cof: Expr::new("1.5", 1.5),
                bumper: Bumper {
                    front: Expr::new("16 in", 0.4064),
                    side: Expr::new("16 in", 0.4064),
                    back: Expr::new("16 in", 0.4064),
                },
                differential_track_width: Expr::new("22 in", 0.2794 * 2.0),
                motor_config: MotorConfig {
                    free_speed: Expr::new("5800 RPM", (5800.0 / 60.0) * std::f64::consts::TAU),
                    stall_torque: Expr::new("9.36 N * m", 9.36),
                    kT: Expr::new("0.0197 N * m/A", 0.0197),
                    kV: Expr::new("0.00206896552 V/rpm", 0.00206896552 * 60.0 / (2.0 * PI)),
                    supply_limit: Expr::new("60 A", 60.0),
                    stator_limit: Expr::new("120 A", 120.0),
                },
            },
            generation_features: Vec::new(),
            codegen: CodeGenConfig {
                root: None,
                gen_vars: true,
                gen_traj_data: true,
                use_choreo_lib: true,
            },
        }
    }
}
