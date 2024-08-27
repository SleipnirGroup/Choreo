// Copyright (c) TrajoptLib contributors

#include <vector>

#include <catch2/catch_test_macros.hpp>
#include <trajopt/util/TrajoptUtil.hpp>

TEST_CASE("TrajoptUtil - GetIndex()", "[TrajoptUtil]") {
  auto result0 = trajopt::GetIndex({2, 3}, 0, 0);
  auto result1 = trajopt::GetIndex({2, 3}, 1, 1);
  auto result2 = trajopt::GetIndex({2, 3}, 2, 2);
  auto result3 = trajopt::GetIndex({2, 3}, 3, 0);
  CHECK(result0 == 0);
  CHECK(result1 == 2);
  CHECK(result2 == 5);
  CHECK(result3 == 6);
}

TEST_CASE("TrajoptUtil - Linspace()", "[TrajoptUtil]") {
  auto result = trajopt::Linspace(0.0, 2.0, 2);
  std::vector correct{1.0, 2.0};
  CHECK(result == correct);
}
