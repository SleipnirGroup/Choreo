//! Choreo (_Constraint-Honoring Omnidirectional Route Editor and Optimizer_,
//! pronounced like choreography) is a graphical tool for planning
//! time-optimized trajectories for autonomous mobile robots in the FIRST
//! Robotics Competition.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
#![deny(clippy::all, clippy::pedantic, clippy::nursery)]
#![deny(
    warnings,
    missing_copy_implementations,
    single_use_lifetimes,
    variant_size_differences,
    arithmetic_overflow,
    missing_debug_implementations,
    trivial_casts,
    trivial_numeric_casts,
    unused_import_braces,
    unused_results,
    unused_lifetimes,
    unused_unsafe,
    useless_ptr_null_checks,
    cenum_impl_drop_cast,
    while_true,
    unused_features,
    absolute_paths_not_starting_with_crate,
    unused_allocation,
    unreachable_code,
    unused_comparisons,
    unused_parens,
    asm_sub_register,
    break_with_label_and_loop,
    bindings_with_variant_name,
    anonymous_parameters,
    clippy::unwrap_used,
    clippy::panicking_unwrap,
    missing_abi,
    missing_fragment_specifier,
    clippy::missing_safety_doc,
    clippy::missing_asserts_for_indexing,
    clippy::missing_assert_message,
    clippy::possible_missing_comma,
    deprecated
)]
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
    clippy::missing_errors_doc,
)]
// #![cfg_attr(not(test), warn(missing_docs))]

mod error;

pub use error::ChoreoError;


/// An implementation of the `Choreo Document Specification`.
pub mod spec;
/// The api for managing choreo files.
pub mod file_management;
/// The api for generating trajectories.
pub mod generation;

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
