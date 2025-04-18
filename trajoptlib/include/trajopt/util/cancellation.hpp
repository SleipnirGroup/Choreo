// Copyright (c) TrajoptLib contributors

#pragma once

#include <atomic>

#include "trajopt/util/symbol_exports.hpp"

namespace trajopt {

TRAJOPT_DLLEXPORT std::atomic<int>& get_cancellation_flag();

}  // namespace trajopt
