//! Choreo (_Constraint-Honoring Omnidirectional Route Editor and Optimizer_,
//! pronounced like choreography) is a graphical tool for planning
//! time-optimized trajectories for autonomous mobile robots in the FIRST
//! Robotics Competition.

// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod document;
mod error;
mod util;
use std::{fs, path::Path};
use std::{thread, vec};

use document::adjust::cmd_adjust_waypoint_headings;
use document::file::{
    delete_dir, delete_file, find_all_traj, new_file, open_chor, open_file_dialog, open_traj,
    set_chor_path, setup_senders, write_chor, write_traj,
};
use document::generate::{cancel, generate, setup_progress_sender};
use document::intervals::cmd_guess_control_interval_counts;
use error::ChoreoError;
use tauri::Manager;

type Result<T> = std::result::Result<T, error::ChoreoError>;

#[tauri::command]
async fn save_file(dir: String, name: String, contents: String) -> Result<()> {
    let dir_path = Path::new(&dir);
    let name_path = Path::join(dir_path, name);
    if name_path.is_relative() {
        return Err(ChoreoError::FileSave("Dir needs to be absolute"));
    }
    fs::create_dir_all(dir_path)?;
    fs::write(name_path, contents)?;
    Ok(())
}

#[tauri::command]
async fn open_file_app(path: String) -> Result<()> {
    open::that(path).map_err(ChoreoError::Io)
}

fn main() {
    let rx = setup_progress_sender();
    tauri::Builder::default()
        .setup(|app| {
            setup_senders(&app.handle());
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
            cmd_guess_control_interval_counts,
            cmd_adjust_waypoint_headings,
            cancel,
            save_file,
            delete_file,
            delete_dir,
            open_file_app,
            new_file,
            open_chor,
            write_chor,
            write_traj,
            find_all_traj,
            open_file_dialog,
            set_chor_path,
            open_traj
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
