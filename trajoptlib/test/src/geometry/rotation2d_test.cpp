// Copyright (c) TrajoptLib contributors

#include <numbers>

#include <catch2/catch_approx.hpp>
#include <catch2/catch_test_macros.hpp>
#include <trajopt/geometry/rotation2.hpp>

inline constexpr double deg2rad(double deg) {
  return deg * std::numbers::pi / 180.0;
}

TEST_CASE("Rotation2d - Radians to degrees", "[Rotation2d]") {
  const trajopt::Rotation2d rot1{std::numbers::pi / 3.0};
  const trajopt::Rotation2d rot2{std::numbers::pi / 4.0};

  CHECK(rot1.degrees() == 60.0);
  CHECK(rot2.degrees() == Catch::Approx(45.0).margin(1e-9));
}

TEST_CASE("Rotation2d - Degrees to radians", "[Rotation2d]") {
  const auto rot1 = trajopt::Rotation2d{std::numbers::pi / 4};
  const auto rot2 = trajopt::Rotation2d{std::numbers::pi / 6};

  CHECK(rot1.radians() == Catch::Approx(std::numbers::pi / 4.0).margin(1e-9));
  CHECK(rot2.radians() == std::numbers::pi / 6.0);
}

TEST_CASE("Rotation2d - RotateByFromZero", "[Rotation2d]") {
  const trajopt::Rotation2d zero;
  auto rotated = zero + trajopt::Rotation2d{std::numbers::pi / 2};

  CHECK(rotated.radians() == std::numbers::pi / 2.0);
  CHECK(rotated.degrees() == 90.0);
}

TEST_CASE("Rotation2d - RotateByNonZero", "[Rotation2d]") {
  auto rot = trajopt::Rotation2d{std::numbers::pi / 2};
  rot = rot + trajopt::Rotation2d{std::numbers::pi / 6};

  CHECK(rot.degrees() == 120.0);
}

TEST_CASE("Rotation2d - Minus", "[Rotation2d]") {
  const auto rot1 = trajopt::Rotation2d{deg2rad(70.0)};
  const auto rot2 = trajopt::Rotation2d{std::numbers::pi / 6};

  CHECK((rot1 - rot2).degrees() == Catch::Approx(40).margin(1e-9));
}

TEST_CASE("Rotation2d - Constexpr", "[Rotation2d]") {
  constexpr trajopt::Rotation2d default_ctor;

  static_assert(default_ctor.cos() == 1.0);
  static_assert(default_ctor.sin() == 0.0);
}
