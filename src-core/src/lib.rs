//! Choreo (_Constraint-Honoring Omnidirectional Route Editor and Optimizer_,
//! pronounced like choreography) is a graphical tool for planning
//! time-optimized trajectories for autonomous mobile robots in the FIRST
//! Robotics Competition.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
#![deny(clippy::all)]
#![deny(warnings)]
#![allow(
    clippy::module_name_repetitions,
    clippy::option_if_let_else,
    clippy::missing_const_for_fn,
    clippy::struct_excessive_bools,
    clippy::use_self,
    clippy::suboptimal_flops,
    clippy::significant_drop_tightening,
    unused_results,
    clippy::missing_panics_doc,
    clippy::missing_errors_doc
)]

mod error;

pub use error::ChoreoError;

/// The API for managing choreo files.
pub mod file_management;
/// The API for generating trajectories.
pub mod generation;
/// An implementation of the `Choreo Document Specification`.
pub mod spec;

pub use tokio;

use std::error::Error;

/// Type alias for a `Result` with a `ChoreoError` error type.
pub type ChoreoResult<T> = std::result::Result<T, error::ChoreoError>;

/// Extension trait for `Result` to trace errors and warnings.
pub trait ResultExt<T, E: Error> {
    /// Trace an error if the result is an error.
    #[track_caller]
    fn trace_err(self);
    /// Trace a warning if the result is an error.
    #[track_caller]
    fn trace_warn(self);
    /// Trace an error if the result is an error, then execute a closure.
    #[allow(clippy::missing_errors_doc)]
    #[track_caller]
    fn trace_err_then<U, F: FnOnce() -> U>(self, f: F) -> Result<U, E>;
    /// Trace a warning if the result is an error, then execute a closure.
    #[allow(clippy::missing_errors_doc)]
    #[track_caller]
    fn trace_warn_then<U, F: FnOnce() -> U>(self, f: F) -> Result<U, E>;
}

impl<T, E: Error> ResultExt<T, E> for Result<T, E> {
    #[track_caller]
    fn trace_err(self) {
        if let Err(e) = self {
            tracing::error!("{}", e);
        }
    }

    #[track_caller]
    fn trace_warn(self) {
        if let Err(e) = self {
            tracing::warn!("{}", e);
        }
    }

    #[track_caller]
    fn trace_err_then<U, F: FnOnce() -> U>(self, f: F) -> Result<U, E> {
        if let Err(e) = &self {
            tracing::error!("{}", e);
        }
        self.map(|_| f())
    }

    #[track_caller]
    fn trace_warn_then<U, F: FnOnce() -> U>(self, f: F) -> Result<U, E> {
        if let Err(e) = &self {
            tracing::warn!("{}", e);
        }
        self.map(|_| f())
    }
}
