use crate::built::BuildInfo;
use crate::{api::*, logging};
use choreo_core::file_management::WritingResources;
use choreo_core::generation::{generate::setup_progress_sender, remote::RemoteGenerationResources};
use choreo_core::spec::OpenFilePayload;
use choreo_core::ChoreoError;
use logging::now_str;
use std::io::Write;
use std::path::PathBuf;
use std::sync::OnceLock;
use std::{fs, thread};
use tauri::Manager;
use tracing_appender::non_blocking::WorkerGuard;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[derive(Debug)]
pub struct TauriChoreoError(ChoreoError);

impl From<ChoreoError> for TauriChoreoError {
    fn from(e: ChoreoError) -> Self {
        Self(e)
    }
}

impl std::fmt::Display for TauriChoreoError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl serde::Serialize for TauriChoreoError {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        self.0
            .to_string()
            .replace(['\"', '\\'], "")
            .serialize(serializer)
    }
}

pub type TauriResult<T> = std::result::Result<T, TauriChoreoError>;

static REQUESTED_FILE: OnceLock<OpenFilePayload> = OnceLock::new();

#[tauri::command]
fn requested_file() -> Option<OpenFilePayload> {
    REQUESTED_FILE.get().cloned()
}

#[tauri::command]
fn build_info() -> BuildInfo {
    BuildInfo::from_build()
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

#[tauri::command]
pub async fn error_message(error: ChoreoError) -> String {
    error.to_string()
}

fn setup_tracing() -> Vec<WorkerGuard> {
    let file = if let Some(log_dir) = dirs::data_local_dir().map(|d| d.join("choreo/log")) {
        if let Err(e) = fs::create_dir_all(&log_dir) {
            tracing::error!("Failed to create log directory: {}", e);
        }
        let log_file_name = format!("choreo-{}.log", now_str().replace([':', '.'], "-"));
        match fs::File::create(log_dir.join(log_file_name)) {
            Ok(file) => Some(file),
            Err(e) => {
                tracing::error!("Failed to create log file: {}", e);
                None
            }
        }
    } else {
        None
    };

    let mut guards = Vec::new();

    let (std_io, guard_std_io) = tracing_appender::non_blocking(std::io::stdout());
    guards.push(guard_std_io);
    let registry = tracing_subscriber::registry().with(
        tracing_subscriber::fmt::layer()
            .with_writer(std_io)
            .event_format(logging::CompactFormatter { ansicolor: true }),
    );

    if let Some(mut log_file) = file {
        if let Err(e) = log_file.write_all(BuildInfo::from_build().to_string().as_bytes()) {
            tracing::error!("Failed to write build info to log file: {}", e);
        }

        let (file_writer, _guard_file) = tracing_appender::non_blocking(log_file);
        guards.push(_guard_file);

        registry
            .with(
                tracing_subscriber::fmt::layer()
                    .with_writer(file_writer)
                    .event_format(logging::CompactFormatter { ansicolor: false }),
            )
            .init();
    } else {
        registry.init();
    }

    guards
}

pub fn run_tauri(project: Option<PathBuf>) {
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
            write_trajectory,
            read_all_trajectory,
            open_project_dialog,
            read_trajectory,
            rename_trajectory,
            set_deploy_root,
            get_deploy_root,
            requested_file,
            delete_trajectory,
            tracing_frontend,
            generate_remote,
            cancel_remote_generator,
            cancel_all_remote_generators,
            build_info,
            open_diagnostic_file,
            error_message
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");

    drop(guards);
}
