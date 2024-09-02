//! Choreo (_Constraint-Honoring Omnidirectional Route Editor and Optimizer_,
//! pronounced like choreography) is a graphical tool for planning
//! time-optimized trajectories for autonomous mobile robots in the FIRST
//! Robotics Competition.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod api;
mod logging;
mod tauri;

use std::fs;

use choreo_core::generation::remote::{remote_generate_child, RemoteArgs};
use logging::now_str;
use ::tauri::api::path::document_dir;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

fn get_log_file() -> fs::File {
    let docu_dir = document_dir().expect("Failed to get document directory");
    let dir = docu_dir.join("choreo-logs");
    fs::create_dir_all(&dir).expect("Failed to create log directory");
    let time_str = now_str().replace(':', "-").replace('.', "-");
    let path = dir.join(format!("choreo-{}.log", time_str));
    fs::File::create(path).expect("Failed to create log file")
}

fn main() {
    let args = std::env::args().collect::<Vec<_>>();
    if args.len() > 2 {
        panic!("Unsupoorted arguments: {:?}", args);
    }

    let (std_io, _guard_std_io) = tracing_appender::non_blocking(std::io::stdout());
    let (file, _guard_file) = tracing_appender::non_blocking(get_log_file());
    let _guard_lock = (_guard_std_io, _guard_file);

    tracing_subscriber::registry()
        .with(
            tracing_subscriber::fmt::layer()
                .with_writer(std_io)
                .event_format(logging::CompactFormatter))
        .with(
            tracing_subscriber::fmt::layer()
                .with_writer(file)
                .event_format(logging::CompactFormatter))
        .init();

    if let Some(arg) = args.get(1) {
        if let Ok(remote_args) = RemoteArgs::from_content(arg) {
            remote_generate_child(remote_args);
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
