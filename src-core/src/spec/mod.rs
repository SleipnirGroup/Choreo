use std::fmt::Debug;

use serde::{Deserialize, Serialize};

pub mod project;
pub mod traj;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct OpenFilePayload {
    pub dir: String,
    pub name: String,
}

/// A trait for types that can be snapshotted.
/// This allows for the type to be converted to a f64.
/// This trait is only implemented for [`f64`] and [`Expr`].
pub trait ExprOrNumber: Debug + Clone {
    fn as_number(&self) -> f64;
}

impl ExprOrNumber for f64 {
    #[inline]
    fn as_number(&self) -> f64 {
        *self
    }
}

/// A struct that represents an expression.
///
/// The string is a mathematical expression that can be evaluated to a number.
/// The number is the result of evaluating the expression.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Expr(pub String, pub f64);
impl Expr {
    #[must_use]
    pub fn new(name: &str, value: f64) -> Self {
        Self(name.to_string(), value)
    }
}
impl ExprOrNumber for Expr {
    #[inline]
    fn as_number(&self) -> f64 {
        self.1
    }
}
