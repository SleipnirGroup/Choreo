// Copyright (c) TrajoptLib contributors

#include "trajopt/util/cancellation.hpp"

namespace trajopt {

std::atomic<int>& get_cancellation_flag() {
  static std::atomic<int> flag{0};
  return flag;
}

}  // namespace trajopt
