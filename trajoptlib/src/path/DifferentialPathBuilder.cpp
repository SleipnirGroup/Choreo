// Copyright (c) TrajoptLib contributors

#include "trajopt/path/DifferentialPathBuilder.hpp"

#include <utility>

#include "trajopt/drivetrain/DifferentialDrivetrain.hpp"
#include "trajopt/path/Path.hpp"
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

}  // namespace trajopt
