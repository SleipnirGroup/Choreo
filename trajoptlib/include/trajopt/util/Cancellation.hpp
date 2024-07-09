// Copyright (c) TrajoptLib contributors

#pragma once

#include <atomic>

#include "trajopt/util/SymbolExports.hpp"

namespace trajopt {

TRAJOPT_DLLEXPORT std::atomic<int>& GetCancellationFlag();

}  // namespace trajopt
