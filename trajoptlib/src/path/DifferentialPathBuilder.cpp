// Copyright (c) TrajoptLib contributors

#include "trajopt/path/DifferentialPathBuilder.hpp"

#include <utility>

#include "trajopt/solution/DifferentialSolution.hpp"
#include "trajopt/util/GenerateLinearInitialGuess.hpp"

namespace trajopt {

void DifferentialPathBuilder::SetDrivetrain(DifferentialDrivetrain drivetrain) {
  path.drivetrain = std::move(drivetrain);
}

DifferentialSolution DifferentialPathBuilder::CalculateInitialGuess() const {
  return GenerateLinearInitialGuess<DifferentialSolution>(
      initialGuessPoints, controlIntervalCounts);
}

void DifferentialPathBuilder::AddIntermediateCallback(
    const std::function<void(DifferentialSolution&, int64_t)> callback) {
  path.callbacks.push_back(callback);
}

}  // namespace trajopt
