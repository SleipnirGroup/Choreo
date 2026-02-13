mod choreo_vars;
mod trajectory_data;

pub use choreo_vars::vars_file_contents;
pub use trajectory_data::traj_file_contents;

use crate::spec::project::ProjectFile;
use std::path;

pub fn codegen_package_name(project_file: &ProjectFile) -> Option<String> {
    let sep = path::MAIN_SEPARATOR_STR.to_owned() + "java" + path::MAIN_SEPARATOR_STR;
    let root = project_file.codegen.get_root()?;
    let path_segments: Vec<&str> = root.split(&sep).collect();
    if path_segments.len() == 1 {
        None
    } else {
        Some(path_segments[1].replace("/", ".").replace("\\", "."))
    }
}
