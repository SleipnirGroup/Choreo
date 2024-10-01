// Copyright (c) TrajoptLib contributors

#pragma once

#include <cmath>
#include <concepts>
#include <span>
#include <utility>
#include <vector>

#include <Eigen/Core>
#include <unsupported/Eigen/Splines>

#include "trajopt/geometry/Pose2.hpp"
#include "trajopt/geometry/Rotation2.hpp"
#include "trajopt/geometry/Translation2.hpp"
#include "trajopt/spline/CubicHermitePoseSplineHolonomic.hpp"
#include "trajopt/spline/SplineHelper.hpp"
#include "trajopt/util/TrajoptUtil.hpp"

namespace trajopt {

// TODO: implement for diffy drive
struct DifferentialSolution;

using PoseWithCurvature = std::pair<Pose2d, double>;

inline std::vector<CubicHermitePoseSplineHolonomic> splinesFromWaypoints(
    const std::vector<std::vector<Pose2d>> initialGuessPoints) {
  size_t totalGuessPoints = 0;
  for (const auto& points : initialGuessPoints) {
    totalGuessPoints += points.size();
  }
  std::vector<Translation2d> flatTranslationPoints;
  std::vector<Rotation2d> flatHeadings;
  flatTranslationPoints.reserve(totalGuessPoints);
  flatHeadings.reserve(totalGuessPoints);

  // populate translation and heading vectors
  for (const auto& guessPoints : initialGuessPoints) {
    for (const auto& guessPoint : guessPoints) {
      flatTranslationPoints.emplace_back(guessPoint.Translation().X(),
                                         guessPoint.Translation().Y());
      flatHeadings.emplace_back(guessPoint.Rotation().Cos(),
                                guessPoint.Rotation().Sin());
    }
  }

  // calculate angles and pose for start and end of path spline
  const auto startSplineAngle =
      (flatTranslationPoints.at(1) - flatTranslationPoints.at(0)).Angle();
  const auto endSplineAngle =
      (flatTranslationPoints.back() -
       flatTranslationPoints.at(flatTranslationPoints.size() - 2))
          .Angle();
  const Pose2d start{flatTranslationPoints.front(), startSplineAngle};
  const Pose2d end{flatTranslationPoints.back(), endSplineAngle};

  // use all interior points to create the path spline
  std::vector<Translation2d> interiorPoints{flatTranslationPoints.begin() + 1,
                                            flatTranslationPoints.end() - 1};

  const auto splineControlVectors =
      frc::SplineHelper::CubicControlVectorsFromWaypoints(start, interiorPoints,
                                                          end);
  const auto splines_temp = frc::SplineHelper::CubicSplinesFromControlVectors(
      splineControlVectors.front(), interiorPoints,
      splineControlVectors.back());

  std::vector<trajopt::CubicHermitePoseSplineHolonomic> splines;
  splines.reserve(splines_temp.size());
  for (size_t i = 1; i <= splines_temp.size(); ++i) {
    splines.emplace_back(splines_temp.at(i - 1), flatHeadings.at(i - 1),
                         flatHeadings.at(i));
  }
  return splines;
}

template <typename Solution>
inline Solution GenerateSplineInitialGuess(
    const std::vector<std::vector<Pose2d>>& initialGuessPoints,
    const std::vector<size_t> controlIntervalCounts) {
  std::vector<trajopt::CubicHermitePoseSplineHolonomic> splines =
      splinesFromWaypoints(initialGuessPoints);

  std::vector<std::vector<PoseWithCurvature>> sgmtPoints;
  for (auto _i = 0; _i < initialGuessPoints.size(); ++_i) {
    for (auto _j = 0; _j < initialGuessPoints.at(_i).size(); ++_j) {
      sgmtPoints.push_back(std::vector<PoseWithCurvature>());
    }
  }

  size_t trajIdx = 0;
  sgmtPoints.at(0).push_back(splines.at(trajIdx).GetPoint(0));
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
        sgmtPoints.at(trajIdx + 1).push_back(state);
        // std::printf("%zd, x: %f, y: %f, t: %f\n",
        //               sampleIdx, state.pose.X().value(),
        //               state.pose.Y().value(), t.value());
      }
      std::printf(" size: %zd\n", sgmtPoints.at(trajIdx + 1).size());
      ++trajIdx;
    }
  }

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
      initialGuess.x.push_back(pt.first.X());
      initialGuess.y.push_back(pt.first.Y());
      if constexpr (std::same_as<Solution, DifferentialSolution>) {
        initialGuess.heading.push_back(pt.first.Rotation().Radians());
      } else {
        initialGuess.thetacos.push_back(pt.first.Rotation().Cos());
        initialGuess.thetasin.push_back(pt.first.Rotation().Sin());
      }
    }
  }
  return initialGuess;
}

}  // namespace trajopt
