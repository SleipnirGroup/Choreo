// Copyright (c) TrajoptLib contributors

#pragma once

#include <cmath>
#include <concepts>
#include <span>
#include <vector>

#include <Eigen/Core>
#include <unsupported/Eigen/Splines>

#include "trajopt/geometry/Pose2.hpp"
#include "trajopt/geometry/Rotation2.hpp"
#include "trajopt/geometry/Translation2.hpp"
#include "trajopt/spline/PoseSplineHolonomic.hpp"
#include "trajopt/util/TrajoptUtil.hpp"

namespace trajopt {

struct DifferentialSolution;

// // TODO: Replace with std::vector.append_range() from C++23
// template <typename T>
// inline void append_vector(std::vector<T>& base,
//                           const std::vector<T>& newItems) {
//   base.insert(base.end(), newItems.begin(), newItems.end());
// }

inline PoseSplineHolonomic poseSplineFromGuessPoints(
    const std::vector<std::vector<Pose2d>>& initialGuessPoints) {
  size_t num_pts = 0;
  for (const auto& guesses : initialGuessPoints) {
    num_pts += guesses.size();
  }
  std::vector<size_t> times;
  times.reserve(num_pts);

  std::vector<Pose2d> flatPoses;
  flatPoses.reserve(num_pts);

  double t = 0.0;
  times.push_back(0.0);
  for (auto points : initialGuessPoints) {
    for (auto point : points) {
      flatPoses.push_back(point);
      times.push_back(t);
      t += 1.0;
      printf("pose: %.2f, %.2f  \n", point.X(), point.Y());
    }
  }
  return PoseSplineHolonomic(flatPoses);
}

template <typename Solution>
inline Solution GenerateSplineInitialGuess(
    const std::vector<std::vector<Pose2d>>& initialGuessPoints,
    const std::vector<size_t> controlIntervalCounts) {
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

  size_t guessPoints = 0;
  for (const auto& guesses : initialGuessPoints) {
    guessPoints += guesses.size();
  }
  printf("guesses size: %zd", guessPoints);
  auto poseSpline = poseSplineFromGuessPoints(initialGuessPoints);
  std::cout << "POSE SPLINE: " << std::endl << poseSpline.translationSpline.ctrls() << std::endl;
  std::vector<std::vector<Pose2d>> sgmtPoints;
  sgmtPoints.reserve(guessPoints);
  for (size_t i = 0; i < guessPoints; ++i) {
    sgmtPoints.push_back(std::vector<Pose2d>());
  }

  size_t trajIdx = 0;
  std::printf("sgmt1\n");
  sgmtPoints.at(0).push_back(poseSpline.getPoint(0.0));
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
        auto t = static_cast<double>(sampleIdx) / samples;  // + trajIdx
        const auto state = poseSpline.getPoint(static_cast<double>(trajIdx) + t);
        sgmtPoints.at(trajIdx + 1).push_back(state);
        // std::printf("%zd, x: %f, y: %f, t: %f\n",
        //               sampleIdx, state.pose.X().value(),
        //               state.pose.Y().value(), t.value());
      }
      std::printf(" size: %zd\n", sgmtPoints.at(trajIdx + 1).size());
      ++trajIdx;
    }
  }

  for (auto sgmt : sgmtPoints) {
    for (auto pose : sgmt) {
      initialGuess.x.push_back(pose.X());
      initialGuess.y.push_back(pose.Y());
      if constexpr (std::same_as<Solution, DifferentialSolution>) {
        initialGuess.heading.push_back(pose.Rotation().Radians());
      } else {
        initialGuess.thetacos.push_back(pose.Rotation().Cos());
        initialGuess.thetasin.push_back(pose.Rotation().Sin());
      }
    }
  }

  std::printf("init guess: [");
  for (auto i = 0; i < initialGuess.x.size(); ++i) {
    std::printf("x: %.2f, y: %.2f, cos: %.2f, sin: %.2f", 
    initialGuess.x[i], initialGuess.y[i], initialGuess.thetacos[i], initialGuess.thetasin[i]);
  }
  std::printf("]\n");

  return initialGuess;
}

}  // namespace trajopt
