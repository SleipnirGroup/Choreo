use std::fmt::Debug;

use serde::{Deserialize, Serialize};

pub mod project;
pub mod trajectory;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct OpenFilePayload {
    pub dir: String,
    pub name: String,
}

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
}
