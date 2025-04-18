// Copyright (c) TrajoptLib contributors

#include <vector>

#include <catch2/catch_test_macros.hpp>
#include <trajopt/util/trajopt_util.hpp>

TEST_CASE("TrajoptUtil - GetIndex()", "[TrajoptUtil]") {
  CHECK(trajopt::GetIndex({2, 3}, 0, 0) == 0);
  CHECK(trajopt::GetIndex({2, 3}, 1, 1) == 3);
  CHECK(trajopt::GetIndex({2, 3}, 1, 2) == 4);
  CHECK(trajopt::GetIndex({2, 3}, 2, 0) == 5);
}

TEST_CASE("TrajoptUtil - Linspace()", "[TrajoptUtil]") {
  CHECK(trajopt::Linspace(0.0, 2.0, 2) == std::vector{1.0, 2.0});
}
