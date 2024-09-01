#![allow(clippy::needless_pass_by_value)]

use std::path::PathBuf;

use choreo_core::{
    file_management::{self, WritingResources},
    generation::generate::RemoteGenerationResources,
    spec::{
        project::{ProjectFile, RobotConfig},
        traj::TrajFile,
        Expr, OpenFilePayload,
    },
    ChoreoError, ChoreoResult, ResultExt,
};
use tauri::{api::dialog::blocking::FileDialogBuilder, Manager};

#[tauri::command]
pub fn guess_control_interval_counts(
    config: RobotConfig<Expr>,
    traj: TrajFile,
) -> ChoreoResult<Vec<usize>> {
    choreo_core::generation::intervals::guess_control_interval_counts(&config, &traj)
}

#[tauri::command]
pub async fn open_in_explorer(path: String) -> ChoreoResult<()> {
    open::that(path).map_err(Into::into)
}

#[tauri::command]
pub async fn open_project_dialog() -> ChoreoResult<OpenFilePayload> {
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
pub async fn default_project() -> ChoreoResult<ProjectFile> {
    Ok(ProjectFile::default())
}

#[tauri::command]
pub async fn read_project(app_handle: tauri::AppHandle, name: String) -> ChoreoResult<ProjectFile> {
    let resources = app_handle.state::<WritingResources>();
    file_management::read_projectfile(&resources, name).await
}

#[tauri::command]
pub async fn write_project(app_handle: tauri::AppHandle, project: ProjectFile) {
    let resources = app_handle.state::<WritingResources>();
    file_management::write_projectfile(&resources, project).await;
}

#[tauri::command]
pub async fn read_traj(app_handle: tauri::AppHandle, name: String) -> ChoreoResult<TrajFile> {
    let resources = app_handle.state::<WritingResources>();
    file_management::read_trajfile(&resources, name).await
}

#[tauri::command]
pub async fn read_all_traj(app_handle: tauri::AppHandle) -> Vec<TrajFile> {
    let resources = app_handle.state::<WritingResources>();
    let trajs = file_management::find_all_traj(&resources).await;
    let mut out = vec![];
    for traj_name in trajs {
        let traj_res = file_management::read_trajfile(&resources, traj_name).await;
        if let Ok(traj) = traj_res {
            out.push(traj);
        } else {
            traj_res.trace_warn();
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
) -> ChoreoResult<()> {
    let resources = app_handle.state::<WritingResources>();
    file_management::rename_trajfile(&resources, old_traj, new_name)
        .await
        .map(|_| ())
}

#[tauri::command]
pub async fn delete_traj(app_handle: tauri::AppHandle, traj: TrajFile) -> ChoreoResult<()> {
    let resources = app_handle.state::<WritingResources>();
    file_management::delete_trajfile(&resources, traj).await
}

#[tauri::command]
pub async fn set_deploy_root(app_handle: tauri::AppHandle, dir: String) {
    let resources = app_handle.state::<WritingResources>();
    file_management::set_deploy_path(&resources, PathBuf::from(dir)).await;
}

#[tauri::command]
pub async fn get_deploy_root(app_handle: tauri::AppHandle) -> ChoreoResult<String> {
    let resources = app_handle.state::<WritingResources>();
    match resources.get_deploy_path().await {
        Ok(path) => Ok(path.to_string_lossy().to_string()),
        // an absent deploy path is represented as an empty string in the frontend
        Err(ChoreoError::NoDeployPath) => Ok(String::new()),
        Err(e) => Err(e),
    }
}

#[tauri::command]
pub async fn generate(
    project: ProjectFile,
    traj: TrajFile,
    // The handle referring to this path for the solver state callback
    handle: i64,
) -> ChoreoResult<TrajFile> {
    choreo_core::generation::generate::generate(&project, traj, handle)
}

#[tauri::command]
pub async fn cancel_all() {
    choreo_core::generation::generate::cancel_all();
}

#[tauri::command]
pub async fn generate_remote(
    app_handle: tauri::AppHandle,
    project: ProjectFile,
    traj: TrajFile,
    handle: i64,
) -> ChoreoResult<TrajFile> {
    let remote_resources = app_handle.state::<RemoteGenerationResources>();
    choreo_core::generation::generate::generate_remote(&remote_resources, project, traj, handle)
        .await
}

#[tauri::command]
pub fn cancel_remote_generator(app_handle: tauri::AppHandle, handle: i64) -> ChoreoResult<()> {
    let remote_resources = app_handle.state::<RemoteGenerationResources>();
    remote_resources.kill(handle)
}

#[tauri::command]
pub fn cancel_all_remote_generators(app_handle: tauri::AppHandle) {
    let remote_resources = app_handle.state::<RemoteGenerationResources>();
    remote_resources.kill_all();
}
