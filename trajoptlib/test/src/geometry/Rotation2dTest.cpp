// Copyright (c) TrajoptLib contributors

#include <numbers>

#include <catch2/catch_approx.hpp>
#include <catch2/catch_test_macros.hpp>
#include <trajopt/geometry/Rotation2.hpp>

inline constexpr double deg2rad(double deg) {
  return deg * std::numbers::pi / 180.0;
}

TEST_CASE("Rotation2d - RadiansToDegrees", "[Rotation2d]") {
  const trajopt::Rotation2d rot1{std::numbers::pi / 3.0};
  const trajopt::Rotation2d rot2{std::numbers::pi / 4.0};

  CHECK(rot1.Degrees() == 60.0);
  CHECK(rot2.Degrees() == Catch::Approx(45.0).margin(1e-9));
}

TEST_CASE("Rotation2d - DegreesToRadians", "[Rotation2d]") {
  const auto rot1 = trajopt::Rotation2d{std::numbers::pi / 4};
  const auto rot2 = trajopt::Rotation2d{std::numbers::pi / 6};

  CHECK(rot1.Radians() == Catch::Approx(std::numbers::pi / 4.0).margin(1e-9));
  CHECK(rot2.Radians() == std::numbers::pi / 6.0);
}

TEST_CASE("Rotation2d - RotateByFromZero", "[Rotation2d]") {
  const trajopt::Rotation2d zero;
  auto rotated = zero + trajopt::Rotation2d{std::numbers::pi / 2};

  CHECK(rotated.Radians() == std::numbers::pi / 2.0);
  CHECK(rotated.Degrees() == 90.0);
}

TEST_CASE("Rotation2d - RotateByNonZero", "[Rotation2d]") {
  auto rot = trajopt::Rotation2d{std::numbers::pi / 2};
  rot = rot + trajopt::Rotation2d{std::numbers::pi / 6};

  CHECK(rot.Degrees() == 120.0);
}

TEST_CASE("Rotation2d - Minus", "[Rotation2d]") {
  const auto rot1 = trajopt::Rotation2d{deg2rad(70.0)};
  const auto rot2 = trajopt::Rotation2d{std::numbers::pi / 6};

  CHECK((rot1 - rot2).Degrees() == Catch::Approx(40).margin(1e-9));
}

TEST_CASE("Rotation2d - Constexpr", "[Rotation2d]") {
  constexpr trajopt::Rotation2d defaultCtor;

  static_assert(defaultCtor.Cos() == 1.0);
  static_assert(defaultCtor.Sin() == 0.0);
}
