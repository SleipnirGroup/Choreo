
use std::{ffi::OsString, fs, io::{BufWriter, Write}, iter::repeat_with, path::PathBuf};

use zip;

use crate::{spec::{project::ProjectFile, traj::TrajFile}, ChoreoResult};

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

pub fn create_diagnostic_file(project: ProjectFile, trajfiles: Vec<TrajFile>, logs: Vec<String>) -> ChoreoResult<PathBuf> {
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

    for trajfile in trajfiles {
        let trajfile_name = format!("{}.traj", trajfile.name);
        zip.start_file(trajfile_name, options)?;
        serde_json::to_writer(&mut zip, &trajfile)?;
    }

    zip.start_file("log.txt", options)?;
    for log in logs {
        zip.write_all(log.as_bytes())?;
    }

    zip.finish()?;
    Ok(temp_path)
}