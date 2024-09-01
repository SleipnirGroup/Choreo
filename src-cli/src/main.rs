#![allow(dead_code)]
use std::{path::PathBuf, process::exit, thread};

use clap::Parser;
use ipc_channel::ipc::IpcSender;
use serde::{Deserialize, Serialize};
use tokio::fs;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use super::tauri::run_tauri;
use crate::{
    document::{
        file::{self, WritingResources},
        generate::{generate, setup_progress_sender, RemoteProgressUpdate},
        types::{Project, Traj},
    },
    error::ChoreoError,
    ChoreoResult,
};

const FORMATTING_OPTIONS: &str = "Formating Options";
const FILE_OPTIONS: &str = "File Options";
const ADVANCED_OPTIONS: &str = "Advanced Options";
const ACTION_OPTIONS: &str = "Action Options";

#[derive(Debug)]
enum CliAction {
    Generate {
        project_path: PathBuf,
        traj_names: Vec<String>,
    },
    Remote {
        project_path: PathBuf,
        traj_path: PathBuf,
        responder: IpcSender<RemoteProgressUpdate>,
    },
    Gui,
    GuiWithProject {
        project_path: PathBuf,
    },
    Error(String),
}

impl CliAction {
    #[allow(clippy::match_wildcard_for_single_variants)]
    fn enable_tracing(&self) {
        match self {
            Self::Gui | Self::GuiWithProject { .. } => {
                // #[cfg(all(windows, not(debug_assertions)))]
                // unsafe {
                //     use winapi::um as w;
                //     let dyn_handle = w::processenv::GetStdHandle(w::winbase::STD_OUTPUT_HANDLE);
                //     let mut console_mode = 0;
                //     if w::consoleapi::GetConsoleMode(dyn_handle, &mut console_mode) != 0 {
                //         w::wincon::FreeConsole();
                //     }
                // }
                tracing_subscriber::registry()
                    .with(
                        tracing_subscriber::fmt::layer()
                            .event_format(super::logging::CompactFormatter),
                    )
                    .init();
            },
            CliAction::Remote { .. } => {},
            _ => {
                tracing_subscriber::fmt()
                    .with_max_level(tracing::Level::INFO)
                    .init();
            },
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RemoteArgs {
    pub project: PathBuf,
    pub traj: PathBuf,
    pub ipc: String,
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
        help = "Adds trajectories to be used by cli actions (names not paths)"
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
        help = "The information needed to do a remote generation",
    )]
    pub remote: Option<String>,
}

impl Cli {
    fn action(mut self) -> CliAction {
        //if chor is provided and not an absolute path, make it absolute
        if let Some(chor) = &self.chor {
            if !chor.is_absolute() {
                self.chor = Some(
                    std::fs::canonicalize(chor)
                        .map_err(|_| ChoreoError::FileNotFound(Some(chor.clone())))
                        .expect("Failed to make path absolute"),
                );
            }
        }

        if let Some(remote_args) = self.remote {
            let remote_args: RemoteArgs =
                serde_json::from_str(&remote_args).expect("Failed to deserialize remote arguments");

            let ipc = IpcSender::<RemoteProgressUpdate>::connect(remote_args.ipc)
                .expect("Failed to deserialize IPC handle");

            return CliAction::Remote {
                project_path: remote_args.project,
                traj_path: remote_args.traj,
                responder: ipc,
            };
        }
        if self.generate {
            if let Some(project_path) = self.chor {
                if self.traj.is_empty() && !self.all_traj {
                    return CliAction::Error(
                        "Trajectories must be provided for generation.".to_string(),
                    );
                }
                return CliAction::Generate {
                    project_path,
                    traj_names: self.traj,
                };
            }
            CliAction::Error("Choreo file must be provided for generation.".to_string())
        } else if let Some(project_path) = self.chor {
            CliAction::GuiWithProject { project_path }
        } else {
            CliAction::Gui
        }
    }

    pub fn exec(self) {
        let resources = WritingResources::new();

        let action = self.action();

        action.enable_tracing();

        match action {
            CliAction::Generate {
                project_path,
                traj_names,
            } => {
                tracing::info!("CLIAction is Generate");
                tokio::runtime::Builder::new_current_thread()
                    .enable_all()
                    .build()
                    .expect("Failed to build tokio runtime")
                    .block_on(Self::generate_trajs(resources, project_path, traj_names));
            }
            CliAction::Gui => {
                tracing::info!("CLIAction is Gui");
                run_tauri(resources, None);
            }
            CliAction::GuiWithProject { project_path } => {
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
        mut traj_names: Vec<String>,
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

        if traj_names.is_empty() {
            traj_names = file::find_all_traj(&resources).await;
        }

        if traj_names.is_empty() {
            tracing::error!("No trajectories found in the project directory");
            return;
        }

        // generate trajectories
        for (i, traj_name) in traj_names.iter().enumerate() {
            tracing::info!("Generating trajectory {:} for {:}", traj_name, project.name);

            let traj = file::read_traj(&resources, traj_name.to_string())
                .await
                .expect("Failed to read trajectory file");

            match generate(&project, traj, i as i64) {
                Ok(new_traj) => {
                    file::write_traj(&resources, new_traj).await;
                    tracing::info!("Succesfully generated trajectory {:}", traj_name);
                }
                Err(e) => {
                    tracing::error!("Failed to generate trajectory {:}: {:}", traj_name, e);
                }
            }
        }
    }
}

fn main() {
    Cli::parse_from(std::env::args()).exec();
}
