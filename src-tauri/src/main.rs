// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod document;
mod util;
use document::file::{
    delete_dir, delete_file, find_all_traj, new_file, open_chor, open_file_dialog, open_traj,
    set_chor_path, setup_senders, write_chor, write_traj,
};
use document::generate::{cancel, generate, setup_progress_sender};

use std::{fs, path::Path};
use std::{thread, vec};

use document::intervals::cmd_guess_control_interval_counts;
use tauri::Manager;

#[tauri::command]
async fn save_file(dir: String, name: String, contents: String) -> Result<(), &'static str> {
    let dir_path = Path::new(&dir);
    let name_path = Path::join(dir_path, name);
    if name_path.is_relative() {
        return Err("Dir needs to be absolute");
    }
    let _ = fs::create_dir_all(dir_path);
    if fs::write(name_path, contents).is_err() {
        return Err("Failed file writing");
    }
    Ok(())
}

#[tauri::command]
async fn open_file_app(path: String) {
    let _ = open::that(path);
}

fn main() {
    let rx = setup_progress_sender();
    tauri::Builder::default()
        .setup(|app| {
            setup_senders(app.handle());
            let progress_emitter = app.handle().clone();
            thread::spawn(move || {
                for received in rx {
                    let _ = progress_emitter.emit_all("solver-status", received);
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            generate,
            cmd_guess_control_interval_counts,
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
