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
    async fn test_0_swerve() {
        test_generate("swerve", "0").await;
    }

    #[tokio::test]
    async fn test_0_differential() {
        test_generate("differential", "0").await;
    }

    async fn test_generate(drive_type: &str, version: &str) {
        let test_dir: PathBuf = format!("./test-tmp-{version}-{drive_type}").into();
        let original_chor: PathBuf =
            format!("../test-jsons/project/{version}/{drive_type}.chor").into();
        let test_chor: PathBuf = test_dir.join(format!("{drive_type}.chor"));
        let original_traj: PathBuf =
            format!("../test-jsons/trajectory/{version}/{drive_type}.traj").into();
        let test_traj: PathBuf = test_dir.join(format!("{drive_type}.traj"));
        let _ = fs::create_dir(test_dir.clone()).or_else(|_| fs::remove_dir(test_dir));
        // don't modify the original files
        fs::copy(original_chor.clone(), test_chor.clone()).unwrap();
        fs::copy(original_traj.clone(), test_traj.clone()).unwrap();
        let resources = WritingResources::new();
        // if this succeeds, modified generated .traj is written to test_traj
        generate_trajectories(&resources, &test_chor.clone(), vec![drive_type.to_string()]).await;
        // Generation should be identical IF on the same platform
        // so we compare before/after the second generation
        // this also checks that the first one produced a loadable .traj
        let traj_after_first = fs::read_to_string(test_traj.clone()).unwrap();
        let chor_after_first = fs::read_to_string(test_chor.clone()).unwrap();
        generate_trajectories(&resources, &test_chor.clone(), vec![drive_type.to_string()]).await;
        let traj_after_second = fs::read_to_string(test_traj.clone()).unwrap();
        let chor_after_second = fs::read_to_string(test_chor.clone()).unwrap();
        assert!(traj_after_first == traj_after_second);
        assert!(chor_after_first == chor_after_second);
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
        // ADDED: Cli doesn't write the upgraded project, but we want to test the project file writing
        let _ = file_management::write_projectfile(&resources, project.clone()).await;

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
