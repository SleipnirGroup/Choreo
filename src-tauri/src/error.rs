use thiserror::Error;

#[derive(Error, Debug)]
pub enum ChoreoError {
    #[error("Choreo io error: {0:?}")]
    Io(#[from] std::io::Error),
    #[error("Choreo Int Cast error: {0:?}")]
    IntCast(#[from] std::num::TryFromIntError),
    #[error("Choreo Utf8 Assertion error: {0:?}")]
    Utf8(#[from] std::string::FromUtf8Error),
    #[error("Choreo Json error: {0:?}")]
    Json(#[from] serde_json::Error),
    #[error("File saving error: {0:?}")]
    FileSave(&'static str),
    #[error("Sign error: {0:?} should be {1:?}")]
    Sign(&'static str, &'static str),
    #[error("Out Of Bounds error: {0:?} should be {1:?}")]
    OutOfBounds(&'static str, &'static str),
    #[error("Inequality error: {0:?} wasn't equal to {1:?}")]
    Inequality(&'static str, &'static str),
    #[error("TrajOpt error: {0:?}")]
    TrajOpt(String),
}

// This is how the error will be propagated to the frontend,
// if more structure or metadata is needed, it can be added here
// although that would be a breaking change for the backend interface
impl serde::Serialize for ChoreoError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        format!("{self}").serialize(serializer)
    }
}
