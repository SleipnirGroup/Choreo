use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use thiserror::Error;
use trajoptlib::error::TrajoptError;

#[derive(Error, Debug, Serialize, Deserialize)]
#[allow(missing_docs)]
#[serde(tag = "type", content = "content")]
pub enum ChoreoError {
    #[error("IO error: {0}")]
    Io(String),
    #[error("Int Cast error: {0}")]
    IntCast(String),
    #[error("Utf8 Assertion error: {0}")]
    Utf8(String),
    #[error("Json error: {0}")]
    Json(String),
    #[error("Zip Error: {0}")]
    ZipError(String),
    #[error("IPC error: {0}")]
    Ipc(String),
    #[error("Subprocess error: {0}")]
    Subprocess(String),
    #[error("File writing error: {0}")]
    FileWrite(PathBuf),
    #[error("File reading error: {0}")]
    FileRead(PathBuf),
    #[error("File not found error: {0:?}")]
    FileNotFound(Option<PathBuf>),
    #[error("Calculation error: {0}")]
    Calculation(String),
    #[error("TrajOpt error: {0}")]
    TrajOpt(String),
    #[error("No Deploy Path error")]
    NoDeployPath,
    #[error("Heading Conflict error: waypoint {0} - {1}")]
    HeadingConflict(usize, String),
    #[error("Remote Generation Error: {0}")]
    RemoteGenerationError(Box<ChoreoError>),
}

impl ChoreoError {
    #[inline]
    pub fn remote(e: impl Into<ChoreoError>) -> Self {
        Self::RemoteGenerationError(Box::new(e.into()))
    }

    pub fn sign<T: std::fmt::Display>(actual: T, expected: T) -> Self {
        Self::Calculation(format!("Sign error: {} should be {}", actual, expected))
    }

    pub fn out_of_bounds<T: std::fmt::Display>(actual: T, expected: T) -> Self {
        Self::Calculation(format!(
            "Out Of Bounds error: {} should be {}",
            actual, expected
        ))
    }

    pub fn inequality<T: std::fmt::Display>(actual: T, expected: T) -> Self {
        Self::Calculation(format!(
            "Inequality error: {} wasn't equal to {}",
            actual, expected
        ))
    }
}

impl From<std::io::Error> for ChoreoError {
    fn from(e: std::io::Error) -> Self {
        Self::Io(e.to_string())
    }
}

impl From<std::num::TryFromIntError> for ChoreoError {
    fn from(e: std::num::TryFromIntError) -> Self {
        Self::IntCast(e.to_string())
    }
}

impl From<std::str::Utf8Error> for ChoreoError {
    fn from(e: std::str::Utf8Error) -> Self {
        Self::Utf8(e.to_string())
    }
}

impl From<serde_json::Error> for ChoreoError {
    fn from(e: serde_json::Error) -> Self {
        Self::Json(e.to_string())
    }
}

impl From<zip::result::ZipError> for ChoreoError {
    fn from(e: zip::result::ZipError) -> Self {
        Self::ZipError(e.to_string())
    }
}

impl From<TrajoptError> for ChoreoError {
    fn from(e: TrajoptError) -> Self {
        Self::TrajOpt(e.to_string())
    }
}

impl From<ipc_channel::Error> for ChoreoError {
    fn from(e: ipc_channel::Error) -> Self {
        Self::Io(e.to_string())
    }
}
