use std::{
    path::{Path, PathBuf},
    sync::Arc,
    thread,
};

use serde::Serialize;
use tokio::{
    fs,
    sync::{
        mpsc::{unbounded_channel, UnboundedReceiver, UnboundedSender},
        Mutex, Notify,
    },
};

use crate::{ChoreoError, ChoreoResult, ResultExt};

use dashmap::DashMap;

use crate::spec::{project::ProjectFile, traj::TrajFile};

type TrajFileWriterPool = Arc<DashMap<String, UnboundedSender<TrajFile>>>;
type DeployPath = Arc<Mutex<PathBuf>>;

/// A name of a trajectory without the file extension.
type TrajFileName = String;

mod formatter;

async fn write_serializable<T: Serialize + Send>(contents: T, file: &Path) -> ChoreoResult<()> {
    let json = formatter::to_string_pretty(&contents)?;
    let parent = file
        .parent()
        .ok_or_else(|| ChoreoError::FileWrite(file.to_path_buf()))?;
    fs::create_dir_all(parent).await?;
    fs::write(file, json).await?;
    Ok(())
}

#[allow(unused_results)]
fn spawn_writer_task<T: Serialize + Send + Sync + 'static>(
    file: PathBuf,
    mut receiver: UnboundedReceiver<T>,
) {
    tokio::spawn(async move {
        while let Some(mut contents) = receiver.recv().await {
            write_serializable(&mut contents, &file).await?;
        }
        Ok::<(), ChoreoError>(())
    });
}

#[allow(missing_debug_implementations)]
pub struct ProjectUpdater {
    project: Mutex<Option<ProjectFile>>,
    notifier: Notify,
}

impl ProjectUpdater {
    #[must_use]
    pub fn new() -> Self {
        Self {
            project: Mutex::new(None),
            notifier: Notify::new(),
        }
    }

    pub async fn update(&self, project: ProjectFile) {
        let mut lock = self.project.lock().await;
        *lock = Some(project);
        self.notifier.notify_one();
    }

    pub async fn wait_for(&self) -> ProjectFile {
        self.notifier.notified().await;
        self.project
            .lock()
            .await
            .take()
            .expect("Project should be updated before waiting for it")
    }
}

impl Default for ProjectUpdater {
    fn default() -> Self {
        Self::new()
    }
}

/// A collection of resources for writing to files.
///
/// All members support interior mutability.
#[allow(missing_debug_implementations)]
#[derive(Clone)]
pub struct WritingResources {
    /// The project writer.
    pub project: Arc<ProjectUpdater>,
    pub trajfile_pool: TrajFileWriterPool,
    pub root: DeployPath,
}

impl WritingResources {
    /// Create a new `WritingResources`,
    /// this will spawn a new thread to write projects that are updated.
    ///
    /// # Panics
    /// If the project writer thread could not be spawned.
    #[must_use]
    #[allow(clippy::new_without_default)]
    pub fn new() -> Self {
        let out = Self {
            project: Arc::new(ProjectUpdater::new()),
            trajfile_pool: Arc::new(DashMap::new()),
            root: Arc::new(Mutex::new(PathBuf::new())),
        };
        let root = out.root.clone();
        let project_updater = out.project.clone();
        thread::Builder::new()
            .name("Project Writer".to_string())
            .spawn(move || {
                tokio::runtime::Builder::new_current_thread()
                    .enable_all()
                    .build()
                    .expect("Failed to build tokio runtime")
                    .block_on(async move {
                        loop {
                            let proj = project_updater.wait_for().await;
                            let root = root.lock().await;
                            let path = root.join(&proj.name).with_extension("chor");
                            write_serializable(proj, &path).await.trace_err();
                            tracing::debug!("Wrote project to {:?}", path);
                        }
                    });
            })
            .expect("Failed to spawn project writer thread");
        out
    }

    /// Get the deploy path.
    ///
    /// # Errors
    /// - [`crate::ChoreoError::NoDeployPath`] if the deploy path is not set.
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

pub async fn write_trajfile(resources: &WritingResources, trajfile: TrajFile) {
    let file = resources
        .root
        .lock()
        .await
        .join(&trajfile.name)
        .with_extension(TrajFile::EXTENSION);

    tracing::debug!("Writing path {:} to {:}", trajfile.name, file.display());

    resources
        .trajfile_pool
        .entry(trajfile.name.clone())
        .or_insert_with(|| {
            let (sender, receiver) = unbounded_channel();
            spawn_writer_task(PathBuf::from(&file), receiver);
            sender
        })
        .send(trajfile)
        .trace_err();
}

pub async fn write_trajfile_immediately(resources: &WritingResources, trajfile: TrajFile) -> ChoreoResult<()> {
    let file = resources
        .get_deploy_path()
        .await?
        .join(&trajfile.name)
        .with_extension(TrajFile::EXTENSION);

    tracing::debug!("Writing path {:} to {:} immediately", trajfile.name, file.display());

    write_serializable(trajfile, &file).await
}

/// Read a trajectory from a file.
///
/// The name should not include the file extension.
pub async fn read_trajfile(
    resources: &WritingResources,
    name: TrajFileName,
) -> ChoreoResult<TrajFile> {
    let path = resources
        .root
        .lock()
        .await
        .join(&name)
        .with_extension(TrajFile::EXTENSION);
    let contents = fs::read_to_string(&path).await?;
    let mut path = TrajFile::from_content(&contents)?;
    // this will keep the name of the `Path` in sync with the file name
    path.name = name;
    Ok(path)
}

pub async fn delete_trajfile(resources: &WritingResources, trajfile: TrajFile) -> ChoreoResult<()> {
    tracing::debug!("Deleting trajectory {}", trajfile.name);

    let root_path = resources.get_deploy_path().await?;
    let path = root_path.join(&trajfile.name).with_extension("traj");
    if !path.exists() {
        return Err(ChoreoError::FileNotFound(Some(path)));
    }

    let _ = resources.trajfile_pool.remove(&trajfile.name);
    fs::remove_file(&path).await?;

    tracing::info!(
        "Deleted trajectory {:}.traj at {:}",
        trajfile.name,
        resources.get_deploy_path().await?.display()
    );

    Ok(())
}

pub async fn rename_trajfile(
    resources: &WritingResources,
    mut old_trajfile: TrajFile,
    new_name: TrajFileName,
) -> ChoreoResult<TrajFile> {
    tracing::debug!(
        "Renaming trajectory {old_name}.traj to {new_name}.traj",
        old_name = old_trajfile.name,
        new_name = new_name
    );

    let root_path = resources.get_deploy_path().await?;
    let old_path = root_path.join(&old_trajfile.name).with_extension("traj");

    if !old_path.exists() {
        return Err(ChoreoError::FileNotFound(Some(old_path)));
    }

    delete_trajfile(resources, old_trajfile.clone()).await?;

    let old_name = old_trajfile.name.clone();
    old_trajfile.name.clone_from(&new_name);

    write_trajfile(resources, old_trajfile.clone()).await;

    tracing::info!(
        "Renamed trajectory {old_name}.traj to {new_name}.traj at {:}",
        resources.get_deploy_path().await?.display()
    );

    Ok(old_trajfile)
}

pub async fn write_projectfile(resources: &WritingResources, project: ProjectFile) {
    tracing::debug!(
        "Writing project {:} to {:}",
        project.name,
        resources
            .root
            .lock()
            .await
            .join(&project.name)
            .with_extension("chor")
            .display()
    );
    resources.project.update(project).await;
}

pub async fn read_projectfile(
    resources: &WritingResources,
    name: String,
) -> ChoreoResult<ProjectFile> {
    tracing::info!(
        "Opening project {name}.chor at {:}",
        resources.get_deploy_path().await?.display()
    );

    let path = resources
        .root
        .lock()
        .await
        .join(&name)
        .with_extension("chor");
    let contents = fs::read_to_string(&path).await?;
    let mut project = ProjectFile::from_content(&contents)?;
    project.name = name;
    Ok(project)
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
