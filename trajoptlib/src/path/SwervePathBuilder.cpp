// Copyright (c) TrajoptLib contributors

#if __GNUC__
#pragma GCC diagnostic ignored "-Wunused-parameter"
#endif

#include "trajopt/path/SwervePathBuilder.hpp"

#include <stdint.h>

#include <cassert>
#include <cmath>
#include <utility>

#include <frc/MathUtil.h>
#include <frc/geometry/Translation2d.h>
#include <frc/kinematics/SwerveDriveKinematics.h>
#include <frc/trajectory/Trajectory.h>
#include <frc/trajectory/TrajectoryGenerator.h>
#include <frc/trajectory/TrajectoryParameterizer.h>
#include <wpi/array.h>

#include "spline/CubicHermitePoseSplineHolonomic.hpp"
#include "spline/SplineParameterizer.hpp"
#include "spline/SplineUtil.hpp"
#include "trajopt/constraint/AngularVelocityMaxMagnitudeConstraint.hpp"
#include "trajopt/constraint/Constraint.hpp"
#include "trajopt/constraint/LinePointConstraint.hpp"
#include "trajopt/constraint/PointLineConstraint.hpp"
#include "trajopt/constraint/PointPointConstraint.hpp"
#include "trajopt/constraint/PoseEqualityConstraint.hpp"
#include "trajopt/constraint/TranslationEqualityConstraint.hpp"
#include "trajopt/obstacle/Obstacle.hpp"
#include "trajopt/solution/SwerveSolution.hpp"
#include "trajopt/util/Cancellation.hpp"
#include "trajopt/util/GenerateLinearInitialGuess.hpp"
#include "trajopt/util/GenerateSplineInitialGuess.hpp"
#include "trajopt/util/TrajoptUtil.hpp"

namespace trajopt {

SwervePath& SwervePathBuilder::GetPath() {
  return path;
}

void SwervePathBuilder::SetDrivetrain(SwerveDrivetrain drivetrain) {
  path.drivetrain = std::move(drivetrain);
}

void SwervePathBuilder::PoseWpt(size_t index, double x, double y,
                                double heading) {
  WptConstraint(index, PoseEqualityConstraint{x, y, heading});
  WptInitialGuessPoint(index, {x, y, {heading}});
}

void SwervePathBuilder::TranslationWpt(size_t index, double x, double y,
                                       double headingGuess) {
  WptConstraint(index, TranslationEqualityConstraint{x, y});
  WptInitialGuessPoint(index, {x, y, {headingGuess}});
}

void SwervePathBuilder::WptInitialGuessPoint(size_t wptIndex,
                                             const Pose2d& poseGuess) {
  NewWpts(wptIndex);
  initialGuessPoints.at(wptIndex).back() = poseGuess;
}

void SwervePathBuilder::SgmtInitialGuessPoints(
    size_t fromIndex, const std::vector<Pose2d>& sgmtPoseGuess) {
  NewWpts(fromIndex + 1);
  std::vector<Pose2d>& toInitialGuessPoints =
      initialGuessPoints.at(fromIndex + 1);
  toInitialGuessPoints.insert(toInitialGuessPoints.begin(),
                              sgmtPoseGuess.begin(), sgmtPoseGuess.end());
}

void SwervePathBuilder::AddBumpers(Bumpers&& newBumpers) {
  bumpers.emplace_back(std::move(newBumpers));
}

void SwervePathBuilder::WptObstacle(size_t index, const Obstacle& obstacle) {
  for (auto& _bumpers : bumpers) {
    auto minDistance = _bumpers.safetyDistance + obstacle.safetyDistance;

    size_t bumperCornerCount = _bumpers.points.size();
    size_t obstacleCornerCount = obstacle.points.size();
    if (bumperCornerCount == 1 && obstacleCornerCount == 1) {
      // if the bumpers and obstacle are only one point
      WptConstraint(index,
                    PointPointConstraint{_bumpers.points.at(0),
                                         obstacle.points.at(0), minDistance});
      return;
    }

    // robot bumper edge to obstacle point constraints
    for (auto& obstaclePoint : obstacle.points) {
      // First apply constraint for all but last edge
      for (size_t bumperCornerIndex = 0;
           bumperCornerIndex < bumperCornerCount - 1; bumperCornerIndex++) {
        WptConstraint(index, LinePointConstraint{
                                 _bumpers.points.at(bumperCornerIndex),
                                 _bumpers.points.at(bumperCornerIndex + 1),
                                 obstaclePoint, minDistance});
      }
      // apply to last edge: the edge connecting the last point to the first
      // must have at least three points to need this
      if (bumperCornerCount >= 3) {
        WptConstraint(index,
                      LinePointConstraint{
                          _bumpers.points.at(bumperCornerCount - 1),
                          _bumpers.points.at(0), obstaclePoint, minDistance});
      }
    }

    // obstacle edge to bumper corner constraints
    for (auto& bumperCorner : _bumpers.points) {
      if (obstacleCornerCount > 1) {
        for (size_t obstacleCornerIndex = 0;
             obstacleCornerIndex < obstacleCornerCount - 1;
             obstacleCornerIndex++) {
          WptConstraint(
              index,
              PointLineConstraint{
                  bumperCorner, obstacle.points.at(obstacleCornerIndex),
                  obstacle.points.at(obstacleCornerIndex + 1), minDistance});
        }
        if (obstacleCornerCount >= 3) {
          WptConstraint(index, PointLineConstraint{
                                   bumperCorner,
                                   obstacle.points.at(bumperCornerCount - 1),
                                   obstacle.points.at(0), minDistance});
        }
      } else {
        WptConstraint(index,
                      PointPointConstraint{bumperCorner, obstacle.points.at(0),
                                           minDistance});
      }
    }
  }
}

void SwervePathBuilder::SgmtObstacle(size_t fromIndex, size_t toIndex,
                                     const Obstacle& obstacle) {
  for (auto& _bumpers : bumpers) {
    auto minDistance = _bumpers.safetyDistance + obstacle.safetyDistance;

    size_t bumperCornerCount = _bumpers.points.size();
    size_t obstacleCornerCount = obstacle.points.size();
    if (bumperCornerCount == 1 && obstacleCornerCount == 1) {
      // if the bumpers and obstacle are only one point
      SgmtConstraint(fromIndex, toIndex,
                     PointPointConstraint{_bumpers.points.at(0),
                                          obstacle.points.at(0), minDistance});
      return;
    }

    // robot bumper edge to obstacle point constraints
    for (auto& obstaclePoint : obstacle.points) {
      // First apply constraint for all but last edge
      for (size_t bumperCornerIndex = 0;
           bumperCornerIndex < bumperCornerCount - 1; bumperCornerIndex++) {
        SgmtConstraint(
            fromIndex, toIndex,
            LinePointConstraint{_bumpers.points.at(bumperCornerIndex),
                                _bumpers.points.at(bumperCornerIndex + 1),
                                obstaclePoint, minDistance});
      }
      // apply to last edge: the edge connecting the last point to the first
      // must have at least three points to need this
      if (bumperCornerCount >= 3) {
        SgmtConstraint(fromIndex, toIndex,
                       LinePointConstraint{
                           _bumpers.points.at(bumperCornerCount - 1),
                           _bumpers.points.at(0), obstaclePoint, minDistance});
      }
    }

    // obstacle edge to bumper corner constraints
    for (auto& bumperCorner : _bumpers.points) {
      if (obstacleCornerCount > 1) {
        for (size_t obstacleCornerIndex = 0;
             obstacleCornerIndex < obstacleCornerCount - 1;
             obstacleCornerIndex++) {
          SgmtConstraint(
              fromIndex, toIndex,
              PointLineConstraint{
                  bumperCorner, obstacle.points.at(obstacleCornerIndex),
                  obstacle.points.at(obstacleCornerIndex + 1), minDistance});
        }
        if (obstacleCornerCount >= 3) {
          SgmtConstraint(
              fromIndex, toIndex,
              PointLineConstraint{bumperCorner,
                                  obstacle.points.at(bumperCornerCount - 1),
                                  obstacle.points.at(0), minDistance});
        }
      } else {
        SgmtConstraint(fromIndex, toIndex,
                       PointPointConstraint{bumperCorner, obstacle.points.at(0),
                                            minDistance});
      }
    }
  }
}

void SwervePathBuilder::ControlIntervalCounts(std::vector<size_t>&& counts) {
  controlIntervalCounts = std::move(counts);
}

const std::vector<size_t>& SwervePathBuilder::GetControlIntervalCounts() const {
  return controlIntervalCounts;
}

const std::vector<size_t> SwervePathBuilder::CalculateControlIntervalCounts()
    const {
  return CalculateControlIntervalCountsWithDt(path, initialGuessPoints, 0.1);
}

SwerveSolution SwervePathBuilder::CalculateInitialGuess() const {
  return GenerateLinearInitialGuess<SwerveSolution>(initialGuessPoints,
                                                    controlIntervalCounts);
}

SwerveSolution SwervePathBuilder::CalculateSplineInitialGuess() const {
  return CalculateSplineInitialGuessWithKinematicsAndConstraints(
      path, initialGuessPoints, controlIntervalCounts);
}

void SwervePathBuilder::AddIntermediateCallback(
    const std::function<void(SwerveSolution&, int64_t)> callback) {
  path.callbacks.push_back(callback);
}

void SwervePathBuilder::NewWpts(size_t finalIndex) {
  int64_t targetIndex = finalIndex;
  int64_t greatestIndex = path.waypoints.size() - 1;
  if (targetIndex > greatestIndex) {
    for (int64_t i = greatestIndex + 1; i <= targetIndex; ++i) {
      path.waypoints.emplace_back();
      initialGuessPoints.emplace_back(std::vector<Pose2d>{{0.0, 0.0, {0.0}}});
      if (i != 0) {
        controlIntervalCounts.push_back(40);
      }
    }
  }
}

}  // namespace trajopt
