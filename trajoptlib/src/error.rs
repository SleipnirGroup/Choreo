use thiserror::Error;

#[derive(Debug, Error)]
// messages taken from https://github.com/SleipnirGroup/Sleipnir/blob/main/include/sleipnir/optimization/SolverExitCondition.hpp#L47-L78
pub enum TrajoptError {
    #[error("The solver determined the problem to be overconstrained and gave up")]
    TooFewDOF,
    #[error("The solver determined the problem to be locally infeasible and gave up")]
    LocallyInfeasible,
    #[error("The solver failed to reach the desired tolerance, and feasibility restoration failed to converge")]
    FeasibilityRestorationFailed,
    #[error("The solver encountered nonfinite initial cost or constraints and gave up")]
    NonfiniteInitialCostOrConstraints,
    #[error("The solver encountered diverging primal iterates xₖ and/or sₖ and gave up")]
    DivergingIterates,
    #[error(
        "The solver returned its solution so far after exceeding the maximum number of iterations"
    )]
    MaxIterationsExceeded,
    #[error("The solver returned its solution so far after exceeding the maximum elapsed wall clock time")]
    Timeout,
    #[error("The solver returned an unparsable error code: {0}")]
    Unparsable(Box<str>),
    #[error("Unknown error: {0:?}")]
    Unknown(i8),
}

impl From<i8> for TrajoptError {
    fn from(value: i8) -> Self {
        match value {
            -1 => Self::TooFewDOF,
            -2 => Self::LocallyInfeasible,
            -3 => Self::FeasibilityRestorationFailed,
            -4 => Self::NonfiniteInitialCostOrConstraints,
            -5 => Self::DivergingIterates,
            -6 => Self::MaxIterationsExceeded,
            -7 => Self::Timeout,
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
