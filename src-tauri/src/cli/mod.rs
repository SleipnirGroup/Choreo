#![allow(dead_code)]
use std::path::PathBuf;

use clap::Parser;

use crate::{
    document::{
        file::{self, WritingResources},
        generate::generate,
    },
    gui::run_tauri,
};

const FORMATING_OPTIONS: &str = "Formating Options";
const FILE_OPTIONS: &str = "File Options";

#[derive(Debug)]
enum CliAction {
    Generate(PathBuf, Vec<String>),
    Gui,
    GuiWithProject(PathBuf),
    Error(String),
}

impl CliAction {
    #[allow(clippy::match_wildcard_for_single_variants)]
    fn prefered_tracing_level(&self) -> tracing::Level {
        match self {
            Self::Gui | Self::GuiWithProject(_) | Self::Generate(_, _) => tracing::Level::DEBUG,
            _ => tracing::Level::WARN,
        }
    }
}

#[derive(Debug, Clone, Copy)]
enum CliFormat {
    Pretty,
    Json,
    Slim,
}

impl CliFormat {
    fn enable_subscriber(self, level: tracing::Level) {
        match self {
            Self::Pretty => {
                tracing_subscriber::fmt()
                    .pretty()
                    .with_max_level(level)
                    .init();
            }
            Self::Json => {
                tracing_subscriber::fmt()
                    .json()
                    .with_max_level(level)
                    .init();
            }
            Self::Slim => {
                tracing_subscriber::fmt().with_max_level(level).init();
            }
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
        value_name = "test2",
        help_heading = FILE_OPTIONS
    )]
    pub traj: Vec<String>,

    #[arg(long, short)]
    pub generate: bool,

    #[arg(
        long,
        short,
        value_name = "(pretty|json|slim)",
        help_heading = FORMATING_OPTIONS,
        default_value = "slim"
    )]
    pub format: String,
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
                return CliAction::Generate(project_path, self.traj);
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
        let format = match self.format.as_str() {
            "pretty" => CliFormat::Pretty,
            "json" => CliFormat::Json,
            _ => CliFormat::Slim,
        };

        let action = self.action();

        format.enable_subscriber(action.prefered_tracing_level());

        match action {
            CliAction::Generate(project_path, traj_names) => {
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
            CliAction::GuiWithProject(project_path) => {
                tracing::info!("CLIAction is GuiWithProject");
                run_tauri(resources, Some(project_path));
            }
            CliAction::Error(e) => {
                tracing::error!("{}", e);
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
}
