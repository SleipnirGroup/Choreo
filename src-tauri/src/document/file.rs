use std::{path::PathBuf, sync::Arc, thread};

use dashmap::DashMap;
use tokio::{
    fs,
    sync::{
        mpsc::{unbounded_channel, UnboundedSender},
        Mutex, Notify,
    },
};

use crate::{
    document::{spawn_writer_task, write_serializable},
    error::ChoreoError,
    ChoreoResult, ResultExt,
};

use super::types::{Project, Traj};

type TrajWriterPool = Arc<DashMap<String, UnboundedSender<Traj>>>;
type DeployPath = Arc<Mutex<PathBuf>>;

/// A name of a trajectory without the file extension.
type TrajName = String;

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
        self.project
            .lock()
            .await
            .take()
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
                        write_serializable(proj, &path).await.trace_err();
                        tracing::debug!("Wrote project to {:?}", path);
                    }
                });
        });
        out
    }

    pub fn delegate_to_app(&self, app_handle: &tauri::AppHandle) {
        tauri::Manager::manage(app_handle, self.clone());
    }

    pub async fn get_deploy_path(&self) -> ChoreoResult<PathBuf> {
        let val = self.root.lock().await;
        if val.as_os_str().is_empty() {
            Err(ChoreoError::NoDeployPath)
        } else {
            Ok(val.clone())
        }
    }
}

pub async fn set_deploy_path(resources: &WritingResources, path: PathBuf) {
    tracing::debug!("Setting deploy path to {:?}", path);
    let mut root = resources.root.lock().await;
    *root = path;
}

#[allow(clippy::unused_async)]
pub async fn write_traj(resources: &WritingResources, traj: Traj) {
    let file = resources
        .root
        .lock()
        .await
        .join(&traj.name)
        .with_extension("traj");
    tracing::debug!("Writing traj {:} to {:}", traj.name, file.display());

    resources
        .traj_pool
        .entry(traj.name.clone())
        .or_insert_with(|| {
            let (sender, receiver) = unbounded_channel();
            spawn_writer_task(PathBuf::from(&file), receiver);
            sender
        })
        .send(traj)
        .trace_err();
}

/// Read a trajectory from a file.
///
/// The name should not include the file extension.
pub async fn read_traj(resources: &WritingResources, name: TrajName) -> ChoreoResult<Traj> {
    let path = resources
        .root
        .lock()
        .await
        .join(&name)
        .with_extension("traj");
    let contents = fs::read_to_string(&path).await?;
    let mut traj = Traj::from_content(&contents)?;
    traj.name = name;
    Ok(traj)
}

pub async fn rename_traj(
    resources: &WritingResources,
    mut old: Traj,
    new_name: TrajName,
) -> ChoreoResult<Traj> {
    let root_path = resources.get_deploy_path().await?;
    let old_path = root_path.join(&old.name).with_extension("traj");
    let new_path = root_path.join(&new_name).with_extension("traj");

    if !old_path.exists() || resources.traj_pool.remove(&old.name).is_none() {
        return Err(ChoreoError::FileNotFound(Some(old_path)));
    }

    if new_path.exists() {
        return Err(ChoreoError::FileSave("Trajectory already exists"));
    }

    let old_name = old.name.clone();
    old.name.clone_from(&new_name);

    fs::remove_file(&old_path).await?;

    write_traj(resources, old.clone()).await;

    tracing::debug!(
        "Renamed trajectory {old_name}.traj to {new_name}.traj at {:}",
        resources.get_deploy_path().await?.display()
    );

    Ok(old)
}

pub async fn delete_traj(resources: &WritingResources, traj: Traj) -> ChoreoResult<()> {
    let root_path = resources.get_deploy_path().await?;
    let path = root_path.join(&traj.name).with_extension("traj");
    if !path.exists() || resources.traj_pool.remove(&traj.name).is_none() {
        return Err(ChoreoError::FileNotFound(Some(path)));
    }
    fs::remove_file(&path).await?;

    tracing::debug!(
        "Deleted trajectory {:}.traj at {:}",
        traj.name,
        resources.get_deploy_path().await?.display()
    );

    Ok(())
}

pub async fn write_project(resources: &WritingResources, chor: Project) {
    tracing::debug!(
        "Writing project {:} to {:}",
        chor.name,
        resources
            .root
            .lock()
            .await
            .join(&chor.name)
            .with_extension("chor")
            .display()
    );
    resources.project.update(chor).await;
}

pub async fn read_project(resources: &WritingResources, name: String) -> ChoreoResult<Project> {
    let path = resources
        .root
        .lock()
        .await
        .join(&name)
        .with_extension("chor");
    let contents = fs::read_to_string(&path).await?;
    let mut chor = Project::from_content(&contents)?;
    chor.name = name;
    Ok(chor)
}

/// Find all traj files in the deploy directory.
pub async fn find_all_traj(resources: &WritingResources) -> Vec<String> {
    let deploy_dir = resources.root.lock().await.clone();
    let mut out = vec![];
    if let Ok(mut dir) = fs::read_dir(&deploy_dir).await {
        while let Ok(Some(entry)) = dir.next_entry().await {
            let path = entry.path();
            if let Some(extension) = path.extension() {
                if extension.eq_ignore_ascii_case("traj") {
                    if let Some(p) = path.file_stem().map(|p| p.to_string_lossy()) {
                        out.push(p.to_string());
                    }
                }
            }
        }
    }
    tracing::debug!(
        "Found {:} traj files in {:}",
        out.len(),
        deploy_dir.display()
    );
    out
}
