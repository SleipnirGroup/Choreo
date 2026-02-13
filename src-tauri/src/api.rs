#![allow(clippy::needless_pass_by_value)]

use std::path::PathBuf;
use std::{fs, num::NonZero, path::Path};

use crate::tauri::{TauriChoreoError, TauriResult};
use base64::Engine as _;
use base64::engine::general_purpose;
use choreo_core::codegen::{TRAJ_DATA_FILENAME, VARS_FILENAME, java};
use choreo_core::tokio;
use choreo_core::{
    ChoreoError, ChoreoResult,
    file_management::{self, WritingResources, create_diagnostic_file, get_log_lines},
    generation::remote::RemoteGenerationResources,
    spec::{
        Expr, OpenFilePayload,
        field::FieldJSON,
        project::{ProjectFile, RobotConfig},
        trajectory::TrajectoryFile,
    },
};
use serde::{Deserialize, Serialize};
use tauri::Manager;
use tauri_plugin_dialog::{DialogExt, FilePath};

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
pub async fn select_codegen_folder(app_handle: tauri::AppHandle) -> TauriResult<String> {
    Ok(app_handle
        .dialog()
        .file()
        .set_title("Select a folder to output generated Java files")
        .blocking_pick_folder()
        .ok_or(ChoreoError::FileNotFound(None))?
        .as_path()
        .ok_or(ChoreoError::FileNotFound(None))?
        .to_str()
        .ok_or(ChoreoError::FileNotFound(None))?
        .to_string())
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetFieldJSONResponse {
    field_json_relative_path: PathBuf,
    field_json: FieldJSON,
    field_image_base64: String,
}
#[tauri::command]
pub async fn select_field_json(app_handle: tauri::AppHandle) -> TauriResult<GetFieldJSONResponse> {
    let (sender, receiver) = choreo_core::tokio::sync::oneshot::channel::<ChoreoResult<FilePath>>();
    app_handle
        .dialog()
        .file()
        .add_filter("Field JSON", &["json"])
        .set_title("Select the field JSON")
        .pick_file(|file_path| {
            sender
                .send(file_path.ok_or(ChoreoError::FileNotFound(None)))
                .expect("sender for select_field_json failed to send");
        });
    let temp = receiver
        .await
        .unwrap_or(Err(ChoreoError::FileNotFound(None)))?;
    let field_json_path = temp
        .as_path()
        .ok_or(TauriChoreoError::from(ChoreoError::FileNotFound(None)))?;
    let project_location = get_deploy_root(app_handle).await?;
    debug_result!(get_field_json_image(field_json_path, Path::new(&project_location)).await);
}

pub async fn make_field_image_src(field_image_path: &Path) -> ChoreoResult<String> {
    if let Some(extension) = field_image_path
        .extension()
        .and_then(|osstr| osstr.to_str())
    {
        if "svg" == extension {
            tokio::fs::read_to_string(&field_image_path)
                .await
                .map(|svg| {
                    let encoded = urlencoding::encode(&svg).into_owned();
                    format!("data:image/svg+xml;utf8, {encoded}")
                })
                .map_err(|e| ChoreoError::Io(e.to_string()))
        } else {
            match tokio::fs::read(&field_image_path).await {
                Ok(bytes) => {
                    let b64 = general_purpose::STANDARD.encode(&bytes);
                    Ok(format!("data:image/{};base64, {b64}", extension))
                }
                Err(io_error) => Err(ChoreoError::Io(io_error.to_string())),
            }
        }
    } else {
        Err(ChoreoError::FileNotFound(None))
    }
}
pub async fn get_field_json_image(
    field_json_path: &Path,
    project_location: &Path,
) -> ChoreoResult<GetFieldJSONResponse> {
    let field_json_bytes = tokio::fs::read_to_string(field_json_path)
        .await
        .map_err(|io_error| ChoreoError::Io(io_error.to_string()))?;
    let mut field_json: FieldJSON = serde_json::from_str(&field_json_bytes)
        .map_err(|io_error| ChoreoError::Io(io_error.to_string()))?;
    let field_image_name = Path::new(&field_json.field_image)
        .file_name()
        .ok_or(ChoreoError::Io("JSON field-image ends in ..".to_string()))?;

    if let Some(field_image_path) = field_json_path
        .parent()
        .map(|parent| parent.join(field_image_name))
    {
        if let Ok(true) = tokio::fs::try_exists(&field_image_path).await {
            if let Some(extension) = field_image_path
                .extension()
                .and_then(|osstr| osstr.to_str())
                && "svg" != extension
            {
                let dimensions = image::ImageReader::open(&field_image_path)?
                    .into_dimensions()
                    .map_err(|e| ChoreoError::Io(e.to_string()))?;
                field_json.size_pixels = (dimensions.0 as f64, dimensions.1 as f64);
            }
            // field image path exists
            let field_image_base64 = make_field_image_src(&field_image_path).await?;
            if let Some(field_json_relative_path) =
                pathdiff::diff_paths(field_json_path, project_location)
            {
                Ok(GetFieldJSONResponse {
                    field_json_relative_path: field_json_relative_path.to_path_buf(),
                    field_json,
                    field_image_base64,
                })
            } else {
                Err(ChoreoError::FileNotFound(Some(
                    project_location.to_path_buf(),
                )))
            }
        } else {
            Err(ChoreoError::FileNotFound(Some(field_image_path)))
        }
    } else {
        Err(ChoreoError::FileNotFound(None))
    }
}

#[tauri::command]
pub async fn open_project_dialog(app_handle: tauri::AppHandle) -> TauriResult<OpenFilePayload> {
    app_handle
        .dialog()
        .file()
        .set_title("Open a .chor file")
        .add_filter("Choreo Save File", &["chor"])
        .blocking_pick_file()
        .ok_or(ChoreoError::FileNotFound(None))
        .map(|file| match file {
            FilePath::Url(_) => Ok(OpenFilePayload {
                dir: ChoreoError::FileNotFound(None).to_string(),
                name: ChoreoError::FileNotFound(None).to_string(),
            }),
            FilePath::Path(path) => Ok(OpenFilePayload {
                dir: path
                    .parent()
                    .ok_or(ChoreoError::FileNotFound(None))?
                    .to_str()
                    .ok_or(ChoreoError::FileNotFound(None))?
                    .to_string(),
                name: path
                    .file_name()
                    .ok_or(ChoreoError::FileNotFound(None))?
                    .to_str()
                    .ok_or(ChoreoError::FileNotFound(None))?
                    .to_string(),
            }),
        })?
}

#[tauri::command]
pub fn delete_java_file(file_path: String) -> ChoreoResult<()> {
    if !file_path.contains(".java") {
        return Err(ChoreoError::Io(
            "Attempted to delete a non-Java file".to_string(),
        ));
    }
    if let Ok(t) = fs::exists(file_path.clone())
        && !t
    {
        return Ok(());
    }
    fs::remove_file(file_path)?;
    Ok(())
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
pub async fn write_project(app_handle: tauri::AppHandle, project: ProjectFile) -> ChoreoResult<()> {
    let resources = app_handle.state::<WritingResources>();
    file_management::write_projectfile(&resources, project).await
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
pub async fn read_all_trajectory(app_handle: tauri::AppHandle) -> TauriResult<Vec<TrajectoryFile>> {
    let resources = app_handle.state::<WritingResources>();
    let trajectories = file_management::find_all_trajectories(&resources).await;
    let mut out = vec![];
    for trajectory_name in trajectories {
        let trajectory_res =
            file_management::read_trajectory_file(&resources, trajectory_name).await;
        match trajectory_res {
            Ok(trajectory) => out.push(trajectory),
            Err(e) => {
                tracing::error!("{e}");
                // Early terminate if any are too new, and return no trajectories.
                if let ChoreoError::SchemaTooNew(_, _, _) = e {
                    debug_result!(Err(e));
                }
            }
        }
    }
    Ok(out)
}

#[tauri::command]
pub async fn write_trajectory(
    app_handle: tauri::AppHandle,
    trajectory: TrajectoryFile,
) -> ChoreoResult<()> {
    let resources = app_handle.state::<WritingResources>();
    file_management::write_trajectory_file(&resources, &trajectory).await
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
pub async fn trajectory_up_to_date(trajectory: TrajectoryFile) -> bool {
    trajectory.up_to_date()
}

#[tauri::command]
pub async fn config_matches(config_1: RobotConfig<f64>, config_2: RobotConfig<f64>) -> bool {
    config_1 == config_2
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
pub async fn gen_traj_data_file(
    app_handle: tauri::AppHandle,
    project: ProjectFile,
    trajectories: Vec<TrajectoryFile>,
) -> ChoreoResult<()> {
    if let Some(package_name) = java::codegen_package_name(&project)
        && let Some(codegen_root) = project.codegen.get_root()
        && let Ok(deploy_root) = get_deploy_root(app_handle).await
    {
        let file_path = Path::new(&deploy_root)
            .join(codegen_root)
            .join(format!("{TRAJ_DATA_FILENAME}.java"));
        tracing::debug!("Generating java file at {:?}.", file_path);
        let content =
            java::traj_file_contents(trajectories, package_name, project.codegen.use_choreo_lib);
        fs::write(file_path, content)?;
    }
    Ok(())
}

#[tauri::command]
pub async fn gen_vars_file(app_handle: tauri::AppHandle, project: ProjectFile) -> ChoreoResult<()> {
    if let Some(package_name) = java::codegen_package_name(&project)
        && let Some(codegen_root) = project.codegen.get_root()
        && let Ok(deploy_root) = get_deploy_root(app_handle).await
    {
        let file_path = Path::new(&deploy_root)
            .join(codegen_root)
            .join(format!("{VARS_FILENAME}.java"));
        tracing::debug!("Generating java file at {:?}.", file_path);
        let content = java::vars_file_contents(&project, package_name);
        fs::write(file_path, content)?;
    }
    Ok(())
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

#[tauri::command]
pub fn get_worker_count() -> TauriResult<NonZero<usize>> {
    // if this unwrap panics, 4 is equal to 0 and we have bigger problems.
    std::thread::available_parallelism().or(Ok(NonZero::new(4).unwrap()))
}
