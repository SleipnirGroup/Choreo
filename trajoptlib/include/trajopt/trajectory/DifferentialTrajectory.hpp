// Copyright (c) TrajoptLib contributors

#pragma once

#include <cmath>
#include <utility>
#include <vector>

#include "trajopt/solution/DifferentialSolution.hpp"
#include "trajopt/trajectory/DifferentialTrajectorySample.hpp"
#include "trajopt/util/SymbolExports.hpp"

namespace trajopt {

/**
 * Differential trajectory.
 */
class TRAJOPT_DLLEXPORT DifferentialTrajectory {
 public:
  /// Trajectory samples.
  std::vector<DifferentialTrajectorySample> samples;

  DifferentialTrajectory() = default;

  /**
   * Construct a DifferentialTrajectory from samples.
   *
   * @param samples The samples.
   */
  explicit DifferentialTrajectory(
      std::vector<DifferentialTrajectorySample> samples)
      : samples{std::move(samples)} {}

  /**
   * Construct a DifferentialTrajectory from a swerve solution.
   *
   * @param solution The swerve solution.
   */
  explicit DifferentialTrajectory(const DifferentialSolution& solution) {
    double ts = 0.0;
    for (size_t samp = 0; samp < solution.x.size(); ++samp) {
      if (samp != 0) {
        ts += solution.dt[samp - 1];
      }

      samples.emplace_back(
          ts, solution.x[samp], solution.y[samp],
          std::atan2(solution.thetasin[samp], solution.thetacos[samp]),
          solution.vL[samp], solution.vR[samp]);
    }
  }
};

}  // namespace trajopt
