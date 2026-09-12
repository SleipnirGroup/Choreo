// Copyright (c) Choreo contributors

#pragma once
#include <optional>
#include <string_view>
#include <variant>
#include <vector>

#ifdef CHOREO_WITH_TRAJOPT
#include <trajopt/constraint/constraint.hpp>
#include <trajopt/constraint/keep_out_region.hpp>
#endif
#include <wpi/util/json.hpp>

#include "../expr.hpp"
#include "../waypoint.hpp"
#include "constraint_scope.hpp"
