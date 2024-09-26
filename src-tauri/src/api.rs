#![allow(clippy::needless_pass_by_value)]

use std::path::PathBuf;

use crate::tauri::TauriResult;
use choreo_core::{
    file_management::{self, create_diagnostic_file, get_log_lines, WritingResources},
    generation::remote::RemoteGenerationResources,
    spec::{
        project::{ProjectFile, RobotConfig},
        trajectory::TrajectoryFile,
        Expr, OpenFilePayload,
    },
    ChoreoError,
};
use tauri::{api::dialog::blocking::FileDialogBuilder, Manager};

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
            return $result.map_err(Into::into);
        }
    };
);

#[tauri::command]
pub fn guess_control_interval_counts(
    config: RobotConfig<Expr>,
    trajectory: TrajectoryFile,
) -> TauriResult<Vec<usize>> {
    debug_result!(
        choreo_core::generation::intervals::guess_control_interval_counts(
            &config.snapshot(),
            &trajectory.params.snapshot(),
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
pub async fn read_trajectory(
    app_handle: tauri::AppHandle,
    name: String,
) -> TauriResult<TrajectoryFile> {
    let resources = app_handle.state::<WritingResources>();
    debug_result!(file_management::read_trajectory_file(&resources, name).await);
}

#[tauri::command]
pub async fn read_all_trajectory(app_handle: tauri::AppHandle) -> Vec<TrajectoryFile> {
    let resources = app_handle.state::<WritingResources>();
    let trajectories = file_management::find_all_trajectories(&resources).await;
    let mut out = vec![];
    for trajectory_name in trajectories {
        let trajectory_res =
            file_management::read_trajectory_file(&resources, trajectory_name).await;
        match trajectory_res {
            Ok(trajectory) => out.push(trajectory),
            Err(e) => tracing::error!("{e}"),
        }
    }
    out
}

#[tauri::command]
pub async fn write_trajectory(app_handle: tauri::AppHandle, trajectory: TrajectoryFile) {
    let resources = app_handle.state::<WritingResources>();
    file_management::write_trajectory_file(&resources, trajectory).await;
}

#[tauri::command]
pub async fn rename_trajectory(
    app_handle: tauri::AppHandle,
    old_trajectory: TrajectoryFile,
    new_name: String,
) -> TauriResult<()> {
    let resources = app_handle.state::<WritingResources>();
    debug_result!(
        file_management::rename_trajectory_file(&resources, old_trajectory, new_name)
            .await
            .map(|_| ())
    );
}

#[tauri::command]
pub async fn delete_trajectory(
    app_handle: tauri::AppHandle,
    trajectory: TrajectoryFile,
) -> TauriResult<()> {
    let resources = app_handle.state::<WritingResources>();
    debug_result!(file_management::delete_trajectory_file(&resources, trajectory).await);
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
    trajectory: TrajectoryFile,
    handle: i64,
) -> TauriResult<TrajectoryFile> {
    let remote_resources = app_handle.state::<RemoteGenerationResources>();
    use choreo_core::generation::remote::remote_generate_parent;
    debug_result!(remote_generate_parent(&remote_resources, project, trajectory, handle).await);
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

#[tauri::command]
pub fn open_diagnostic_file(
    project: ProjectFile,
    trajectories: Vec<TrajectoryFile>,
) -> TauriResult<()> {
    tracing::debug!("Opening diagnostic file");
    let log_lines = get_log_lines(dirs::data_local_dir().map(|d| d.join("choreo/log")));

    tracing::debug!("Found {:} log lines", log_lines.len());

    let tmp_path = create_diagnostic_file(project, trajectories, log_lines)?;

    tracing::debug!("Created diagnostic file");

    if let Some(pth) = tmp_path.parent() {
        debug_result!(open::that(pth).map_err(ChoreoError::from));
    } else {
        Err(ChoreoError::FileNotFound(None).into())
    }
}
