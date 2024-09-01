//! Choreo (_Constraint-Honoring Omnidirectional Route Editor and Optimizer_,
//! pronounced like choreography) is a graphical tool for planning
//! time-optimized trajectories for autonomous mobile robots in the FIRST
//! Robotics Competition.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod api;
mod logging;
mod tauri;

use std::fs;

use choreo_core::generation::{generate::RemoteArgs, remote::remote_main};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

fn main() {
    let args = std::env::args().collect::<Vec<_>>();
    if args.len() > 2 {
        panic!("Unsupoorted arguments: {:?}", args);
    }

    tracing_subscriber::registry()
        .with(tracing_subscriber::fmt::layer().event_format(logging::CompactFormatter))
        .init();

    if let Some(arg) = args.get(1) {
        if let Ok(remote_args) = RemoteArgs::from_content(arg) {
            remote_main(remote_args);
        } else {
            match fs::canonicalize(arg) {
                Ok(path) => {
                    tauri::run_tauri(Some(path));
                }
                Err(e) => {
                    tracing::error!("Failed to canonicalize path: {:?}", e);
                    tauri::run_tauri(None);
                }
            }
        }
    } else {
        tauri::run_tauri(None);
    }
}
