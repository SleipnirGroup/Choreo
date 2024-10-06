// Copyright (c) TrajoptLib contributors

#include "spline/SplineUtil.hpp"

#include <vector>

#include <frc/geometry/Rotation2d.h>
#include <frc/geometry/Translation2d.h>
#include <frc/spline/SplineHelper.h>

#include "spline/CubicHermitePoseSplineHolonomic.hpp"

namespace trajopt {

std::vector<CubicHermitePoseSplineHolonomic>
CubicPoseControlVectorsFromWaypoints(
    const std::vector<std::vector<Pose2d>> initialGuessPoints) {
  size_t totalGuessPoints = 0;
  for (const auto& points : initialGuessPoints) {
    totalGuessPoints += points.size();
  }
  std::vector<frc::Translation2d> flatTranslationPoints;
  std::vector<frc::Rotation2d> flatHeadings;
  flatTranslationPoints.reserve(totalGuessPoints);
  flatHeadings.reserve(totalGuessPoints);

  // populate translation and heading vectors
  for (const auto& guessPoints : initialGuessPoints) {
    for (const auto& guessPoint : guessPoints) {
      flatTranslationPoints.emplace_back(
          units::meter_t(guessPoint.Translation().X()),
          units::meter_t(guessPoint.Translation().Y()));
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
  const frc::Pose2d start{flatTranslationPoints.front(), startSplineAngle};
  const frc::Pose2d end{flatTranslationPoints.back(), endSplineAngle};

  // use all interior points to create the path spline
  std::vector<frc::Translation2d> interiorPoints{
      flatTranslationPoints.begin() + 1, flatTranslationPoints.end() - 1};

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
}  // namespace trajopt
