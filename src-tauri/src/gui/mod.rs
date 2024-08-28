use std::path::PathBuf;
use std::sync::OnceLock;
use std::{thread, vec};
use crate::document::file::WritingResources;
use crate::document::generate::setup_progress_sender;
#[allow(clippy::wildcard_imports)]
use crate::document::plugin::*;
use serde::{Deserialize, Serialize};
use tauri::Manager;

#[derive(Serialize, Deserialize, Clone, Debug)]
struct OpenFilePayload {
    dir: String,
    name: String
}

static REQUESTED_FILE: OnceLock<OpenFilePayload> = OnceLock::new();

#[tauri::command]
fn requested_file() -> Option<OpenFilePayload> {
    REQUESTED_FILE.get().cloned()
}

pub fn run_tauri(resources: WritingResources, project: Option<PathBuf>) {
    tracing::info!("Starting Choreo Gui");

    if let Some(project_path) = project {
        let payload = OpenFilePayload {
            dir: project_path.parent()
                .expect("project path should have a parent directory")
                .to_str()
                .expect("project path should be a valid string")
                .to_string(),
            name: project_path.file_name()
                .expect("project path should have a file name")
                .to_str()
                .expect("project path should be a valid string")
                .to_string()
        };
        REQUESTED_FILE.set(payload)
            .expect("requested file should be set");
    }

    let rx = setup_progress_sender();
    tauri::Builder::default()
        .setup(move |app| {
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
            set_deploy_root,
            requested_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}