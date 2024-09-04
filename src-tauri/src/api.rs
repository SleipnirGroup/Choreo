#![allow(clippy::needless_pass_by_value)]

use std::path::PathBuf;

use choreo_core::{
    file_management::{self, create_diagnostic_file, WritingResources},
    generation::remote::RemoteGenerationResources,
    spec::{
        project::{ProjectFile, RobotConfig},
        traj::TrajFile,
        Expr, OpenFilePayload,
    },
    ChoreoError
};
use tauri::{api::dialog::blocking::FileDialogBuilder, Manager};
use crate::tauri::TauriResult;

macro_rules! debug_result (
    ($result:expr) => {
        #[cfg(debug_assertions)]
        {
            match $result {
                Ok(val) => {
                    return Ok(val);
                }
                Err(e) => {
                    tracing::debug!("{e}");
                    return Err(e.into());
                }
            }
        }
        #[cfg(not(debug_assertions))]
        {
            return $result;
        }
    };
);

#[tauri::command]
pub fn guess_control_interval_counts(
    config: RobotConfig<Expr>,
    traj: TrajFile,
) -> TauriResult<Vec<usize>> {
    debug_result!(
        choreo_core::generation::intervals::guess_control_interval_counts(
            &config.snapshot(),
            &traj.params.snapshot(),
        )
    );
}

#[tauri::command]
pub async fn open_in_explorer(path: String) -> TauriResult<()> {
    debug_result!(open::that(path).map_err(ChoreoError::from));
}

#[tauri::command]
pub async fn open_project_dialog() -> TauriResult<OpenFilePayload> {
    FileDialogBuilder::new()
        .set_title("Open a .chor file")
        .add_filter("Choreo Save File", &["chor"])
        .pick_file()
        .ok_or(ChoreoError::FileNotFound(None))
        .map(|file| {
            Ok(OpenFilePayload {
                dir: file
                    .parent()
                    .ok_or(ChoreoError::FileNotFound(None))?
                    .to_str()
                    .ok_or(ChoreoError::FileNotFound(None))?
                    .to_string(),
                name: file
                    .file_name()
                    .ok_or(ChoreoError::FileNotFound(None))?
                    .to_str()
                    .ok_or(ChoreoError::FileNotFound(None))?
                    .to_string(),
            })
        })?
}

#[tauri::command]
pub async fn default_project() -> TauriResult<ProjectFile> {
    Ok(ProjectFile::default())
}

#[tauri::command]
pub async fn read_project(app_handle: tauri::AppHandle, name: String) -> TauriResult<ProjectFile> {
    let resources = app_handle.state::<WritingResources>();
    debug_result!(file_management::read_projectfile(&resources, name).await);
}

#[tauri::command]
pub async fn write_project(app_handle: tauri::AppHandle, project: ProjectFile) {
    let resources = app_handle.state::<WritingResources>();
    file_management::write_projectfile(&resources, project).await;
}

#[tauri::command]
pub async fn read_traj(app_handle: tauri::AppHandle, name: String) -> TauriResult<TrajFile> {
    let resources = app_handle.state::<WritingResources>();
    debug_result!(file_management::read_trajfile(&resources, name).await);
}

#[tauri::command]
pub async fn read_all_traj(app_handle: tauri::AppHandle) -> Vec<TrajFile> {
    let resources = app_handle.state::<WritingResources>();
    let trajs = file_management::find_all_traj(&resources).await;
    let mut out = vec![];
    for traj_name in trajs {
        let traj_res = file_management::read_trajfile(&resources, traj_name).await;
        match traj_res {
            Ok(traj) => out.push(traj),
            Err(e) => tracing::error!("{e}"),
        }
    }
    out
}

#[tauri::command]
pub async fn write_traj(app_handle: tauri::AppHandle, traj: TrajFile) {
    let resources = app_handle.state::<WritingResources>();
    file_management::write_trajfile(&resources, traj).await;
}

#[tauri::command]
pub async fn rename_traj(
    app_handle: tauri::AppHandle,
    old_traj: TrajFile,
    new_name: String,
) -> TauriResult<()> {
    let resources = app_handle.state::<WritingResources>();
    debug_result!(
        file_management::rename_trajfile(&resources, old_traj, new_name)
            .await
            .map(|_| ())
    );
}

#[tauri::command]
pub async fn delete_traj(app_handle: tauri::AppHandle, traj: TrajFile) -> TauriResult<()> {
    let resources = app_handle.state::<WritingResources>();
    debug_result!(file_management::delete_trajfile(&resources, traj).await);
}

#[tauri::command]
pub async fn set_deploy_root(app_handle: tauri::AppHandle, dir: String) {
    let resources = app_handle.state::<WritingResources>();
    file_management::set_deploy_path(&resources, PathBuf::from(dir)).await;
}

#[tauri::command]
pub async fn get_deploy_root(app_handle: tauri::AppHandle) -> TauriResult<String> {
    let resources = app_handle.state::<WritingResources>();
    match resources.get_deploy_path().await {
        Ok(path) => Ok(path.to_string_lossy().to_string()),
        // an absent deploy path is represented as an empty string in the frontend
        Err(ChoreoError::NoDeployPath) => Ok(String::new()),
        Err(e) => {
            tracing::error!("{e}");
            Err(e.into())
        }
    }
}

#[tauri::command]
pub async fn generate_remote(
    app_handle: tauri::AppHandle,
    project: ProjectFile,
    traj: TrajFile,
    handle: i64,
) -> TauriResult<TrajFile> {
    let remote_resources = app_handle.state::<RemoteGenerationResources>();
    use choreo_core::generation::remote::remote_generate_parent;
    debug_result!(remote_generate_parent(&remote_resources, project, traj, handle).await);
}

#[tauri::command]
pub fn cancel_remote_generator(app_handle: tauri::AppHandle, handle: i64) -> TauriResult<()> {
    let remote_resources = app_handle.state::<RemoteGenerationResources>();
    debug_result!(remote_resources.kill(handle));
}

#[tauri::command]
pub fn cancel_all_remote_generators(app_handle: tauri::AppHandle) {
    let remote_resources = app_handle.state::<RemoteGenerationResources>();
    remote_resources.kill_all();
}

fn log_lines() -> Vec<String> {
    if let Some(dir) = dirs::state_dir().map(|d| d.join("logs")) {
        tracing::debug!("Looking for log files in {:}", dir.display());
        match std::fs::read_dir(dir) {
            Ok(dir_content) => {
                let mut log_files = dir_content
                    .filter_map(|entry| entry.ok())
                    .filter(|entry| entry.file_type().map(|ft| ft.is_file()).unwrap_or(false))
                    .filter(|entry| entry.file_name().to_string_lossy().ends_with(".log"))
                    .collect::<Vec<_>>();
                log_files.sort_by_key(
                    |entry| {
                        entry.metadata()
                            .map(|m| m.modified().unwrap_or(std::time::SystemTime::UNIX_EPOCH))
                            .unwrap_or(std::time::SystemTime::UNIX_EPOCH)
                });
                let log_file = log_files.last().ok_or(ChoreoError::FileNotFound(None));
                match log_file {
                    Ok(log_file) => {
                        return std::fs::read_to_string(log_file.path())
                            .unwrap_or_else(|e| {
                                tracing::error!("{e}");
                                String::new()
                            })
                            .lines()
                            .map(|line| format!("{:}\n", line))
                            .collect::<Vec<String>>()
                    },
                    Err(e) => {
                        tracing::error!("{e}");
                        Vec::new()
                    }
                }
            },
            Err(e) => {
                tracing::error!("{e}");
                Vec::new()
            }
        }
    } else {
        Vec::new()
    }
}

#[tauri::command]
pub fn open_diagnostic_file(project: ProjectFile, trajs: Vec<TrajFile>) -> TauriResult<()> {
    tracing::debug!("Opening diagnostic file");
    let log_lines = log_lines();

    tracing::debug!("Found {:} log lines", log_lines.len());

    let tmp_path = create_diagnostic_file(project, trajs, log_lines)?;

    tracing::debug!("Created diagnostic file");

    if let Some(pth) = tmp_path.parent() {
        debug_result!(open::that(pth).map_err(ChoreoError::from));
    } else {
        Err(ChoreoError::FileNotFound(None).into())
    }
}