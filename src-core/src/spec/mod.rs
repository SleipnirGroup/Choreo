use std::fmt::Debug;

use serde::{Deserialize, Serialize};
use trajectory::GenerationEquivalent;

pub mod project;
pub mod project_schema_version;
pub mod traj_schema_version;
pub mod trajectory;
pub mod upgraders;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct OpenFilePayload {
    pub dir: String,
    pub name: String,
}

pub const PROJECT_SCHEMA_VERSION: u32 = project_schema_version::PROJECT_SCHEMA_VERSION;
pub const TRAJ_SCHEMA_VERSION: u32 = traj_schema_version::TRAJ_SCHEMA_VERSION;

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

impl GenerationEquivalent for Expr {
    fn equiv(&self, other: &Self) -> bool {
        self.val.equiv(&other.val)
    }
}
impl GenerationEquivalent for f64 {
    fn equiv(&self, other: &Self) -> bool {
        self == other
    }
}
impl GenerationEquivalent for usize {
    fn equiv(&self, other: &Self) -> bool {
        self == other
    }
}
impl GenerationEquivalent for bool {
    fn equiv(&self, other: &Self) -> bool {
        self == other
    }
}
impl<T: GenerationEquivalent> GenerationEquivalent for Vec<T> {
    fn equiv(&self, other: &Self) -> bool {
        self.len() == other.len() && self.iter().zip(other).all(|(a, b)| T::equiv(a, b))
    }
}
impl<T: GenerationEquivalent> GenerationEquivalent for Option<T> {
    fn equiv(&self, other: &Self) -> bool {
        if self.is_none() && other.is_none() {
            true
        } else if let Some(this) = self {
            if let Some(that) = other {
                this.equiv(that)
            } else {
                false
            }
        } else {
            false
        }
    }
}
