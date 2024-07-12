// Copyright (c) TrajoptLib contributors

#include "trajopt/path/SwervePathBuilder.hpp"

#include <utility>

#include "trajopt/solution/SwerveSolution.hpp"
#include "trajopt/util/GenerateLinearInitialGuess.hpp"

namespace trajopt {

void SwervePathBuilder::SetDrivetrain(SwerveDrivetrain drivetrain) {
  path.drivetrain = std::move(drivetrain);
}

SwerveSolution SwervePathBuilder::CalculateInitialGuess() const {
  return GenerateLinearInitialGuess<SwerveSolution>(initialGuessPoints,
                                                    controlIntervalCounts);
}

void SwervePathBuilder::AddIntermediateCallback(
    const std::function<void(SwerveSolution&, int64_t)> callback) {
  path.callbacks.push_back(callback);
}

}  // namespace trajopt
