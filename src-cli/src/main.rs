#![allow(dead_code)]
use std::{path::PathBuf, process::exit};

use choreo_core::{
    file_management::{self, WritingResources},
    generation::generate::generate,
    ChoreoError,
};
use clap::Parser;

const FORMATTING_OPTIONS: &str = "Formatting Options";
const FILE_OPTIONS: &str = "File Options";
const ADVANCED_OPTIONS: &str = "Advanced Options";
const ACTION_OPTIONS: &str = "Action Options";

#[derive(Debug)]
enum CliAction {
    Generate {
        project_path: PathBuf,
        traj_names: Vec<String>,
    },
    Error(String),
}

#[derive(Parser)]
#[clap(
    version = "2025.0.0-alpha",
    author = "Choreo Contributors",
    about = "Choreo CLI",
    bin_name = "Choreo",
    before_long_help = r#"
    This CLI is still in alpha and has some quirks.
    Gui opening has been deprecated from this exe and can be done by running `Choreo.exe` directly
    with 1 argument being the path to the project file.

"#
)]
pub struct Cli {
    #[arg(
        long,
        value_name = "path/to/myproject.chor",
        help_heading = FILE_OPTIONS,
        required = true,
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
        help = "Generate the provided trajectories for the project",
        required = true,
    )]
    pub generate: bool,
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
        } else {
            CliAction::Error("Only generate action is supported for now".to_string())
        }
    }

    pub fn exec(self) {
        let resources = WritingResources::new();

        let action = self.action();

        match action {
            CliAction::Generate {
                project_path,
                traj_names,
            } => {
                tracing::info!("CLIAction is Generate");
                choreo_core::tokio::runtime::Builder::new_current_thread()
                    .enable_all()
                    .build()
                    .expect("Failed to build tokio runtime")
                    .block_on(Self::generate_trajs(resources, project_path, traj_names));
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
        file_management::set_deploy_path(
            &resources,
            project_path
                .parent()
                .expect("project path should have a parent directory")
                .to_path_buf(),
        )
        .await;

        // read the project file
        let project = file_management::read_projectfile(
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
            traj_names = file_management::find_all_traj(&resources).await;
        }

        if traj_names.is_empty() {
            tracing::error!("No trajectories found in the project directory");
            return;
        }

        // generate trajectories
        for (i, traj_name) in traj_names.iter().enumerate() {
            tracing::info!("Generating trajectory {:} for {:}", traj_name, project.name);

            let traj = file_management::read_trajfile(&resources, traj_name.to_string())
                .await
                .expect("Failed to read trajectory file");

            match generate(project.clone(), traj, i as i64) {
                Ok(new_traj) => {
                    match file_management::write_trajfile_immediately(&resources, new_traj).await {
                        Ok(_) => {
                            tracing::info!(
                                "Successfully generated trajectory {:} for {:}",
                                traj_name,
                                project.name
                            );
                        }
                        Err(e) => {
                            tracing::error!(
                                "Failed to write trajectory {:} for {:}: {:}",
                                traj_name,
                                project.name,
                                e
                            );
                        }
                    }
                }
                Err(e) => {
                    tracing::error!("Failed to generate trajectory {:}: {:}", traj_name, e);
                }
            }
        }
    }
}

fn main() {
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .init();
    Cli::parse_from(std::env::args()).exec();
}
