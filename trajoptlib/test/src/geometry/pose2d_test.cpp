// Copyright (c) TrajoptLib contributors

#include <numbers>

#include <catch2/catch_test_macros.hpp>
#include <catch2/matchers/catch_matchers_floating_point.hpp>
#include <trajopt/geometry/pose2.hpp>

using Catch::Matchers::WithinAbs;

inline constexpr double deg2rad(double deg) {
  return deg * std::numbers::pi / 180.0;
}

TEST_CASE("Pose2d - rotate_by", "[Pose2d]") {
  constexpr double x = 1.0;
  constexpr double y = 2.0;
  const trajopt::Pose2d initial{x, y, std::numbers::pi / 4};

  const trajopt::Rotation2d rotation{5.0 * std::numbers::pi / 180.0};
  const auto rotated = initial.rotate_by(rotation);

  // Translation is rotated by CCW rotation matrix
  double c = rotation.cos();
  double s = rotation.sin();
  CHECK(rotated.x() == c * x - s * y);
  CHECK(rotated.y() == s * x + c * y);
  CHECK_THAT(
      rotated.rotation().degrees(),
      WithinAbs(initial.rotation().degrees() + rotation.degrees(), 1e-9));
}

TEST_CASE("Pose2d - Constexpr", "[Pose2d]") {
  constexpr trajopt::Pose2d default_constructed;
  constexpr trajopt::Pose2d translation_rotation{
      trajopt::Translation2d{0.0, 1.0}, trajopt::Rotation2d{}};

  static_assert(default_constructed.x() == 0.0);
  static_assert(translation_rotation.y() == 1.0);
}
