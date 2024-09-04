//! Choreo (_Constraint-Honoring Omnidirectional Route Editor and Optimizer_,
//! pronounced like choreography) is a graphical tool for planning
//! time-optimized trajectories for autonomous mobile robots in the FIRST
//! Robotics Competition.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod api;
mod built;
mod logging;
mod tauri;

use std::fs;

use choreo_core::generation::remote::{remote_generate_child, RemoteArgs};

fn main() {
    let args = std::env::args().collect::<Vec<_>>();
    if args.len() > 2 {
        panic!("Unsupoorted arguments: {:?}", args);
    }

    if let Some(arg) = args.get(1) {
        if let Ok(remote_args) = RemoteArgs::from_content(arg) {
            tracing_subscriber::fmt()
                .with_max_level(tracing::Level::ERROR)
                .event_format(logging::CompactFormatter { ansicolor: false })
                .init();
            remote_generate_child(remote_args);
        } else {
            match fs::canonicalize(arg) {
                Ok(path) => {
                    tauri::run_tauri(Some(path));
                }
                Err(e) => {
                    panic!("Failed to canonicalize {} : {:?}", arg, e);
                }
            }
        }
    } else {
        tauri::run_tauri(None);
    }
}
