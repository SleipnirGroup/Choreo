// Copyright (c) Choreo contributors

#pragma once
#include <print>
#include <vector>

#include <choreo/constraint_data/constraint_data.hpp>
#include <choreo/parameters.hpp>
#include <trajopt/geometry/pose2.hpp>
#include <trajopt/path/path_builder.hpp>
#include <wpi/units/time.hpp>

#include "segment.hpp"
namespace choreo {
std::vector<Segment> convert_to_segments(const Parameters& params);
}  // namespace choreo
