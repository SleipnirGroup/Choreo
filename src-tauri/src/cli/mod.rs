
use std::path::PathBuf;

use clap::Parser;
use tokio::fs;

use crate::document::{file::{self, WritingResources}, generate::generate, types::{Project, Traj}};


const FORMATING_OPTIONS: &str = "Formating Options";
const FILE_OPTIONS: &str = "File Options";


#[derive(Parser)]
pub struct Cli {
    #[arg(
        long,
        value_name = "path/to/myproject.chor",
        help_heading = FILE_OPTIONS,
        required = true
    )]
    pub chor: PathBuf,

    #[arg(
        long,
        value_name = "[test, test2]",
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
    pub fn exec(&self) {
        match self.format.as_str() {
            "pretty" => {
                tracing_subscriber::fmt().pretty().init();
            }
            "json" => {
                tracing_subscriber::fmt().json().init();
            }
            _ => {
                tracing_subscriber::fmt().init();
            }
        }

        if !self.generate || self.traj.is_empty() {
            tracing::error!("Only generating trajectories is supported at the moment.");
            return;
        }

        tokio::runtime::Builder::new_multi_thread()
            .enable_all()
            .build()
            .expect("Failed to build tokio runtime")
            .block_on(self.async_exec());
    }

    #[allow(clippy::cast_possible_wrap)]
    async fn async_exec(&self) {
        let resources = WritingResources::new();

        file::set_deploy_path(
            &resources,
            self.chor.parent()
                .expect("Choreo file must have a parent directory.")
                .to_path_buf(),
        ).await;

        let contents = fs::read_to_string(&self.chor).await
            .expect("Failed to read choreo file.");
        let mut chor = Project::from_content(&contents)
            .expect("Failed to parse choreo file.");
        chor.name = self.chor.file_name()
            .expect("Choreo file must have a name.")
            .to_str()
            .expect("Choreo file name must be a valid UTF-8 string.")
            .to_string();

        for (i, traj_name) in self.traj.iter().enumerate() {
            tracing::info!("Generating trajectory {:} for {:}", traj_name, chor.name);

            let path = self.chor.parent()
                .expect("Choreo file must have a parent directory.")
                .join(traj_name)
                .with_extension("traj");

            let contents = fs::read_to_string(&path).await
                .expect("Failed to read trajectory file.");
            let traj = Traj::from_content(&contents)
                .expect("Failed to parse trajectory file.");

            match generate(&chor, traj, i as i64) {
                Ok(new_traj) => {
                    file::write_traj(&resources, new_traj).await;
                },
                Err(e) => {
                    tracing::error!("Failed to generate trajectory {:}: {:}", traj_name, e);
                }
            }
        }
    }
}