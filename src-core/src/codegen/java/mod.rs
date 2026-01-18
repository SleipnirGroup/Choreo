pub mod choreo_vars;
pub mod trajectory_data;
pub mod validate_name;

use crate::spec::project::ProjectFile;
use std::path;

pub fn get_package_name(project_file: &ProjectFile) -> Option<String> {
    let sep = path::MAIN_SEPARATOR_STR.to_owned() + "java" + path::MAIN_SEPARATOR_STR;
    let root = project_file.codegen.root.as_ref()?;
    let path_segments: Vec<&str> = root.split(&sep).collect();
    if path_segments.len() == 1 {
        None
    } else {
        Some(path_segments[1].replace("/", ".").replace("\\", "."))
    }
}
