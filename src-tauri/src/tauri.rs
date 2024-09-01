use crate::api::*;
use choreo_core::file_management::WritingResources;
use choreo_core::generation::generate::{setup_progress_sender, RemoteGenerationResources};
use choreo_core::spec::OpenFilePayload;
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

pub fn run_tauri(project: Option<PathBuf>) {
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
    let remote_resources = RemoteGenerationResources::new();
    let writing_resources = WritingResources::new();

    tauri::Builder::default()
        .setup(move |app| {
            app.app_handle().manage(writing_resources);
            app.app_handle().manage(remote_resources);

            let progress_emitter = app.handle();
            let _ = thread::spawn(move || {
                for received in rx {
                    let _ = progress_emitter.emit_all("solver-status", received);
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
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
            generate_remote,
            cancel_remote_generator,
            cancel_all_remote_generators
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
