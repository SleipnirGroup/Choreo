use thiserror::Error;

// Error messages and codes from:
// https://github.com/SleipnirGroup/Sleipnir/blob/4e07c8835dc589e496a66d3320e0990668fea268/include/sleipnir/optimization/solver/exit_status.hpp

#[derive(Debug, Error)]
pub enum TrajoptError {
    #[error("Too few degrees of freedom")]
    TooFewDOFs,
    #[error("Locally infeasible")]
    LocallyInfeasible,
    #[error("Globally infeasible")]
    GloballyInfeasible,
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
            -3 => Self::GloballyInfeasible,
            -4 => Self::FactorizationFailed,
            -5 => Self::LineSearchFailed,
            -6 => Self::NonfiniteInitialCostOrConstraints,
            -7 => Self::DivergingIterates,
            -8 => Self::MaxIterationsExceeded,
            -9 => Self::Timeout,
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
