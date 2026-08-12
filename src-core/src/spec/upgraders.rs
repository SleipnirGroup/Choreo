use serde_json::Value as JsonValue;

use crate::ChoreoResult;

mod traj_file {
    use crate::spec::trajectory::Trajectory;
    use crate::{
        ChoreoResult,
        file_management::upgrader::{Editor, Upgrader},
        spec::TRAJ_SCHEMA_VERSION,
    };
    use std::sync::LazyLock;

    pub(super) static TRAJ_UPGRADER: LazyLock<Upgrader> = LazyLock::new(make_upgrader);

    fn make_upgrader() -> Upgrader {
        let mut upgrader = Upgrader::new(TRAJ_SCHEMA_VERSION);
        upgrader.add_version_action(up_0_1);
        upgrader.add_version_action(up_1_2);
        upgrader.add_version_action(up_2_3);
        upgrader.add_version_action(up_3_4);
        // Ensure the new upgrader is added here
        upgrader
    }
    /// To devs adding new schema versions:
    /// If the change adds/exposes a new field in the trajectory sample,
    /// the upgrade process includes calling this function, which deletes the generation output.
    /// The new field likely can't be derived from other .traj contents, so the upgrader does
    /// not have enough information to autopopulate it without regenerating.
    /// No other upgrader work is needed to accommodate new sample fields.
    fn clear_generation_result(editor: &mut Editor) -> ChoreoResult<()> {
        // Clear generated output
        editor.set_path_serialize(
            "trajectory",
            Trajectory {
                config: None,
                sample_type: None,
                waypoints: vec![],
                samples: vec![],
                splits: vec![],
            },
        )
    }

    fn up_0_1(editor: &mut Editor) -> ChoreoResult<()> {
        clear_generation_result(editor)
    }

    fn up_1_2(editor: &mut Editor) -> ChoreoResult<()> {
        clear_generation_result(editor)
    }

    fn up_2_3(editor: &mut Editor) -> ChoreoResult<()> {
        clear_generation_result(editor)
    }

    fn up_3_4(editor: &mut Editor) -> ChoreoResult<()> {
        if editor
            .get_path_raw("trajectory.config")
            .is_some_and(|config| !config.is_null())
        {
            let max_speed: f64 = editor.get_path("trajectory.config.vmax")?;
            let max_torque: f64 = editor.get_path("trajectory.config.tmax")?;
            editor.set_path("trajectory.config.motorCurveEnabled", false)?;
            editor.set_path("trajectory.config.motorFreeSpeed", max_speed)?;
            editor.set_path("trajectory.config.motorStallTorque", max_torque)?;
        }
        Ok(())
    }

    #[cfg(test)]
    mod tests {
        use crate::ChoreoResult;
        use crate::spec::TRAJ_SCHEMA_VERSION;
        use crate::spec::upgraders::testing_shared::{FileType, get_contents};

        use crate::spec::trajectory::TrajectoryFile;
        // beta6 is technically the same spec as 0, but with a string version number
        #[test]
        pub fn test_beta6_differential() -> ChoreoResult<()> {
            test_trajectory("beta-6", "differential")
        }
        #[test]
        pub fn test_beta6_swerve() -> ChoreoResult<()> {
            test_trajectory("beta-6", "swerve")
        }
        #[test]
        pub fn test_0_differential() -> ChoreoResult<()> {
            test_trajectory("0", "differential")
        }
        #[test]
        pub fn test_0_swerve() -> ChoreoResult<()> {
            test_trajectory("0", "swerve")
        }

        #[test]
        pub fn test_1_differential() -> ChoreoResult<()> {
            test_trajectory("1", "differential")
        }
        #[test]
        pub fn test_1_swerve() -> ChoreoResult<()> {
            test_trajectory("1", "swerve")
        }

        #[test]
        pub fn test_2_differential() -> ChoreoResult<()> {
            test_trajectory("2", "differential")
        }
        #[test]
        pub fn test_2_swerve() -> ChoreoResult<()> {
            test_trajectory("2", "swerve")
        }

        #[test]
        pub fn test_3_differential() -> ChoreoResult<()> {
            test_trajectory("3", "differential")
        }
        #[test]
        pub fn test_3_swerve() -> ChoreoResult<()> {
            let file = load_trajectory("3", "swerve")?;
            let config = file.trajectory.config.expect("config snapshot");
            assert!(!config.motor_curve_enabled);
            assert_eq!(config.motor_free_speed, config.vmax);
            assert_eq!(config.motor_stall_torque, config.tmax);
            Ok(())
        }

        /// Tests that the file upgrades to the current version and deserializes properly.
        fn test_trajectory(version: &str, file_name: &str) -> ChoreoResult<()> {
            load_trajectory(version, file_name).map(|_| ())
        }

        fn load_trajectory(version: &str, file_name: &str) -> ChoreoResult<TrajectoryFile> {
            let contents = get_contents(FileType::Trajectory, version, file_name);
            let file = TrajectoryFile::from_content(&(contents))?;
            assert!(
                file.version == TRAJ_SCHEMA_VERSION,
                "Upgrader set wrong Trajectory File Version {}, should be {}",
                file.version,
                TRAJ_SCHEMA_VERSION
            );
            Ok(file)
        }
    }
}

#[cfg(test)]
mod testing_shared {
    use std::{fs, path::PathBuf, str::FromStr};
    pub enum FileType {
        Project,
        Trajectory,
    }
    impl FileType {
        pub fn directory(&self) -> &str {
            match self {
                FileType::Project => "project",
                FileType::Trajectory => "trajectory",
            }
        }
        pub fn extension(&self) -> &str {
            match self {
                FileType::Project => "chor",
                FileType::Trajectory => "traj",
            }
        }
    }
    /// Get the contents of a testing json
    /// SAFETY: Panics if the file does not exist. Only for use in test cases.
    pub fn get_contents(file_type: FileType, version: &str, file_name: &str) -> String {
        let test_json_dir: PathBuf = PathBuf::from_str(env!("CARGO_MANIFEST_DIR"))
            .unwrap()
            .parent()
            .unwrap()
            .join("test-jsons");
        let file = test_json_dir
            .join(file_type.directory())
            .join(version)
            .join(file_name)
            .with_extension(file_type.extension());
        println!("{}", file.display());
        fs::read_to_string(file).unwrap()
    }
}

mod project_file {
    use std::sync::LazyLock;

    use crate::{
        ChoreoResult,
        file_management::upgrader::{Editor, Upgrader},
        spec::{Expr, PROJECT_SCHEMA_VERSION},
    };

    pub(super) static PROJECT_UPGRADER: LazyLock<Upgrader> = LazyLock::new(make_upgrader);

    fn make_upgrader() -> Upgrader {
        let mut upgrader = Upgrader::new(PROJECT_SCHEMA_VERSION);
        upgrader.add_version_action(up_0_1);
        upgrader.add_version_action(up_1_2);
        upgrader.add_version_action(up_2_3);
        upgrader
    }
    // Naming convention: up_[old version]_[new_version]
    // the up prefix lets version numerals be used
    fn up_0_1(editor: &mut Editor) -> ChoreoResult<()> {
        editor.set_path_serialize("config.cof", Expr::new("1.5", 1.5))
    }
    fn up_1_2(editor: &mut Editor) -> ChoreoResult<()> {
        editor.set_path("codegen.root", Option::<String>::None)?;
        editor.set_path("codegen.genVars", true)?;
        editor.set_path("codegen.genTrajData", true)?;
        editor.set_path("codegen.useChoreoLib", true)?;
        Ok(())
    }
    fn up_2_3(editor: &mut Editor) -> ChoreoResult<()> {
        let max_speed: Expr = editor.get_path("config.vmax")?;
        let max_torque: Expr = editor.get_path("config.tmax")?;
        editor.set_path("config.motorCurveEnabled", false)?;
        editor.set_path_serialize("config.motorFreeSpeed", max_speed)?;
        editor.set_path_serialize("config.motorStallTorque", max_torque)
    }

    #[cfg(test)]
    mod tests {
        use crate::ChoreoResult;
        use crate::spec::PROJECT_SCHEMA_VERSION;
        use crate::spec::upgraders::testing_shared::{FileType, get_contents};

        use crate::spec::project::ProjectFile;

        /// Tests that the file upgrades to the current version and deserializes properly.
        fn test_project(version: &str, file_name: &str) -> ChoreoResult<()> {
            let contents = get_contents(FileType::Project, version, file_name);
            let file = ProjectFile::from_content(&(contents))?;
            assert!(
                file.version == PROJECT_SCHEMA_VERSION,
                "Upgrader set wrong Project File Version {}, should be {}",
                file.version,
                PROJECT_SCHEMA_VERSION
            );
            Ok(())
        }
        // TODO: macroize this to one line per test
        #[test]
        pub fn test_beta6_differential() -> ChoreoResult<()> {
            test_project("beta-6", "differential")
        }
        #[test]
        pub fn test_beta6_swerve() -> ChoreoResult<()> {
            test_project("beta-6", "swerve")
        }
        #[test]
        pub fn test_0_differential() -> ChoreoResult<()> {
            test_project("0", "differential")
        }
        #[test]
        pub fn test_0_swerve() -> ChoreoResult<()> {
            test_project("0", "swerve")
        }
        #[test]
        pub fn test_1_differential() -> ChoreoResult<()> {
            test_project("1", "differential")
        }
        #[test]
        pub fn test_1_swerve() -> ChoreoResult<()> {
            test_project("1", "swerve")
        }
        #[test]
        pub fn test_2_differential() -> ChoreoResult<()> {
            test_project("2", "differential")
        }
        #[test]
        pub fn test_2_swerve() -> ChoreoResult<()> {
            let file = load_project("2", "swerve")?;
            assert!(!file.config.motor_curve_enabled);
            assert_eq!(file.config.motor_free_speed.exp, file.config.vmax.exp);
            assert_eq!(file.config.motor_free_speed.val, file.config.vmax.val);
            assert_eq!(file.config.motor_stall_torque.exp, file.config.tmax.exp);
            assert_eq!(file.config.motor_stall_torque.val, file.config.tmax.val);
            Ok(())
        }

        fn load_project(version: &str, file_name: &str) -> ChoreoResult<ProjectFile> {
            let contents = get_contents(FileType::Project, version, file_name);
            let file = ProjectFile::from_content(&(contents))?;
            assert_eq!(file.version, PROJECT_SCHEMA_VERSION);
            Ok(file)
        }
    }
}

pub fn upgrade_traj_file(jdata: JsonValue) -> ChoreoResult<JsonValue> {
    traj_file::TRAJ_UPGRADER.upgrade(jdata)
}

pub fn upgrade_project_file(jdata: JsonValue) -> ChoreoResult<JsonValue> {
    project_file::PROJECT_UPGRADER.upgrade(jdata)
}
