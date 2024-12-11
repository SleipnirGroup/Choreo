#[cfg(test)]
mod generate {
    use std::fs;
    use std::{
        path::PathBuf,
        thread::{self, JoinHandle},
    };

    use crate::{
        file_management::{self, WritingResources},
        generation::generate::generate,
    };

    #[tokio::test]
    async fn test_generate() {
        let original_chor: PathBuf = "../test-jsons/project/0/swerve.chor".into();
        let test_chor: PathBuf = "./test-tmp/swerve.chor".into();
        let original_traj: PathBuf = "../test-jsons/trajectory/0/swerve.traj".into();
        let test_traj: PathBuf = "./test-tmp/swerve.traj".into();
        let _ = fs::create_dir("./test-tmp"); //this could fail if the directory exists; this is fine
                                              // don't modify the original files
        fs::copy(original_chor.clone(), test_chor.clone()).unwrap();
        fs::copy(original_traj.clone(), test_traj.clone()).unwrap();
        let resources = WritingResources::new();
        // if this succeeds, modified generated .traj is written to test_traj
        generate_trajectories(&resources, &test_chor.clone(), vec!["swerve".to_string()]).await;
        // Generation should be identical IF on the same platform
        // so we compare before/after the second generation
        // this also checks that the first one produced a loadable .traj
        let after_first = fs::read_to_string(test_traj.clone()).unwrap();
        generate_trajectories(&resources, &test_chor.clone(), vec!["swerve".to_string()]).await;
        let after_second = fs::read_to_string(test_traj.clone()).unwrap();
        assert!(after_first == after_second);
    }
    // Copied from src-cli
    #[allow(clippy::cast_possible_wrap)]
    async fn generate_trajectories(
        resources: &WritingResources,
        project_path: &PathBuf,
        mut trajectory_names: Vec<String>,
    ) {
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

        if trajectory_names.is_empty() {
            trajectory_names = file_management::find_all_trajectories(&resources).await;
        }

        if trajectory_names.is_empty() {
            tracing::error!("No trajectories found in the project directory");
            return;
        }

        let mut thread_handles: Vec<JoinHandle<()>> = Vec::new();

        // generate trajectories
        for (i, trajectory_name) in trajectory_names.iter().enumerate() {
            tracing::info!(
                "Generating trajectory {:} for {:}",
                trajectory_name,
                project.name
            );

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
                            let runtime = crate::tokio::runtime::Builder::new_current_thread()
                                .enable_all()
                                .build()
                                .expect("Failed to build tokio runtime");
                            let write_result = runtime.block_on(
                                file_management::write_trajectory_file_immediately(
                                    &cln_resources,
                                    new_trajectory,
                                ),
                            );
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
    }
}
