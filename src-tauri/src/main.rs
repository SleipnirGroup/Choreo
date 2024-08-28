//! Choreo (_Constraint-Honoring Omnidirectional Route Editor and Optimizer_,
//! pronounced like choreography) is a graphical tool for planning
//! time-optimized trajectories for autonomous mobile robots in the FIRST
//! Robotics Competition.

// Prevents additional console window on Windows in release, DO NOT REMOVE!!
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
    unused_results
)]
// #![cfg_attr(
//     not(test),
//     forbid(
//         clippy::panic,
//         clippy::todo,
//         clippy::unimplemented,
//         clippy::expect_used
//     )
// )]
#![cfg_attr(not(test), warn(missing_docs))]

mod document;
mod error;
mod util;
mod cli;

use std::error::Error;
use std::{thread, vec};

// use document::file::{
//     delete_dir, delete_file, find_all_traj, new_file, open_chor, open_file_dialog, open_traj,
//     set_chor_path, setup_senders, write_chor, write_traj,
// };
// use document::generate::{cancel, generate, setup_progress_sender};
// use document::intervals::cmd_guess_control_interval_counts;

use clap::Parser;
use cli::Cli;
use document::file::WritingResources;
use document::generate::setup_progress_sender;
#[allow(clippy::wildcard_imports)]
use document::plugin::*;
use tauri::Manager;

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

fn arg_count() -> usize {
    std::env::args().count()
}

fn run_tauri() {
    tracing_subscriber::fmt::fmt()
        .with_max_level(tracing::Level::DEBUG)
        .pretty()
        .init();

    tracing::info!("Starting Choreo Gui");

    let rx = setup_progress_sender();
    tauri::Builder::default()
        .setup(move |app| {
            let resources = WritingResources::new();
            resources.delegate_to_app(&app.app_handle());
            let progress_emitter = app.handle();
            let _ = thread::spawn(move || {
                for received in rx {
                    let _ = progress_emitter.emit_all("solver-status", received);
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            generate,
            cancel,
            save_file,
            cmd_guess_control_interval_counts,
            delete_file,
            delete_dir,
            open_file_app,
            default_project,
            open_chor,
            write_chor,
            write_traj,
            find_all_traj,
            open_file_dialog,
            set_chor_path,
            open_traj,
            set_deploy_root
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn main() {
    if arg_count() <= 1 {
        run_tauri();
    } else {
        let args = std::env::args().collect::<Vec<String>>();
        Cli::parse_from(args).exec();
    }
}
