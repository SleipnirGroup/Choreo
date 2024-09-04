use std::{
    mem::forget,
    path::PathBuf,
    sync::{mpsc, Arc},
    thread,
};

use dashmap::DashMap;
use futures_util::{FutureExt, TryStreamExt};
use ipc_channel::ipc::{self, IpcSender};
use std::fs;
use tokio::{
    io::AsyncReadExt,
    process::Command,
    select,
    sync::{oneshot, Notify},
};

use crate::{
    generation::generate::{generate, LocalProgressUpdate},
    spec::{
        project::ProjectFile,
        traj::{Sample, TrajFile, Trajectory},
    },
    ChoreoError, ChoreoResult, ResultExt,
};

use super::generate::{setup_progress_sender, HandledLocalProgressUpdate, PROGRESS_SENDER_LOCK};

#[derive(Clone)]
#[allow(missing_debug_implementations)]
pub struct RemoteGenerationResources {
    frontend_emitter: Option<mpsc::Sender<HandledLocalProgressUpdate>>,
    kill_map: Arc<DashMap<i64, oneshot::Sender<()>>>,
}

impl RemoteGenerationResources {
    /**
     * Should be called after [`setup_progress_sender`] to ensure that the sender is initialized.
     */
    #[allow(clippy::new_without_default)]
    pub fn new() -> Self {
        Self {
            frontend_emitter: PROGRESS_SENDER_LOCK.get().cloned(),
            kill_map: Arc::new(DashMap::new()),
        }
    }

    pub fn add_killer(&self, handle: i64, sender: oneshot::Sender<()>) {
        self.kill_map.insert(handle, sender);
    }

    pub fn kill(&self, handle: i64) -> ChoreoResult<()> {
        self.kill_map
            .remove(&handle)
            .ok_or(ChoreoError::out_of_bounds("Handle", "not found"))
            .map(|(_, sender)| {
                let _ = sender.send(());
            })
    }

    pub fn kill_all(&self) {
        let handles = self.kill_map.iter().map(|r| *r.key()).collect::<Vec<i64>>();
        for handle in handles {
            let _ = self.kill(handle);
        }
    }

    pub fn emit_progress(&self, update: HandledLocalProgressUpdate) {
        if let Some(emitter) = &self.frontend_emitter {
            emitter.send(update).trace_warn();
        }
    }
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct RemoteArgs {
    pub project: PathBuf,
    pub traj: PathBuf,
    pub ipc: String,
}

impl RemoteArgs {
    pub fn from_content(s: &str) -> ChoreoResult<Self> {
        serde_json::from_str(s).map_err(ChoreoError::remote)
    }
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub enum RemoteProgressUpdate {
    // Swerve variant
    IncompleteSwerveTraj(Vec<Sample>),
    // Diff variant
    IncompleteTankTraj(Vec<Sample>),
    CompleteTraj(Trajectory),
    Error(ChoreoError),
}

pub fn remote_generate_child(args: RemoteArgs) {
    let rx = setup_progress_sender();
    let ipc =
        IpcSender::<String>::connect(args.ipc.clone()).expect("Failed to deserialize IPC handle");
    let cln_ipc: IpcSender<String> = ipc.clone();
    thread::Builder::new()
        .name("choreo-cli-progressupdater".to_string())
        .spawn(move || {
            for received in rx {
                let ser_string = match received {
                    HandledLocalProgressUpdate {
                        update: LocalProgressUpdate::SwerveTraj { update },
                        ..
                    } => serde_json::to_string(&RemoteProgressUpdate::IncompleteSwerveTraj(update)),
                    HandledLocalProgressUpdate {
                        update: LocalProgressUpdate::DiffTraj { update },
                        ..
                    } => serde_json::to_string(&RemoteProgressUpdate::IncompleteTankTraj(update)),
                    _ => continue,
                }
                .expect("Failed to serialize progress update");
                cln_ipc
                    .send(ser_string)
                    .expect("Failed to send progress update");
            }
        })
        .expect("Failed to spawn thread");

    fn read_files(args: &RemoteArgs) -> ChoreoResult<(ProjectFile, TrajFile)> {
        let project = ProjectFile::from_content(&fs::read_to_string(&args.project)?)?;
        let traj = TrajFile::from_content(&fs::read_to_string(&args.traj)?)?;
        fs::remove_file(&args.project)?;
        fs::remove_file(&args.traj)?;

        Ok((project, traj))
    }

    let (project, traj) = match read_files(&args) {
        Ok((project, traj)) => (project, traj),
        Err(e) => {
            let ser_string = serde_json::to_string(&RemoteProgressUpdate::Error(e))
                .expect("Failed to serialize progress update");
            ipc.send(ser_string)
                .expect("Failed to send progress update");
            return;
        }
    };

    println!(
        "Generating trajectory {:} for {:} remotely",
        traj.name, project.name
    );

    match generate(project, traj, 0i64) {
        Ok(traj) => {
            let ser_string = serde_json::to_string(&RemoteProgressUpdate::CompleteTraj(traj.traj))
                .expect("Failed to serialize progress update");
            ipc.send(ser_string)
                .expect("Failed to send progress update");
        }
        Err(e) => {
            tracing::warn!("Failed to generate trajectory {:}", e);
            let ser_string = serde_json::to_string(&RemoteProgressUpdate::Error(e))
                .expect("Failed to serialize progress update");
            ipc.send(ser_string)
                .expect("Failed to send progress update");
        }
    }
}

pub async fn remote_generate_parent(
    remote_resources: &RemoteGenerationResources,
    project: ProjectFile,
    trajfile: TrajFile,
    handle: i64,
) -> ChoreoResult<TrajFile> {
    tracing::info!("Generating remote trajectory {}", trajfile.name);

    // create temp file for project and traj
    let mut builder = tempfile::Builder::new();
    builder.prefix("choreo-remote-").rand_bytes(5);

    let project_tmp = builder.suffix("project").tempfile()?;
    let traj_tmp = builder.suffix("traj").tempfile()?;

    tracing::debug!("Created temp files for remote generation");

    // write project and traj to temp files
    let project_str = serde_json::to_string(&project).map_err(ChoreoError::remote)?;
    let traj_str = serde_json::to_string(&trajfile).map_err(ChoreoError::remote)?;

    tokio::fs::write(project_tmp.path(), project_str).await?;
    tokio::fs::write(traj_tmp.path(), traj_str).await?;

    tracing::debug!("Wrote project and traj to temp files");

    let (server, server_name) =
        ipc::IpcOneShotServer::<String>::new().map_err(ChoreoError::remote)?;

    let remote_args = RemoteArgs {
        project: project_tmp.path().to_path_buf(),
        traj: traj_tmp.path().to_path_buf(),
        ipc: server_name,
    };

    forget(project_tmp);
    forget(traj_tmp);

    let mut child = Command::new(std::env::current_exe()?)
        .arg(serde_json::to_string(&remote_args)?)
        .stdout(std::process::Stdio::piped())
        .spawn()?;

    tracing::debug!("Spawned remote generator");

    let (rx, o) = server.accept().map_err(ChoreoError::remote)?;

    // check if the solver has already completed
    match serde_json::from_str::<RemoteProgressUpdate>(&o) {
        Ok(RemoteProgressUpdate::CompleteTraj(traj)) => {
            tracing::debug!("Remote generator completed (early return)");
            return Ok(TrajFile {
                traj,
                snapshot: Some(trajfile.params.snapshot()),
                ..trajfile
            });
        }
        Ok(RemoteProgressUpdate::Error(e)) => {
            return Err(ChoreoError::remote(e));
        }
        Err(e) => {
            return Err(ChoreoError::remote(ChoreoError::Json(format!(
                "Error parsing solver update: {e:?}"
            ))));
        }
        _ => {}
    }

    let (killer, victim) = oneshot::channel::<()>();
    remote_resources.add_killer(handle, killer);
    let mut victim = victim.into_stream();

    let mut stream = rx.to_stream();

    let tee_killswitch = Arc::new(Notify::new());

    let stdout = child.stdout.take().expect("Didn't capture stdout");

    let cln_remote_resources = remote_resources.clone();
    let cln_tee_killswitch = tee_killswitch.clone();
    let tee_handle = tokio::spawn(async move {
        let mut buffer = Vec::with_capacity(128);
        let mut stdout = stdout;
        let tee_killswitch = cln_tee_killswitch;
        let remote_resources = cln_remote_resources;

        loop {
            select! {
                byte_res = stdout.read_u8() => {
                    if let Ok(byte) = byte_res {
                        if byte as char == '\n' {
                            let string = unsafe { String::from_utf8_unchecked(std::mem::take(&mut buffer))};
                            println!{"{string}"}
                            remote_resources.emit_progress(
                                LocalProgressUpdate::DiagnosticText {
                                    update: string,
                                }.handled(handle)
                            );
                        } else {
                            buffer.push(byte);
                        }
                    }
                },
                _ = tee_killswitch.notified() => {
                    break;
                }
            }
        }
        while let Ok(byte) = stdout.read_u8().await {
            buffer.push(byte)
        }
        if !buffer.is_empty() {
            let string = unsafe { String::from_utf8_unchecked(std::mem::take(&mut buffer)) };
            let lines: Vec<String> = string.split('\n').map(ToString::to_string).collect();
            for line in lines {
                println! {"{line}"}
                remote_resources.emit_progress(
                    LocalProgressUpdate::DiagnosticText { update: line }.handled(handle),
                );
            }
        }
    });

    let out: ChoreoResult<TrajFile> = loop {
        select! {
            update_res = stream.try_next() => {
                match update_res {
                    Ok(Some(update_string)) => {
                        match serde_json::from_str(&update_string) {
                            Ok(RemoteProgressUpdate::IncompleteSwerveTraj(traj)) => {
                                remote_resources.emit_progress(
                                    LocalProgressUpdate::SwerveTraj {
                                        update: traj
                                    }.handled(handle)
                                );
                            },
                            Ok(RemoteProgressUpdate::IncompleteTankTraj(traj)) => {
                                remote_resources.emit_progress(
                                    LocalProgressUpdate::DiffTraj {
                                        update: traj
                                    }.handled(handle)
                                );
                            },
                            Ok(RemoteProgressUpdate::CompleteTraj(traj)) => {
                                break Ok(
                                    TrajFile {
                                        traj,
                                        snapshot: Some(trajfile.params.snapshot()),
                                        .. trajfile
                                    }
                                );
                            },
                            Ok(RemoteProgressUpdate::Error(e)) => {
                                break Err(ChoreoError::remote(e));
                            },
                            Err(e) => {
                                break Err(ChoreoError::remote(
                                    ChoreoError::Json(format!("Error parsing solver update: {e:?}"))
                                ));
                            }
                        }
                    },
                    Ok(None) => {
                        break Err(ChoreoError::remote(
                            ChoreoError::Subprocess("Solver exited without sending a result (close)".to_string())
                        ));
                    },
                    Err(e) => {
                        break Err(ChoreoError::remote(e));
                    },
                }
            },
            _ = child.wait() => {
                break Err(ChoreoError::remote(
                    ChoreoError::Subprocess("Solver exited without sending a result (death)".to_string())
                ));
            },
            _ = victim.try_next() => {
                child.kill().await?;
                break Err(ChoreoError::remote(
                    ChoreoError::Subprocess("Solver canceled".to_string())
                ));
            }
        }
    };

    tee_killswitch.notify_one();
    let _ = tee_handle.await;

    out
}
