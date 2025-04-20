// Copyright (c) TrajoptLib contributors

#include <vector>

#include <catch2/catch_test_macros.hpp>
#include <trajopt/util/trajopt_util.hpp>

TEST_CASE("TrajoptUtil - get_index()", "[TrajoptUtil]") {
  CHECK(trajopt::get_index({2, 3}, 0, 0) == 0);
  CHECK(trajopt::get_index({2, 3}, 1, 1) == 3);
  CHECK(trajopt::get_index({2, 3}, 1, 2) == 4);
  CHECK(trajopt::get_index({2, 3}, 2, 0) == 5);
}

TEST_CASE("TrajoptUtil - linspace()", "[TrajoptUtil]") {
  CHECK(trajopt::linspace(0.0, 2.0, 2) == std::vector{1.0, 2.0});
}
