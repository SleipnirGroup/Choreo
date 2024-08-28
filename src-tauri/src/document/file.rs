use std::{
    collections::HashMap, f64::consts::PI, path::{Path, PathBuf}, sync::Arc, thread
};

use dashmap::DashMap;
use serde::{Deserialize, Serialize};
use tokio::{
    fs,
    sync::{mpsc::{unbounded_channel, UnboundedReceiver, UnboundedSender}, Mutex, Notify},
};

use crate::{error::ChoreoError, ChoreoResult, ResultExt};

use super::types::{Bumper, Expr, Module, Project, RobotConfig, Traj, Variables};

type TrajWriterPool = Arc<DashMap<String, UnboundedSender<Traj>>>;
type DeployPath = Arc<Mutex<PathBuf>>;

pub struct ProjectUpdate {
    project: Mutex<Option<Project>>,
    notifier: Notify,
}

impl ProjectUpdate {
    pub fn new() -> Self {
        Self {
            project: Mutex::new(None),
            notifier: Notify::new(),
        }
    }

    pub async fn update(&self, project: Project) {
        let mut lock = self.project.lock().await;
        *lock = Some(project);
        self.notifier.notify_one();
    }

    pub async fn wait_for(&self) -> Project {
        self.notifier.notified().await;
        self.project.lock().await.take()
            .expect("Project should be updated before waiting for it")
    }
}

/// A collection of resources for writing to files.
/// 
/// All members support interior mutability.
#[derive(Clone)]
pub struct WritingResources {
    /// The project writer.
    pub project: Arc<ProjectUpdate>,
    pub traj_pool: TrajWriterPool,
    pub root: DeployPath,
}

impl WritingResources {
    pub fn new() -> Self {
        let out = Self {
            project: Arc::new(ProjectUpdate::new()),
            traj_pool: Arc::new(DashMap::new()),
            root: Arc::new(Mutex::new(PathBuf::new())),
        };
        let root = out.root.clone();
        let project_updater = out.project.clone();
        thread::spawn(move || {
            tokio::runtime::Builder::new_current_thread()
                .enable_all()
                .build()
                .expect("Failed to build tokio runtime")
                .block_on(async move {
                    loop {
                        let proj = project_updater.wait_for().await;
                        let root = root.lock().await;
                        let path = root.join(&proj.name);
                        handle_write(proj, &path).await
                            .trace_err();
                        tracing::debug!("Wrote project to {:?}", path);
                    }
                });
        });
        out
    }

    pub fn delegate_to_app(&self, app_handle: &tauri::AppHandle) {
        tauri::Manager::manage(app_handle, self.clone());
    }
}

#[derive(Serialize, Deserialize, Clone)]
struct OpenFileEventPayload<'a> {
    dir: Option<&'a str>,
    name: Option<&'a str>,
    contents: Project,
}

#[derive(Serialize, Deserialize, Clone)]
struct OpenTrajEventPayload<'a> {
    name: Option<&'a str>,
    contents: Traj,
}

#[allow(clippy::unused_async)]
pub async fn write_traj(
    resources: &WritingResources,
    traj: Traj,
) {
    let file = resources.root.lock().await.join(&traj.name).with_extension("traj");
    tracing::debug!("Writing traj {:} to {:}", traj.name, file.display());
    let entry = resources
        .traj_pool
        .entry(file.to_string_lossy().to_string());
    let sender = entry.or_insert_with(|| {
        let (sender, receiver) = unbounded_channel();
        spawn_writer_task(PathBuf::from(&file), receiver);
        sender
    });
    sender
        .send(traj)
        .trace_err();
}

pub async fn write_project(resources: &WritingResources, chor: Project) {
    tracing::debug!(
        "Writing project {:} to {:}",
        chor.name,
        resources.root.lock().await.join(&chor.name).with_extension("chor").display()
    );
    resources.project.update(chor).await;
}

pub async fn set_deploy_path(
    resources: &WritingResources,
    path: PathBuf,
) {
    tracing::info!("Setting deploy path to {:?}", path);
    let mut root = resources.root.lock().await;
    *root = path;
}

async fn handle_write<T: Serialize + Send>(contents: T, file: &Path) -> ChoreoResult<()> {
    let json = super::formatter::to_string_pretty(&contents)?;
    let parent = file.parent()
        .ok_or_else(|| ChoreoError::FileWrite(file.to_path_buf()))?;
    fs::create_dir_all(parent).await?;
    fs::write(file, json).await?;
    Ok(())
}

#[allow(unused_results)]
pub fn spawn_writer_task<T: Serialize + Send + Sync + 'static>(
    file: PathBuf,
    mut traj_receiver: UnboundedReceiver<T>,
) {
    tokio::spawn(async move {
        while let Some(mut contents) = traj_receiver.recv().await {
            handle_write(&mut contents, &file).await?;
        }
        Ok::<(), ChoreoError>(())
    });
}

// async fn send_open_chor_event(
//     app_handle: tauri::AppHandle,
//     chor: Project,
//     dir: &str,
//     name: &str,
// ) -> Result<(), tauri::Error> {
//     app_handle.emit_all(
//         "open-file",
//         OpenFileEventPayload {
//             dir: Some(dir),
//             name: Some(name),
//             contents: chor,
//         },
//     )
// }

// async fn send_open_traj_event(
//     app_handle: tauri::AppHandle,
//     traj: Traj,
//     name: &str,
// ) -> Result<(), tauri::Error> {
//     app_handle.emit_all(
//         "open-traj",
//         OpenTrajEventPayload {
//             name: Some(name),
//             contents: traj,
//         },
//     )
// }

pub fn default_project(name: String) -> Project {
    Project {
        name,
        version: "v2025.0.0".to_string(),
        variables: Variables {
            expressions: HashMap::new(),
            poses: HashMap::new(),
        },
        config: RobotConfig {
            gearing: Expr::new("6.5", 6.5),
            radius: Expr::new("2 in", 0.0508),
            vmax: Expr::new("6000.0 RPM", 6000.0 * 2.0 * PI / 60.0),
            tmax: Expr::new("1.2 N*m", 1.2),
            modules: [
                Module {
                    x: Expr::new("11 in", 0.2794),
                    y: Expr::new("11 in", 0.2794),
                },
                Module {
                    x: Expr::new("-11 in", -0.2794),
                    y: Expr::new("11 in", 0.2794),
                },
                Module {
                    x: Expr::new("-11 in", -0.2794),
                    y: Expr::new("-11 in", -0.2794),
                },
                Module {
                    x: Expr::new("11 in", 0.2794),
                    y: Expr::new("-11 in", -0.2794),
                },
            ],
            mass: Expr::new("150 lbs", 68.038_855_5),
            inertia: Expr::new("6 kg m^2", 6.0),
            bumper: Bumper {
                front: Expr::new("16 in", 0.4064),
                left: Expr::new("16 in", 0.4064),
                back: Expr::new("16 in", 0.4064),
                right: Expr::new("16 in", 0.4064),
            },
        },
    }
}

pub async fn find_all_traj(resources: &WritingResources) -> Vec<String> {
    let deploy_dir = resources.root.lock().await.clone();
    let mut out = vec![];
    if let Ok(mut dir) = fs::read_dir(&deploy_dir).await {
        while let Ok(Some(entry)) = dir.next_entry().await {
            let path = entry.path();
            if let Some(extension) = path.extension() {
                if extension.eq_ignore_ascii_case("traj") {
                    if let Some(path) = path.file_name().map(|p| p.to_string_lossy().to_string()) {
                        out.push(path);
                    }
                }
            }
        }
    }
    tracing::debug!("Found {:} traj files in {:}", out.len(), deploy_dir.display());
    out
}
