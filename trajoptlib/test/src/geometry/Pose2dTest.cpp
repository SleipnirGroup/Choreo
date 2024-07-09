// Copyright (c) TrajoptLib contributors

#include <numbers>

#include <catch2/catch_approx.hpp>
#include <catch2/catch_test_macros.hpp>
#include <trajopt/geometry/Pose2.hpp>

inline constexpr double deg2rad(double deg) {
  return deg * std::numbers::pi / 180.0;
}

TEST_CASE("Pose2d - RotateBy", "[Pose2d]") {
  constexpr double x = 1.0;
  constexpr double y = 2.0;
  const trajopt::Pose2d initial{x, y, std::numbers::pi / 4};

  const trajopt::Rotation2d rotation{5.0 * std::numbers::pi / 180.0};
  const auto rotated = initial.RotateBy(rotation);

  // Translation is rotated by CCW rotation matrix
  double c = rotation.Cos();
  double s = rotation.Sin();
  CHECK(rotated.X() == c * x - s * y);
  CHECK(rotated.Y() == s * x + c * y);
  CHECK(rotated.Rotation().Degrees() ==
        Catch::Approx(initial.Rotation().Degrees() + rotation.Degrees())
            .margin(1e-9));
}

TEST_CASE("Pose2d - Constexpr", "[Pose2d]") {
  constexpr trajopt::Pose2d defaultConstructed;
  constexpr trajopt::Pose2d translationRotation{
      trajopt::Translation2d{0.0, 1.0}, trajopt::Rotation2d{}};

  static_assert(defaultConstructed.X() == 0.0);
  static_assert(translationRotation.Y() == 1.0);
}
