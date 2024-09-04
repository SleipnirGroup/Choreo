use crate::built::BuiltInfo;
use crate::{api::*, logging};
use choreo_core::file_management::WritingResources;
use choreo_core::generation::{generate::setup_progress_sender, remote::RemoteGenerationResources};
use choreo_core::spec::OpenFilePayload;
use choreo_core::{ChoreoError, ChoreoResult};
use logging::now_str;
use std::path::PathBuf;
use std::sync::OnceLock;
use std::{fs, thread};
use tauri::Manager;
use tracing_appender::non_blocking::WorkerGuard;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

static REQUESTED_FILE: OnceLock<OpenFilePayload> = OnceLock::new();

#[tauri::command]
fn requested_file() -> Option<OpenFilePayload> {
    REQUESTED_FILE.get().cloned()
}

#[tauri::command]
async fn open_log_dir() -> ChoreoResult<()> {
    match dirs::data_local_dir().map(|d| d.join("choreo/log")) {
        Some(log_dir) => open::that(log_dir).map_err(Into::into),
        None => Err(ChoreoError::FileNotFound(None)),
    }
}

#[tauri::command]
fn build_info() -> BuiltInfo {
    BuiltInfo::from_build()
}

#[tauri::command]
pub async fn tracing_frontend(level: String, msg: String, file: String, function: Option<String>) {
    match level.as_str() {
        "trace" => tracing::trace!(
            source = "frontend",
            message = msg,
            file = file,
            function = function,
            source = "frontend"
        ),
        "debug" => tracing::debug!(
            source = "frontend",
            message = msg,
            file = file,
            function = function,
            source = "frontend"
        ),
        "info" => tracing::info!(
            source = "frontend",
            message = msg,
            file = file,
            function = function,
            source = "frontend"
        ),
        "warn" => tracing::warn!(
            source = "frontend",
            message = msg,
            file = file,
            function = function,
            source = "frontend"
        ),
        "error" => tracing::error!(
            source = "frontend",
            message = msg,
            file = file,
            function = function,
            source = "frontend"
        ),
        _ => tracing::error!("Invalid log level: {}", level),
    }
}

fn setup_tracing() -> Vec<WorkerGuard> {
    let mut guards = Vec::new();

    let (std_io, guard_std_io) = tracing_appender::non_blocking(std::io::stdout());
    guards.push(guard_std_io);
    let registry = tracing_subscriber::registry().with(
        tracing_subscriber::fmt::layer()
            .with_writer(std_io)
            .event_format(logging::CompactFormatter { ansicolor: true }),
    );

    let file = dirs::data_local_dir().and_then(|data_local_dir| {
        let log_dir = data_local_dir.join("choreo/log");
        fs::create_dir_all(&log_dir)
            .and_then(|_| fs::File::create(log_dir.join(format!("choreo-gui-{}.log", now_str()))))
            .ok()
    });
    match file {
        Some(log_file) => {
            let (file_writer, _guard_file) = tracing_appender::non_blocking(log_file);
            guards.push(_guard_file);

            registry
                .with(
                    tracing_subscriber::fmt::layer()
                        .with_writer(file_writer)
                        .event_format(logging::CompactFormatter { ansicolor: false }),
                )
                .init();
        }
        None => registry.init(),
    }

    guards
}

pub fn run_tauri(project: Option<PathBuf>) {
    let context = tauri::generate_context!();

    let guards = setup_tracing();

    tracing::info!(
        "Starting Choreo {} {}",
        env!("CARGO_PKG_VERSION"),
        current_platform::CURRENT_PLATFORM
    );

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
                    let _ = progress_emitter.emit_all(
                        &format!("solver-status-{}", received.handle),
                        received.update,
                    );
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
            cancel_all_remote_generators,
            open_log_dir,
            build_info
        ])
        .run(context)
        .expect("error while running tauri application");

    drop(guards);
}
