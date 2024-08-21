use std::collections::HashMap;

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Expr {
    pub expr: String,
    pub value: f64
}
#[derive(Debug, Serialize, Deserialize)]
pub enum Unit {
    Meter,
    MeterPerSecond,
    Radian,
    RadianPerSecond,
    KgM2
}
#[derive(Debug, Serialize, Deserialize)]
pub struct Variable {
    pub unit: Unit,
    pub var: Expr
}
#[derive(Debug, Serialize, Deserialize)]
pub struct PoseVariable {
    pub x: Expr,
    pub y: Expr,
    pub heading: Expr
}
#[derive(Debug, Serialize, Deserialize)]
pub struct Variables {
    pub expressions: HashMap<String, Variable>,
    pub poses: HashMap<String, PoseVariable>
}
#[derive(Debug, Serialize, Deserialize)]
pub struct Bumper {
    pub front: Expr,
    pub left: Expr,
    pub back: Expr,
    pub right: Expr
}
#[derive(Debug, Serialize, Deserialize)]
pub struct Module {
    pub x: Expr,
    pub y: Expr,
    pub gearing: Expr,
    pub radius: Expr,
    pub vmax: Expr, // motor rpm
    pub tmax: Expr // N*m
}
#[derive(Debug, Serialize, Deserialize)]
pub struct RobotConfig {
    pub modules: (Module, Module, Module, Module),
    pub mass: Expr,
    pub inertia: Expr,
    pub bumper: Bumper
}
#[derive(Debug, Serialize, Deserialize)]
pub struct Project {
    pub version: String,
    pub variables: Variables,
    pub config: RobotConfig
}