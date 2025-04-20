use thiserror::Error;

#[derive(Debug, Error)]
// messages taken from https://github.com/SleipnirGroup/Sleipnir/blob/main/include/sleipnir/optimization/solver/exit_status.hpp#L52-L71
pub enum TrajoptError {
    #[error("Too few degrees of freedom")]
    TooFewDOFs,
    #[error("Locally infeasible")]
    LocallyInfeasible,
    #[error("Factorization failed")]
    FactorizationFailed,
    #[error("Line search failed")]
    LineSearchFailed,
    #[error("Nonfinite initial cost or constraints")]
    NonfiniteInitialCostOrConstraints,
    #[error("Diverging iterates")]
    DivergingIterates,
    #[error("Max iterations exceeded")]
    MaxIterationsExceeded,
    #[error("Timeout")]
    Timeout,
    #[error("Unparsable error code: {0}")]
    Unparsable(Box<str>),
    #[error("Unknown error: {0:?}")]
    Unknown(i8),
}

impl From<i8> for TrajoptError {
    fn from(value: i8) -> Self {
        match value {
            -1 => Self::TooFewDOFs,
            -2 => Self::LocallyInfeasible,
            -3 => Self::FactorizationFailed,
            -4 => Self::LineSearchFailed,
            -5 => Self::NonfiniteInitialCostOrConstraints,
            -6 => Self::DivergingIterates,
            -7 => Self::MaxIterationsExceeded,
            -8 => Self::Timeout,
            _ => Self::Unknown(value),
        }
    }
}

impl serde::Serialize for TrajoptError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        format!("{self}").serialize(serializer)
    }
}
