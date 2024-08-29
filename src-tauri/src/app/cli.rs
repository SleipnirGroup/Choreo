#![allow(dead_code)]
use std::{path::PathBuf, process::exit, thread};

use clap::Parser;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use ipc_channel::ipc::{self, IpcSender};

use super::tauri::run_tauri;
use crate::{document::{
    file::{self, WritingResources},
    generate::{generate, setup_progress_sender, RemoteProgressUpdate}, types::Traj,
}, ChoreoResult};

const FORMATING_OPTIONS: &str = "Formating Options";
const FILE_OPTIONS: &str = "File Options";
const ADVANCED_OPTIONS: &str = "Advanced Options";
const ACTION_OPTIONS: &str = "Action Options";

#[derive(Debug)]
enum CliAction {
    Generate(PathBuf, Vec<String>, Option<IpcSender<RemoteProgressUpdate>>),
    Gui,
    GuiWithProject(PathBuf),
    Error(String),
}

impl CliAction {
    #[allow(clippy::match_wildcard_for_single_variants)]
    fn enable_tracing(&self) {
        match self {
            Self::Gui | Self::GuiWithProject(_) => {
                tracing_subscriber::registry()
                    .with(
                        tracing_subscriber::fmt::layer()
                            .event_format(super::logging::CompactFormatter),
                    )
                    .init();
            }
            _ => tracing_subscriber::fmt()
                .with_max_level(tracing::Level::INFO)
                .init(),
        }
    }
}

#[derive(Parser)]
#[clap(
    version = "0.1",
    author = "Choreo Contributors",
    about = "Choreo CLI",
    bin_name = "Choreo"
)]
pub struct Cli {
    #[arg(
        long,
        value_name = "path/to/myproject.chor",
        help_heading = FILE_OPTIONS
    )]
    pub chor: Option<PathBuf>,

    #[arg(
        long,
        value_name = "trajName1,trajName2",
        help_heading = FILE_OPTIONS,
        value_delimiter = ',',
        conflicts_with = "all_traj",
        help = "Adds trajectories to be used by cli actions"
    )]
    pub traj: Vec<String>,

    #[arg(
        long,
        help_heading = FILE_OPTIONS,
        conflicts_with = "traj",
        help = "The same as doing --traj for all trajectories in the project"
    )]
    pub all_traj: bool,

    #[arg(
        long,
        short,
        requires = "chor",
        help_heading = ACTION_OPTIONS,
        help = "Generate the provided trajectories for the project"
    )]
    pub generate: bool,

    #[arg(
        long,
        short,
        help_heading = ADVANCED_OPTIONS,
        help = "Free the process to run in another process and return immediately"
    )]
    pub free: bool,

    #[arg(
        long,
        help_heading = ADVANCED_OPTIONS,
        help = "A serialized IPC handle to the parent process",
    )]
    pub ipc: Option<String>,
}

impl Cli {
    fn action(self) -> CliAction {
        if self.generate {
            if let Some(project_path) = self.chor {
                if self.traj.is_empty() {
                    return CliAction::Error(
                        "Trajectories must be provided for generation.".to_string(),
                    );
                }
                let ipc = if let Some(ipc) = self.ipc {
                    if self.traj.len() > 1 || self.all_traj {
                        return CliAction::Error(
                            "IPC handle can only be used with a single trajectory.".to_string(),
                        );
                    }
                    let tx = ipc::IpcSender::<RemoteProgressUpdate>::connect(ipc)
                        .expect("Failed to deserialize IPC handle");

                    Some(tx)
                } else {
                    None
                };
                return CliAction::Generate(project_path, self.traj, ipc);
            }
            CliAction::Error("Choreo file must be provided for generation.".to_string())
        } else if let Some(project_path) = self.chor {
            CliAction::GuiWithProject(project_path)
        } else {
            CliAction::Gui
        }
    }

    pub fn exec(self) {
        let resources = WritingResources::new();

        let action = self.action();

        action.enable_tracing();

        match action {
            CliAction::Generate(project_path, traj_names, ipc_opt) => {
                tracing::info!("CLIAction is Generate");
                if let Some(ipc) = ipc_opt {
                    let rx = setup_progress_sender();
                    let cln_ipc = ipc.clone();
                    thread::Builder::new()
                        .name("choreo-cli-progressupdater".to_string())
                        .spawn(move || {
                            for received in rx {
                                cln_ipc.send(RemoteProgressUpdate::IncompleteTraj(received.traj))
                                    .expect("Failed to send progress update");
                            }
                        })
                        .expect("Failed to spawn thread");

                    let res = tokio::runtime::Builder::new_current_thread()
                        .enable_all()
                        .build()
                        .expect("Failed to build tokio runtime")
                        .block_on(
                            Self::generate_single_traj(
                                resources,
                                project_path,
                                traj_names.first()
                                    .expect("Traj names should have at least one element")
                                    .to_string(),
                        ));

                    match res {
                        Ok(traj) => {
                            ipc.send(RemoteProgressUpdate::CompleteTraj(traj))
                                .expect("Failed to send progress update");
                        },
                        Err(e) => {
                            ipc.send(RemoteProgressUpdate::Error(e.to_string()))
                                .expect("Failed to send progress update");
                        }
                    }
                } else {
                    tokio::runtime::Builder::new_current_thread()
                        .enable_all()
                        .build()
                        .expect("Failed to build tokio runtime")
                        .block_on(Self::generate_trajs(resources, project_path, traj_names));
                }
            }
            CliAction::Gui => {
                tracing::info!("CLIAction is Gui");
                run_tauri(resources, None);
            }
            CliAction::GuiWithProject(project_path) => {
                tracing::info!("CLIAction is GuiWithProject");
                run_tauri(resources, Some(project_path));
            }
            CliAction::Error(e) => {
                tracing::error!("{}", e);
                exit(1);
            }
        }
    }

    #[allow(clippy::cast_possible_wrap)]
    async fn generate_trajs(
        resources: WritingResources,
        project_path: PathBuf,
        traj_names: Vec<String>,
    ) {
        // set the deploy path to the project directory
        file::set_deploy_path(
            &resources,
            project_path
                .parent()
                .expect("project path should have a parent directory")
                .to_path_buf(),
        )
        .await;

        // read the project file
        let project = file::read_project(
            &resources,
            project_path
                .file_stem()
                .expect("project path should have a file name")
                .to_str()
                .expect("project path should be a valid string")
                .to_string(),
        )
        .await
        .expect("Failed to read project file");

        // generate trajectories
        for (i, traj_name) in traj_names.iter().enumerate() {
            tracing::info!("Generating trajectory {:} for {:}", traj_name, project.name);

            let traj = file::read_traj(&resources, traj_name.to_string())
                .await
                .expect("Failed to read trajectory file");

            match generate(&project, traj, i as i64) {
                Ok(new_traj) => {
                    file::write_traj(&resources, new_traj).await;
                }
                Err(e) => {
                    tracing::error!("Failed to generate trajectory {:}: {:}", traj_name, e);
                }
            }
        }
    }

    #[allow(clippy::cast_possible_wrap)]
    async fn generate_single_traj(
        resources: WritingResources,
        project_path: PathBuf,
        traj_name: String,
    ) -> ChoreoResult<Traj> {
        // set the deploy path to the project directory
        file::set_deploy_path(
            &resources,
            project_path
                .parent()
                .expect("project path should have a parent directory")
                .to_path_buf(),
        )
        .await;

        // read the project file
        let project = file::read_project(
            &resources,
            project_path
                .file_stem()
                .expect("project path should have a file name")
                .to_str()
                .expect("project path should be a valid string")
                .to_string(),
        )
        .await
        .expect("Failed to read project file");

        tracing::info!("Generating trajectory {:} for {:}", traj_name, project.name);

        let traj = file::read_traj(&resources, traj_name.to_string())
            .await
            .expect("Failed to read trajectory file");

        match generate(&project, traj, 0i64) {
            Ok(new_traj) => {
                file::write_traj(&resources, new_traj.clone()).await;
                Ok(new_traj)
            }
            Err(e) => {
                tracing::error!("Failed to generate trajectory {:}: {:}", traj_name, e);
                Err(e)
            }
        }
    }
}
