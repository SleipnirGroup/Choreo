// Copyright (c) TrajoptLib contributors

#pragma once

#include "trajopt/drivetrain/DifferentialDrivetrain.hpp"
#include "trajopt/path/Path.hpp"
#include "trajopt/path/PathBuilder.hpp"
#include "trajopt/solution/DifferentialSolution.hpp"
#include "trajopt/util/SymbolExports.hpp"

namespace trajopt {
class TRAJOPT_DLLEXPORT DifferentialPathBuilder
    : public PathBuilder<DifferentialPath> {
 public:
  /**
   * Set the Drivetrain object
   *
   * @param drivetrain the new drivetrain
   */
  void SetDrivetrain(DifferentialDrivetrain drivetrain);

  /**
   * Calculate a discrete, linear initial guess of the x, y, and heading
   * of the robot that goes through each segment.
   *
   * @return the initial guess, as a solution
   */
  DifferentialSolution CalculateInitialGuess() const;
};
}  // namespace trajopt
