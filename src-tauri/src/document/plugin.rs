use std::path::{Path, PathBuf};

use tauri::{ api::dialog::blocking::FileDialogBuilder, Manager};
use tokio::fs;

use crate::{error::ChoreoError, ChoreoResult};

use super::{file::{self, WritingResources}, generate, intervals::guess_control_interval_counts, types::{Expr, Project, RobotConfig, Traj}};




#[tauri::command]
#[allow(clippy::needless_pass_by_value)]
pub fn cmd_guess_control_interval_counts(
    config: RobotConfig<Expr>,
    traj: Traj,
) -> ChoreoResult<Vec<usize>> {
    guess_control_interval_counts(&config, &traj)
}

#[tauri::command]
pub async fn delete_dir(dir: String) -> ChoreoResult<()> {
    let dir_path = Path::new(&dir);
    fs::remove_dir_all(dir_path).await.map_err(Into::into)
}

#[tauri::command]
pub async fn delete_file(dir: String, name: String) -> ChoreoResult<()> {
    let dir_path = Path::new(&dir);
    let name_path = Path::join(dir_path, name);
    fs::remove_file(name_path).await.map_err(Into::into)
}


#[tauri::command]
pub async fn open_chor(
    app_handle: tauri::AppHandle,
    path: Option<(String, String)>,
) -> ChoreoResult<Project> {
    let (dir, name) = match path {
        None => open_file_dialog().await?,
        Some(path) => path,
    };

    let resources = app_handle.state::<WritingResources>();
    file::set_deploy_path(&resources, PathBuf::from(&dir)).await;

    tracing::info!("Opening chor {:} from {:}", name, dir);

    let pathbuf = Path::new(&dir).join(name.clone());
    let contents = fs::read_to_string(pathbuf).await?;
    let mut chor = Project::from_content(&contents)?;
    chor.name = name;

    // let _ = send_open_chor_event(app_handle, chor, dir.as_str(), name.as_str());
    Ok(chor)
}

#[tauri::command]
pub async fn open_traj(
    app_handle: tauri::AppHandle,
    name: String,
) -> ChoreoResult<Traj> {
    tracing::info!("Opening traj {:}", name);

    let resources = app_handle.state::<WritingResources>();
    let root = resources.root.lock().await.clone();
    let pathbuf = root.join(&name);
    let contents = fs::read_to_string(pathbuf).await?;
    let traj = Traj::from_content(&contents)?;
    //let _ = send_open_chor_event(app_handle, chor, dir.as_str(), name.as_str());
    Ok(traj)
}

#[tauri::command]
pub async fn save_file(dir: String, name: String, contents: String) -> ChoreoResult<()> {
    let dir_path = Path::new(&dir);
    let name_path = Path::join(dir_path, name);
    if name_path.is_relative() {
        return Err(ChoreoError::FileSave("Dir needs to be absolute"));
    }
    fs::create_dir_all(dir_path).await?;
    fs::write(name_path, contents).await?;
    Ok(())
}

#[tauri::command]
pub async fn open_file_app(path: String) -> ChoreoResult<()> {
    open::that(path).map_err(ChoreoError::Io)
}

#[tauri::command]
pub async fn write_chor(app_handle: tauri::AppHandle, chor: Project) {
    let resources = app_handle.state::<WritingResources>();
    file::write_project(&resources, chor).await;
}

#[tauri::command]
pub async fn write_traj(app_handle: tauri::AppHandle, traj: Traj) {
    tracing::debug!("Writing traj {:}", traj.name);

    let resources = app_handle.state::<WritingResources>();
    file::write_traj(&resources, traj).await;
}

#[tauri::command]
pub async fn set_chor_path(app_handle: tauri::AppHandle, dir: String, _name: String) {
    let resources = app_handle.state::<WritingResources>();
    file::set_deploy_path(&resources, PathBuf::from(dir)).await;
}

#[tauri::command]
pub async fn set_deploy_root(app_handle: tauri::AppHandle, dir: String) {
    let resources = app_handle.state::<WritingResources>();
    file::set_deploy_path(&resources, PathBuf::from(dir)).await;
}

#[tauri::command]
pub async fn open_file_dialog() -> ChoreoResult<(String, String)> {
    let file_path = FileDialogBuilder::new()
        .set_title("Open a .chor file")
        .add_filter("Choreo Save File", &["chor"])
        .pick_file();
    if let Some(path) = file_path {
        if let Some(dir) = path.parent() {
            if let Some(name) = path.file_name() {
                let dir = dir.to_str();
                let name = name.to_str();
                if let (Some(dir), Some(name)) = (dir, name) {
                    return Ok((dir.to_string(), name.to_string()));
                }
                return Err(ChoreoError::FileRead(path.clone()));
            }
        }
    }
    Err(ChoreoError::FileNotFound(None))
}

#[tauri::command]
pub async fn default_project() -> ChoreoResult<Project> {
    Ok(file::default_project("New Project".to_string()))
}

#[tauri::command]
pub async fn find_all_traj(app_handle: tauri::AppHandle, dir: String) -> Vec<String> {
    let resources = app_handle.state::<WritingResources>();
    file::set_deploy_path(&resources, PathBuf::from(dir)).await;
    file::find_all_traj(&resources).await
}

#[tauri::command]
pub async fn generate(
    chor: Project,
    traj: Traj,
    // The handle referring to this path for the solver state callback
    handle: i64,
) -> ChoreoResult<Traj> {
    generate::generate(&chor, traj, handle)
}

#[tauri::command]
pub async fn cancel() {
    trajoptlib::cancel_all();
}