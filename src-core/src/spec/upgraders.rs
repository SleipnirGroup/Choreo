use serde_json::Value as JsonValue;

use crate::ChoreoResult;

mod traj_file {
    use crate::spec::trajectory::Trajectory;
    #[allow(unused_imports)] // Remove when an upgrader function is added
    use crate::{
        file_management::upgrader::{Editor, Upgrader},
        spec::TRAJ_SCHEMA_VERSION,
        ChoreoResult,
    };
    use std::sync::LazyLock;

    pub(super) static TRAJ_UPGRADER: LazyLock<Upgrader> = LazyLock::new(make_upgrader);

    fn make_upgrader() -> Upgrader {
        let mut upgrader = Upgrader::new(TRAJ_SCHEMA_VERSION);
        upgrader.add_version_action(up_0_1);
        upgrader.add_version_action(up_1_2);
        // Ensure the new upgrader is added here
        upgrader
    }

    fn up_0_1(editor: &mut Editor) -> ChoreoResult<()> {
        // Clear generated output
        editor.set_path_serialize(
            "trajectory",
            Trajectory {
                sample_type: None,
                waypoints: vec![],
                samples: vec![],
                splits: vec![],
            },
        )
    }

    fn up_1_2(editor: &mut Editor) -> ChoreoResult<()> {
        use crate::spec::Expr;
        use serde_json::Value as JsonValue;

        // Add rotation field to all KeepInRectangle constraints in both snapshot and params

        // Handle snapshot constraints
        if editor.has_path("snapshot.constraints") {
            let snapshot_constraints: Vec<JsonValue> = editor.get_path("snapshot.constraints")?;
            let mut updated_constraints = Vec::new();

            for mut constraint in snapshot_constraints {
                if let Some(data_type) = constraint["data"]["type"].as_str() {
                    if data_type == "KeepInRectangle" {
                        // Add rotation field and convert coordinates from bottom-left to center
                        if let Some(props) = constraint["data"]["props"].as_object_mut() {
                            // Get existing values
                            let x = props.get("x").and_then(|v| v.as_f64()).unwrap_or(0.0);
                            let y = props.get("y").and_then(|v| v.as_f64()).unwrap_or(0.0);
                            let w = props.get("w").and_then(|v| v.as_f64()).unwrap_or(1.0);
                            let h = props.get("h").and_then(|v| v.as_f64()).unwrap_or(1.0);
                            
                            // Convert from bottom-left to center coordinates
                            let center_x = x + w / 2.0;
                            let center_y = y + h / 2.0;
                            
                            // Update x,y to be center coordinates
                            props.insert("x".to_string(), JsonValue::Number(serde_json::Number::from_f64(center_x).unwrap()));
                            props.insert("y".to_string(), JsonValue::Number(serde_json::Number::from_f64(center_y).unwrap()));
                            
                            // Add rotation field
                            props.insert(
                                "rotation".to_string(),
                                JsonValue::Number(serde_json::Number::from_f64(0.0).unwrap()),
                            );
                        }
                    }
                }
                updated_constraints.push(constraint);
            }

            editor.set_path_serialize("snapshot.constraints", updated_constraints)?;
        }

        // Handle params constraints
        if editor.has_path("params.constraints") {
            let params_constraints: Vec<JsonValue> = editor.get_path("params.constraints")?;
            let mut updated_constraints = Vec::new();

            for mut constraint in params_constraints {
                if let Some(data_type) = constraint["data"]["type"].as_str() {
                    if data_type == "KeepInRectangle" {
                        // Add rotation field and convert coordinates from bottom-left to center
                        if let Some(props) = constraint["data"]["props"].as_object_mut() {
                            // Get existing values from Expr objects
                            let x_val = props.get("x")
                                .and_then(|v| v.get("val"))
                                .and_then(|v| v.as_f64())
                                .unwrap_or(0.0);
                            let y_val = props.get("y")
                                .and_then(|v| v.get("val"))
                                .and_then(|v| v.as_f64())
                                .unwrap_or(0.0);
                            let w_val = props.get("w")
                                .and_then(|v| v.get("val"))
                                .and_then(|v| v.as_f64())
                                .unwrap_or(1.0);
                            let h_val = props.get("h")
                                .and_then(|v| v.get("val"))
                                .and_then(|v| v.as_f64())
                                .unwrap_or(1.0);
                            
                            // Convert from bottom-left to center coordinates
                            let center_x = x_val + w_val / 2.0;
                            let center_y = y_val + h_val / 2.0;
                            
                            // Update x,y to be center coordinates (preserve expression strings but update values)
                            if let Some(x_expr) = props.get_mut("x") {
                                if let Some(x_obj) = x_expr.as_object_mut() {
                                    x_obj.insert("val".to_string(), JsonValue::Number(serde_json::Number::from_f64(center_x).unwrap()));
                                    x_obj.insert("exp".to_string(), JsonValue::String(format!("{} m", center_x)));
                                }
                            }
                            if let Some(y_expr) = props.get_mut("y") {
                                if let Some(y_obj) = y_expr.as_object_mut() {
                                    y_obj.insert("val".to_string(), JsonValue::Number(serde_json::Number::from_f64(center_y).unwrap()));
                                    y_obj.insert("exp".to_string(), JsonValue::String(format!("{} m", center_y)));
                                }
                            }
                            
                            // Add rotation field
                            props.insert(
                                "rotation".to_string(),
                                serde_json::to_value(Expr::new("0 deg", 0.0))?,
                            );
                        }
                    }
                }
                updated_constraints.push(constraint);
            }

            editor.set_path_serialize("params.constraints", updated_constraints)?;
        }

        Ok(())
    }

    #[cfg(test)]
    mod tests {
        use crate::spec::upgraders::testing_shared::{get_contents, FileType};
        use crate::spec::TRAJ_SCHEMA_VERSION;
        use crate::ChoreoResult;

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
    }
}

pub fn upgrade_traj_file(jdata: JsonValue) -> ChoreoResult<JsonValue> {
    traj_file::TRAJ_UPGRADER.upgrade(jdata)
}

pub fn upgrade_project_file(jdata: JsonValue) -> ChoreoResult<JsonValue> {
    project_file::PROJECT_UPGRADER.upgrade(jdata)
}
