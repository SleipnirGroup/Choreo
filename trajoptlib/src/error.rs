use thiserror::Error;

/// Represents an error returned by TrajoptLib. Primarily exposes the Sleipnir
/// [solver exit status](https://github.com/SleipnirGroup/Sleipnir/blob/v0.5.0/include/sleipnir/optimization/solver/exit_status.hpp).
#[derive(Debug, Error)]
pub enum TrajoptError {
    #[error("Too few degrees of freedom")]
    /// The solver determined the problem to be overconstrained and gave up
    TooFewDOFs,
    #[error("Locally infeasible")]
    /// The solver determined the problem to be locally infeasible and gave up
    LocallyInfeasible,
    #[error("Globally infeasible")]
    /// The solver determined the problem to be globally infeasible and gave up
    GloballyInfeasible,
    #[error("Factorization failed")]
    /// The solver failed to factorize a matrix and gave up
    FactorizationFailed,
    #[error("Line search failed")]
    /// The solver failed to converge with its line search and gave up
    LineSearchFailed,
    #[error("Feasibility restoration failed")]
    /// The solver failed to reach the desired tolerance, and feasibility
    /// restoration failed to converge
    FeasibilityRestorationFailed,
    #[error("Nonfinite initial guess")]
    /// The solver encountered a nonfinite initial guess and gave up
    NonfiniteInitialGuess,
    #[error("Diverging iterates")]
    /// The solver encountered diverging primal iterates xₖ and/or sₖ and gave
    /// up
    DivergingIterates,
    #[error("Max iterations exceeded")]
    /// The solver returned its solution so far after exceeding the maximum
    /// number of iterations
    MaxIterationsExceeded,
    #[error("Timeout")]
    /// The solver returned its solution so far after exceeding the maximum
    /// elapsed wall clock time
    Timeout,
    #[error("Unparsable error code: {0}")]
    /// The solver returned an unparsable error code
    Unparsable(Box<str>),
    #[error("Unknown error: {0:?}")]
    /// Unknown error type
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
            -6 => Self::FeasibilityRestorationFailed,
            -7 => Self::NonfiniteInitialGuess,
            -8 => Self::DivergingIterates,
            -9 => Self::MaxIterationsExceeded,
            -10 => Self::Timeout,
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
