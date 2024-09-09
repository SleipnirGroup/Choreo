// Copyright (c) TrajoptLib contributors

#pragma once

#include <vector>

#include <frc/MathUtil.h>
#include <frc/geometry/Pose2d.h>
#include <frc/geometry/Translation2d.h>
#include <frc/trajectory/Trajectory.h>
#include <frc/trajectory/TrajectoryGenerator.h>
#include <frc/trajectory/TrajectoryParameterizer.h>

#include "spline/CubicHermitePoseSplineHolonomic.hpp"
#include "spline/SplineParameterizer.hpp"
#include "spline/SplineUtil.hpp"
#include "trajopt/DifferentialTrajectoryGenerator.hpp"
#include "trajopt/geometry/Pose2.hpp"
#include "trajopt/path/Path.hpp"
#include "trajopt/util/TrajoptUtil.hpp"

namespace trajopt {

struct DifferentialSolution;

using PoseWithCurvature = frc::TrajectoryGenerator::PoseWithCurvature;

std::vector<std::vector<PoseWithCurvature>>
CalculateWaypointStatesWithControlIntervals(
    const std::vector<std::vector<Pose2d>> initialGuessPoints,
    std::vector<size_t> controlIntervalCounts) {
  std::vector<trajopt::CubicHermitePoseSplineHolonomic> splines =
      CubicPoseControlVectorsFromWaypoints(initialGuessPoints);

  size_t guessPoints = 0;
  for (const auto& guesses : initialGuessPoints) {
    guessPoints += guesses.size();
  }
  std::vector<std::vector<PoseWithCurvature>> waypoint_states;
  waypoint_states.reserve(guessPoints);
  for (size_t i = 0; i < guessPoints; ++i) {
    waypoint_states.push_back(std::vector<PoseWithCurvature>());
  }

  size_t trajIdx = 0;
  std::printf("sgmt1\n");
  waypoint_states.at(0).push_back(splines.at(trajIdx).GetPoint(0));
  std::printf("ctrlCount: [");
  for (auto count : controlIntervalCounts) {
    std::printf("%zd,", count);
  }
  std::printf("]\n");
  for (size_t sgmtIdx = 1; sgmtIdx < initialGuessPoints.size(); ++sgmtIdx) {
    auto guessPointsSize = initialGuessPoints.at(sgmtIdx).size();
    auto samplesForSgmt = controlIntervalCounts.at(sgmtIdx - 1);
    size_t samples = samplesForSgmt / guessPointsSize;
    for (size_t guessIdx = 0; guessIdx < guessPointsSize; ++guessIdx) {
      if (guessIdx == (guessPointsSize - 1)) {
        samples += (samplesForSgmt % guessPointsSize);
      }
      for (size_t sampleIdx = 1; sampleIdx < samples + 1; ++sampleIdx) {
        auto t = static_cast<double>(sampleIdx) / samples;
        const auto state = splines.at(trajIdx).GetPoint(t);
        waypoint_states.at(trajIdx + 1).push_back(state);
        // std::printf("%zd, x: %f, y: %f, t: %f\n",
        //               sampleIdx, state.pose.X().value(),
        //               state.pose.Y().value(), t.value());
      }
      std::printf(" size: %zd\n", waypoint_states.at(trajIdx + 1).size());
      ++trajIdx;
    }
  }
  return waypoint_states;
}

template <typename Solution>
inline Solution GenerateSplineInitialGuess(
    const std::vector<std::vector<Pose2d>>& initialGuessPoints,
    const std::vector<size_t> controlIntervalCounts) {
  auto sgmtPoints = CalculateWaypointStatesWithControlIntervals(
      initialGuessPoints, controlIntervalCounts);

  size_t wptCnt = controlIntervalCounts.size() + 1;
  size_t sampTot = GetIndex(controlIntervalCounts, wptCnt, 0);

  Solution initialGuess;

  initialGuess.x.reserve(sampTot);
  initialGuess.y.reserve(sampTot);
  if constexpr (std::same_as<Solution, DifferentialSolution>) {
    initialGuess.heading.reserve(sampTot);
  } else {
    initialGuess.thetacos.reserve(sampTot);
    initialGuess.thetasin.reserve(sampTot);
  }
  initialGuess.dt.reserve(sampTot);
  for (size_t i = 0; i < sampTot; ++i) {
    initialGuess.dt.push_back((wptCnt * 5.0) / sampTot);
  }

  for (auto sgmt : sgmtPoints) {
    for (auto pt : sgmt) {
      initialGuess.x.push_back(pt.first.X().value());
      initialGuess.y.push_back(pt.first.Y().value());
      if constexpr (std::same_as<Solution, DifferentialSolution>) {
        initialGuess.heading.push_back(pt.first.Rotation().Radians().value());
      } else {
        initialGuess.thetacos.push_back(pt.first.Rotation().Cos());
        initialGuess.thetasin.push_back(pt.first.Rotation().Sin());
      }
    }
  }
  return initialGuess;
}

}  // namespace trajopt
