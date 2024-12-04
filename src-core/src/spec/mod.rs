use std::fmt::Debug;

use serde::{Deserialize, Serialize};

pub mod project;
pub mod trajectory;
pub mod upgraders;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct OpenFilePayload {
    pub dir: String,
    pub name: String,
}

pub const PROJECT_SCHEMA_VERSION: u32 = 1;
pub const TRAJ_SCHEMA_VERSION: u32 = 1;

/// A trait for types that can be snapshotted.
/// This allows for the type to be converted to a f64.
/// This trait is only implemented for [`f64`] and [`Expr`].
pub trait SnapshottableType: Debug + Clone {
    fn snapshot(&self) -> f64;

    fn fill_in_value(value: f64, unit: &'static str) -> Self;
}

impl SnapshottableType for f64 {
    #[inline]
    fn snapshot(&self) -> f64 {
        *self
    }

    #[inline]
    fn fill_in_value(value: f64, _unit: &'static str) -> Self {
        value
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Expr {
    pub exp: String,
    pub val: f64,
}
impl Expr {
    #[must_use]
    pub fn new(name: &str, value: f64) -> Self {
        Self {
            exp: name.to_string(),
            val: value,
        }
    }
}
impl SnapshottableType for Expr {
    #[inline]
    fn snapshot(&self) -> f64 {
        self.val
    }

    #[inline]
    fn fill_in_value(val: f64, unit: &'static str) -> Self {
        Expr {
            exp: format!("{} {}", val, unit),
            val,
        }
    }
}


