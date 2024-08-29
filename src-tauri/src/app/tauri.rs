use crate::document::file::WritingResources;
use crate::document::generate::setup_progress_sender;
#[allow(clippy::wildcard_imports)]
use crate::document::plugin::*;
use crate::document::types::OpenFilePayload;
use std::path::PathBuf;
use std::sync::OnceLock;
use std::{thread, vec};
use tauri::Manager;

static REQUESTED_FILE: OnceLock<OpenFilePayload> = OnceLock::new();

#[tauri::command]
fn requested_file() -> Option<OpenFilePayload> {
    REQUESTED_FILE.get().cloned()
}

#[tauri::command]
pub async fn tracing_frontend(level: String, msg: String, line: String, file: String) {
    match level.as_str() {
        "trace" => tracing::trace!(
            source = "frontend",
            message = msg,
            line = line,
            file = file,
            source = "frontend"
        ),
        "debug" => tracing::debug!(
            source = "frontend",
            message = msg,
            line = line,
            file = file,
            source = "frontend"
        ),
        "info" => tracing::info!(
            source = "frontend",
            message = msg,
            line = line,
            file = file,
            source = "frontend"
        ),
        "warn" => tracing::warn!(
            source = "frontend",
            message = msg,
            line = line,
            file = file,
            source = "frontend"
        ),
        "error" => tracing::error!(
            source = "frontend",
            message = msg,
            line = line,
            file = file,
            source = "frontend"
        ),
        _ => tracing::error!("Invalid log level: {}", level),
    }
}

pub fn run_tauri(resources: WritingResources, project: Option<PathBuf>) {
    tracing::info!("Starting Choreo Gui");

    if let Some(project_path) = project {
        let payload = OpenFilePayload {
            dir: project_path
                .parent()
                .expect("project path should have a parent directory")
                .to_str()
                .expect("project path should be a valid string")
                .to_string(),
            name: project_path
                .file_name()
                .expect("project path should have a file name")
                .to_str()
                .expect("project path should be a valid string")
                .to_string(),
        };
        REQUESTED_FILE
            .set(payload)
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
            guess_control_interval_counts,
            open_in_explorer,
            default_project,
            read_project,
            write_project,
            write_traj,
            read_all_traj,
            open_project_dialog,
            read_traj,
            rename_traj,
            set_deploy_root,
            get_deploy_root,
            requested_file,
            delete_traj,
            tracing_frontend,
            generate_remote
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
