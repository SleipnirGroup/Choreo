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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
