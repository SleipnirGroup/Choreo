use serde_json::Value as JsonValue;

use crate::ChoreoResult;

mod traj_file {
    #[allow(unused_imports)] // Remove when an upgrader function is added
    use crate::{
        file_management::upgrader::{Editor, Upgrader},
        spec::TRAJ_SCHEMA_VERSION,
        ChoreoResult,
    };
    use std::sync::LazyLock;

    pub(super) static TRAJ_UPGRADER: LazyLock<Upgrader> = LazyLock::new(make_upgrader);

    fn make_upgrader() -> Upgrader {
        #[allow(unused_mut)] // Remove once an upgrade function is added
        let mut upgrader = Upgrader::new(TRAJ_SCHEMA_VERSION);
        // upgrader.add_version_action(up_0_1);
        // Ensure the new upgrader is added here
        upgrader
    }

    // EXAMPLE: Delete this once a real upgrade function is added
    // fn up_0_1(editor: &mut Editor) -> ChoreoResult<()> {
    //     if editor.has_path("trajectory") {
    //         editor.set_path("trajectory.trackwidth", 1.0)
    //     } else {
    //         Ok(())
    //     }
    // }

    #[cfg(test)]
    mod tests {
        use crate::spec::upgraders::testing_shared::{get_contents, FileType};
        use crate::spec::TRAJ_SCHEMA_VERSION;
        use crate::ChoreoResult;

        use crate::spec::trajectory::TrajectoryFile;
        #[test]
        pub fn test_0_differential() -> ChoreoResult<()> {
            test_trajectory("0", "differential")
        }
        #[test]
        pub fn test_0_swerve() -> ChoreoResult<()> {
            test_trajectory("0", "swerve")
        }

        /// Tests that the file upgrades to the current version and deserializes properly.
        fn test_trajectory(version: &str, file_name: &str) -> ChoreoResult<()> {
            let contents = get_contents(FileType::Trajectory, version, file_name);
            let file = TrajectoryFile::from_content(&(contents))?;
            assert!(
                file.version == TRAJ_SCHEMA_VERSION,
                "Upgrader set wrong Trajectory File Version {}, should be {}",
                file.version,
                TRAJ_SCHEMA_VERSION
            );
            Ok(())
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
        file_management::upgrader::{Editor, Upgrader},
        spec::{Expr, PROJECT_SCHEMA_VERSION},
        ChoreoResult,
    };

    pub(super) static PROJECT_UPGRADER: LazyLock<Upgrader> = LazyLock::new(make_upgrader);

    fn make_upgrader() -> Upgrader {
        let mut upgrader = Upgrader::new(PROJECT_SCHEMA_VERSION);
        upgrader.add_version_action(up_0_1);

        upgrader
    }
    // Naming convention: up_[old version]_[new_version]
    // the up prefix lets version numerals be used
    fn up_0_1(editor: &mut Editor) -> ChoreoResult<()> {
        editor.set_path_serialize("config.cof", Expr::new("1.5", 1.5))
    }

    #[cfg(test)]
    mod tests {
        use crate::spec::upgraders::testing_shared::{get_contents, FileType};
        use crate::spec::PROJECT_SCHEMA_VERSION;
        use crate::ChoreoResult;

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
        pub fn test_0_differential() -> ChoreoResult<()> {
            test_project("0", "differential")
        }
        #[test]
        pub fn test_0_swerve() -> ChoreoResult<()> {
            test_project("0", "swerve")
        }
    }
}

pub fn upgrade_traj_file(jdata: JsonValue) -> ChoreoResult<JsonValue> {
    traj_file::TRAJ_UPGRADER.upgrade(jdata)
}

pub fn upgrade_project_file(jdata: JsonValue) -> ChoreoResult<JsonValue> {
    project_file::PROJECT_UPGRADER.upgrade(jdata)
}
