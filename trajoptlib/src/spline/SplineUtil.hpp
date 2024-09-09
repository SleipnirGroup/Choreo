// Copyright (c) TrajoptLib contributors

#pragma once

#include <vector>

#include "spline/CubicHermitePoseSplineHolonomic.hpp"
#include "trajopt/geometry/Pose2.hpp"

namespace trajopt {

std::vector<CubicHermitePoseSplineHolonomic>
CubicPoseControlVectorsFromWaypoints(
    const std::vector<std::vector<Pose2d>> initialGuessPoints);

}  // namespace trajopt
