#![allow(dead_code)]
use std::{
    fs,
    path::{Path, PathBuf},
    process::exit,
    sync::{Arc, Mutex},
    thread::{self, JoinHandle},
};

use choreo_core::{
    ChoreoError,
    codegen::{TRAJ_DATA_FILENAME, java},
    file_management::{self, WritingResources},
    generation::generate::generate,
    spec::trajectory::TrajectoryFile,
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
        trajectory_names: Vec<String>,
    },
    Error(String),
}

#[derive(Parser)]
#[clap(
    version = env!("CARGO_PKG_VERSION"),
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
        value_name = "trajectoryName1,trajectoryName2",
        help_heading = FILE_OPTIONS,
        value_delimiter = ',',
        conflicts_with = "all_trajectory",
        help = "Adds trajectories to be used by cli actions (names not paths)"
    )]
    pub trajectory: Vec<String>,

    #[arg(
        long,
        help_heading = FILE_OPTIONS,
        conflicts_with = "trajectory",
        help = "The same as doing --trajectory for all trajectories in the project"
    )]
    pub all_trajectory: bool,

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
        if let Some(chor) = &self.chor
            && !chor.is_absolute()
        {
            self.chor = Some(
                std::fs::canonicalize(chor)
                    .map_err(|_| ChoreoError::FileNotFound(Some(chor.clone())))
                    .expect("Failed to make path absolute"),
            );
        }

        if self.generate {
            if let Some(project_path) = self.chor {
                if self.trajectory.is_empty() && !self.all_trajectory {
                    return CliAction::Error(
                        "Trajectories must be provided for generation.".to_string(),
                    );
                }
                return CliAction::Generate {
                    project_path,
                    trajectory_names: self.trajectory,
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
                trajectory_names,
            } => {
                tracing::info!("CLIAction is Generate");
                choreo_core::tokio::runtime::Builder::new_current_thread()
                    .enable_all()
                    .build()
                    .expect("Failed to build tokio runtime")
                    .block_on(Self::generate_trajectories(
                        resources,
                        project_path,
                        trajectory_names,
                    ));
            }
            CliAction::Error(e) => {
                tracing::error!("{}", e);
                exit(1);
            }
        }
    }

    #[allow(clippy::cast_possible_wrap)]
    async fn generate_trajectories(
        resources: WritingResources,
        project_path: PathBuf,
        mut trajectory_names: Vec<String>,
    ) {
        let deploy_root = project_path
            .parent()
            .expect("project path should have a parent directory");
        // set the deploy path to the project directory
        file_management::set_deploy_path(&resources, deploy_root.to_path_buf()).await;

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

        if trajectory_names.is_empty() {
            trajectory_names = file_management::find_all_trajectories(&resources).await;
        }

        if trajectory_names.is_empty() {
            tracing::error!("No trajectories found in the project directory");
            return;
        }

        let mut thread_handles: Vec<JoinHandle<()>> = Vec::new();
        let trajectories = Arc::new(Mutex::new(Vec::<TrajectoryFile>::new()));

        // generate trajectories
        for (i, trajectory_name) in trajectory_names.iter().enumerate() {
            tracing::info!(
                "Generating trajectory {:} for {:}",
                trajectory_name,
                project.name
            );

            let trajectories_window = Arc::clone(&trajectories);
            let trajectory =
                file_management::read_trajectory_file(&resources, trajectory_name.to_string())
                    .await
                    .expect("Failed to read trajectory file");

            let cln_project = project.clone();
            let cln_resources = resources.clone();
            let cln_trajectory_name = trajectory_name.clone();
            let handle =
                thread::spawn(
                    move || match generate(cln_project.clone(), trajectory, i as i64) {
                        Ok(new_trajectory) => {
                            let runtime =
                                choreo_core::tokio::runtime::Builder::new_current_thread()
                                    .enable_all()
                                    .build()
                                    .expect("Failed to build tokio runtime");
                            let write_result =
                                runtime.block_on(file_management::write_trajectory_file(
                                    &cln_resources,
                                    &new_trajectory,
                                ));
                            match write_result {
                                Ok(_) => {
                                    tracing::info!(
                                        "Successfully generated trajectory {:} for {:}",
                                        cln_trajectory_name,
                                        cln_project.name
                                    );
                                }
                                Err(e) => {
                                    tracing::error!(
                                        "Failed to write trajectory {:} for {:}: {:}",
                                        cln_trajectory_name,
                                        cln_project.name,
                                        e
                                    );
                                }
                            }
                            trajectories_window
                                .lock()
                                .expect("Internal Choreo Thread has panicked; see stack trace.")
                                .push(new_trajectory);
                        }
                        Err(e) => {
                            tracing::error!(
                                "Failed to generate trajectory {:}: {:}",
                                cln_trajectory_name,
                                e
                            );
                        }
                    },
                );

            thread_handles.push(handle);
        }

        for handle in thread_handles {
            match handle.join() {
                Ok(_) => {}
                Err(e) => {
                    tracing::error!("Failed to join thread: {:?}", e);
                }
            }
        }
        if let Some(codegen_root) = project.codegen.get_root()
            && let Some(deploy_root_str) = deploy_root.to_str()
            && let Some(pkg_name) = java::codegen_package_name(&project)
        {
            let trajectories_vec = Arc::try_unwrap(trajectories)
                .expect("Generation threads did not finish.")
                .into_inner()
                .expect("Generation threads did not finish.");
            let file_path = Path::new(deploy_root_str)
                .join(codegen_root)
                .join(format!("{TRAJ_DATA_FILENAME}.java"));
            let content = java::traj_file_contents(
                trajectories_vec,
                pkg_name,
                project.codegen.use_choreo_lib,
            );
            fs::write(file_path, content).expect("Failed to write Code Generation Files.");
        }
    }
}

fn main() {
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .init();
    Cli::parse_from(std::env::args()).exec();
}
