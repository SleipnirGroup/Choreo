#![allow(clippy::needless_pass_by_value)]

use std::path::PathBuf;

use tauri::{api::dialog::blocking::FileDialogBuilder, Manager};

use crate::{error::ChoreoError, ChoreoResult, ResultExt};

use super::{
    file::{self, WritingResources},
    generate::{self, RemoteGenerationResources},
    types::{Expr, OpenFilePayload, Project, RobotConfig, Traj},
};

#[tauri::command]
#[allow(clippy::needless_pass_by_value)]
pub fn guess_control_interval_counts(
    config: RobotConfig<Expr>,
    traj: Traj,
) -> ChoreoResult<Vec<usize>> {
    super::intervals::guess_control_interval_counts(&config, &traj)
}

#[tauri::command]
pub async fn open_in_explorer(path: String) -> ChoreoResult<()> {
    open::that(path).map_err(ChoreoError::Io)
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
pub async fn default_project() -> ChoreoResult<Project> {
    Ok(Project::default())
}

#[tauri::command]
pub async fn read_project(app_handle: tauri::AppHandle, name: String) -> ChoreoResult<Project> {
    let resources = app_handle.state::<WritingResources>();
    file::read_project(&resources, name).await
}

#[tauri::command]
pub async fn write_project(app_handle: tauri::AppHandle, project: Project) {
    let resources = app_handle.state::<WritingResources>();
    file::write_project(&resources, project).await;
}

#[tauri::command]
pub async fn read_traj(app_handle: tauri::AppHandle, name: String) -> ChoreoResult<Traj> {
    let resources = app_handle.state::<WritingResources>();

    tracing::info!(
        "Opening trajectory {name}.traj at {:}",
        resources.get_deploy_path().await?.display()
    );

    file::read_traj(&resources, name).await
}

#[tauri::command]
pub async fn read_all_traj(app_handle: tauri::AppHandle) -> Vec<Traj> {
    let resources = app_handle.state::<WritingResources>();
    let trajs = file::find_all_traj(&resources).await;
    let mut out = vec![];
    for traj_name in trajs {
        let traj_res = file::read_traj(&resources, traj_name).await;
        if let Ok(traj) = traj_res {
            out.push(traj);
        } else {
            traj_res.trace_warn();
        }
    }
    out
}

#[tauri::command]
pub async fn write_traj(app_handle: tauri::AppHandle, traj: Traj) {
    let resources = app_handle.state::<WritingResources>();
    file::write_traj(&resources, traj).await;
}

#[tauri::command]
pub async fn rename_traj(
    app_handle: tauri::AppHandle,
    old: Traj,
    new_name: String,
) -> ChoreoResult<()> {
    let resources = app_handle.state::<WritingResources>();
    file::rename_traj(&resources, old, new_name)
        .await
        .map(|_| ())
}

#[tauri::command]
pub async fn delete_traj(app_handle: tauri::AppHandle, traj: Traj) -> ChoreoResult<()> {
    let resources = app_handle.state::<WritingResources>();
    file::delete_traj(&resources, traj).await
}

#[tauri::command]
pub async fn set_deploy_root(app_handle: tauri::AppHandle, dir: String) {
    let resources = app_handle.state::<WritingResources>();
    file::set_deploy_path(&resources, PathBuf::from(dir)).await;
}

#[tauri::command]
pub async fn get_deploy_root(app_handle: tauri::AppHandle) -> ChoreoResult<String> {
    let resources = app_handle.state::<WritingResources>();
    let path = resources.get_deploy_path().await?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn generate(
    project: Project,
    traj: Traj,
    // The handle referring to this path for the solver state callback
    handle: i64,
) -> ChoreoResult<Traj> {
    generate::generate(&project, traj, handle)
}

#[tauri::command]
pub async fn cancel_all() {
    trajoptlib::cancel_all();
}

#[tauri::command]
pub async fn generate_remote(
    app_handle: tauri::AppHandle,
    project: Project,
    traj: Traj,
    handle: i64,
) -> ChoreoResult<Traj> {
    let writing_resources = app_handle.state::<WritingResources>();
    let remote_resources = app_handle.state::<RemoteGenerationResources>();
    generate::generate_remote(&writing_resources, &remote_resources, project, traj, handle).await
}

#[tauri::command]
pub fn kill_remote_generation(app_handle: tauri::AppHandle, handle: i64) -> ChoreoResult<()> {
    let remote_resources = app_handle.state::<RemoteGenerationResources>();
    remote_resources.kill(handle)
}

#[tauri::command]
pub fn kill_all_remote_generators(app_handle: tauri::AppHandle) {
    let remote_resources = app_handle.state::<RemoteGenerationResources>();
    remote_resources.kill_all();
}
