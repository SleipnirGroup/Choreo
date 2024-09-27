use std::{
    ffi::OsString,
    fs,
    io::{BufWriter, Write},
    iter::repeat_with,
    path::PathBuf,
};

use zip;

use crate::{
    spec::{project::ProjectFile, trajectory::TrajectoryFile},
    ChoreoError, ChoreoResult,
};

fn tmpname(prefix: &str, suffix: &str, rand_len: usize) -> OsString {
    let capacity = prefix
        .len()
        .saturating_add(suffix.len())
        .saturating_add(rand_len);
    let mut buf = OsString::with_capacity(capacity);
    buf.push(prefix);
    let mut char_buf = [0u8; 4];
    for c in repeat_with(fastrand::alphanumeric).take(rand_len) {
        buf.push(c.encode_utf8(&mut char_buf));
    }
    buf.push(suffix);
    buf
}

pub fn create_diagnostic_file(
    project: ProjectFile,
    trajectory_files: Vec<TrajectoryFile>,
    logs: Vec<String>,
) -> ChoreoResult<PathBuf> {
    let dir = std::env::temp_dir().join("choreo-diagnostics");
    fs::create_dir_all(&dir)?;
    let temp_path = dir.join(tmpname("choreo-diagnostics-", ".zip", 8));
    let writer = BufWriter::new(fs::File::create(&temp_path)?);
    let mut zip = zip::ZipWriter::new(writer);

    let options = zip::write::SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Stored)
        .unix_permissions(0o755);

    zip.start_file("project.chor", options)?;
    serde_json::to_writer(&mut zip, &project)?;

    for trajectory_file in trajectory_files {
        let trajectory_file_name = format!("{}.traj", trajectory_file.name);
        zip.start_file(trajectory_file_name, options)?;
        serde_json::to_writer(&mut zip, &trajectory_file)?;
    }

    zip.start_file("log.txt", options)?;
    for log in logs {
        zip.write_all(log.as_bytes())?;
    }

    zip.finish()?;
    Ok(temp_path)
}

pub fn get_log_lines(log_dir: Option<PathBuf>) -> Vec<String> {
    if let Some(dir) = log_dir {
        tracing::debug!("Looking for log files in {:}", dir.display());
        match std::fs::read_dir(dir) {
            Ok(dir_content) => {
                let mut log_files = dir_content
                    .filter_map(|entry| entry.ok())
                    .filter(|entry| entry.file_type().map(|ft| ft.is_file()).unwrap_or(false))
                    .filter(|entry| entry.file_name().to_string_lossy().ends_with(".log"))
                    .collect::<Vec<_>>();
                log_files.sort_by_key(|entry| {
                    entry
                        .metadata()
                        .map(|m| m.modified().unwrap_or(std::time::SystemTime::UNIX_EPOCH))
                        .unwrap_or(std::time::SystemTime::UNIX_EPOCH)
                });
                let log_file = log_files.last().ok_or(ChoreoError::FileNotFound(None));
                match log_file {
                    Ok(log_file) => {
                        return std::fs::read_to_string(log_file.path())
                            .unwrap_or_else(|e| {
                                tracing::error!("{e}");
                                String::new()
                            })
                            .lines()
                            .map(|line| format!("{:}\n", line))
                            .collect::<Vec<String>>()
                    }
                    Err(e) => {
                        tracing::error!("{e}");
                        Vec::new()
                    }
                }
            }
            Err(e) => {
                tracing::error!("{e}");
                Vec::new()
            }
        }
    } else {
        Vec::new()
    }
}
