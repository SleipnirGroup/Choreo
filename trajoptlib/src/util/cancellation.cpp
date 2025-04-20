// Copyright (c) TrajoptLib contributors

#include "trajopt/util/cancellation.hpp"

namespace trajopt {

std::atomic<int>& GetCancellationFlag() {
  static std::atomic<int> flag{0};
  return flag;
}

}  // namespace trajopt
