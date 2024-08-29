use std::path::PathBuf;

use futures::TryStreamExt;
use ipc_channel::ipc;
use tauri::{api::dialog::blocking::FileDialogBuilder, Manager};
use tokio::{process::Command, select};

use crate::{error::ChoreoError, ChoreoResult, ResultExt};

use super::{
    file::{self, WritingResources},
    generate::{self, LocalProgressUpdate, RemoteProgressUpdate},
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
) -> ChoreoResult<Traj> {
    let resources = app_handle.state::<WritingResources>();
    file::rename_traj(&resources, old, new_name).await
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
pub async fn cancel() {
    trajoptlib::cancel_all();
}

#[tauri::command]
pub async fn generate_remote(
    app_handle: tauri::AppHandle,
    project: Project,
    traj: Traj,
    handle: i64,
) -> ChoreoResult<Traj> {
    let resources = app_handle.state::<WritingResources>();
    let project_path = resources
        .get_deploy_path()
        .await?
        .join(format!("{}.chor", project.name));

    let (server, server_name) = ipc::IpcOneShotServer::<RemoteProgressUpdate>::new()
        .map_err(|e| ChoreoError::SolverError(format!("Failed to create IPC server: {e:?}")))?;

    let mut child = Command::new("Choreo")
        .arg("--chor")
        .arg(project_path)
        .arg("--traj")
        .arg(traj.name)
        .arg("-g")
        .arg("--ipc")
        .arg(server_name)
        .spawn()?;

    let (rx, _) = server
        .accept()
        .map_err(|e| ChoreoError::SolverError(format!("Failed to accept IPC connection: {e:?}")))?;

    let mut stream = rx.to_stream();

    loop {
        // select over rx.try_next() and child.wait()
        select! {
            update_res = stream.try_next() => {
                match update_res {
                    Ok(Some(update)) => {
                        match update {
                            RemoteProgressUpdate::IncompleteTraj(traj) => {
                                app_handle.emit_all(
                                    "solver-status",
                                    LocalProgressUpdate {
                                        traj,
                                        handle
                                    },
                                ).expect("Failed to emit solver status");
                            },
                            RemoteProgressUpdate::CompleteTraj(traj) => {
                                return Ok(traj);
                            },
                            RemoteProgressUpdate::Error(e) => {
                                return Err(ChoreoError::SolverError(e));
                            },
                        }
                    },
                    Ok(None) => {
                        return Err(ChoreoError::SolverError("Solver exited without sending a result".to_string()));
                    },
                    Err(e) => {
                        return Err(ChoreoError::SolverError(format!("Error receiving solver update: {e:?}")));
                    },
                }
            },
            _ = child.wait() => {
                return Err(ChoreoError::SolverError("Solver exited without sending a result".to_string()));
            },
        }
    }
}
