use std::path::PathBuf;

use thiserror::Error;
use trajoptlib::error::TrajoptError;

#[derive(Error, Debug)]
#[allow(missing_docs)]
pub enum ChoreoError {
    #[error("Choreo io error: {0:?}")]
    Io(String),
    #[error("Choreo Int Cast error: {0:?}")]
    IntCast(String),
    #[error("Choreo Utf8 Assertion error: {0:?}")]
    Utf8(String),
    #[error("Choreo Json error: {0:?}")]
    Json(String),
    #[error("File saving error: {0:?}")]
    FileSave(&'static str),
    #[error("File writing error: {0:?}")]
    FileWrite(PathBuf),
    #[error("File reading error: {0:?}")]
    FileRead(PathBuf),
    #[error("File not found error: {0:?}")]
    FileNotFound(Option<PathBuf>),
    #[error("Sign error: {0:?} should be {1:?}")]
    Sign(&'static str, &'static str),
    #[error("Out Of Bounds error: {0:?} should be {1:?}")]
    OutOfBounds(&'static str, &'static str),
    #[error("Inequality error: {0:?} wasn't equal to {1:?}")]
    Inequality(&'static str, &'static str),
    #[error("TrajOpt error: {0:?}")]
    TrajOpt(TrajoptError),
    #[error("No Deploy Path error")]
    NoDeployPath,
    #[error("Solver Error: {0:?}")]
    SolverError(String),
    #[error("Heading Conflict error: waypoint {0:?} - {1:?}")]
    HeadingConflict(usize, &'static str),
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

impl serde::Serialize for ChoreoError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        format!("{self}").serialize(serializer)
    }
}
