// Copyright (c) TrajoptLib contributors

#include <cmath>
#include <numbers>

#include <catch2/catch_test_macros.hpp>
#include <catch2/matchers/catch_matchers_floating_point.hpp>
#include <trajopt/geometry/translation2.hpp>

using Catch::Matchers::WithinAbs;

TEST_CASE("Translation2d - Polar constructor", "[Translation2d]") {
  trajopt::Translation2d one{std::numbers::sqrt2 * 1.0,
                             trajopt::Rotation2d{std::numbers::pi / 4}};
  CHECK_THAT(one.x(), WithinAbs(1.0, 1e-9));
  CHECK_THAT(one.y(), WithinAbs(1.0, 1e-9));

  trajopt::Translation2d two{2.0, trajopt::Rotation2d{std::numbers::pi / 3}};
  CHECK_THAT(two.x(), WithinAbs(1.0, 1e-9));
  CHECK(two.y() == std::numbers::sqrt3);
}

TEST_CASE("Translation2d - Sum", "[Translation2d]") {
  const trajopt::Translation2d one{1.0, 3.0};
  const trajopt::Translation2d two{2.0, 5.0};

  const auto sum = one + two;

  CHECK(sum.x() == 3.0);
  CHECK(sum.y() == 8.0);
}

TEST_CASE("Translation2d - Difference", "[Translation2d]") {
  const trajopt::Translation2d one{1.0, 3.0};
  const trajopt::Translation2d two{2.0, 5.0};

  const auto difference = one - two;

  CHECK(difference.x() == -1.0);
  CHECK(difference.y() == -2.0);
}

TEST_CASE("Translation2d - UnaryMinus", "[Translation2d]") {
  const trajopt::Translation2d original{-4.5, 7.0};
  const auto inverted = -original;

  CHECK(inverted.x() == 4.5);
  CHECK(inverted.y() == -7.0);
}

TEST_CASE("Translation2d - Multiplication", "[Translation2d]") {
  const trajopt::Translation2d original{3.0, 5.0};
  const auto mult = original * 3;

  CHECK(mult.x() == 9.0);
  CHECK(mult.y() == 15.0);
}

TEST_CASE("Translation2d - Division", "[Translation2d]") {
  const trajopt::Translation2d original{3.0, 5.0};
  const auto div = original / 2;

  CHECK(div.x() == 1.5);
  CHECK(div.y() == 2.5);
}

TEST_CASE("Translation2d - RotateBy", "[Translation2d]") {
  const trajopt::Translation2d another{3.0, 0.0};
  const auto rotated =
      another.rotate_by(trajopt::Rotation2d{std::numbers::pi / 2});

  CHECK_THAT(rotated.x(), WithinAbs(0.0, 1e-9));
  CHECK(rotated.y() == 3.0);
}

TEST_CASE("Translation2d - Angle", "[Translation2d]") {
  const trajopt::Translation2d one{1.0, 3.0};
  const trajopt::Translation2d two{2.0, 5.0};

  const auto one_angle = one.angle();
  CHECK_THAT(one_angle.cos(), WithinAbs(1.0 / std::sqrt(10.0), 1e-15));
  CHECK_THAT(one_angle.sin(), WithinAbs(3.0 / std::sqrt(10.0), 1e-15));
  CHECK_THAT(one_angle.radians(), WithinAbs(std::atan2(3.0, 1.0), 1e-15));

  const auto two_angle = two.angle();
  CHECK_THAT(two_angle.cos(), WithinAbs(2.0 / std::sqrt(29.0), 1e-15));
  CHECK_THAT(two_angle.sin(), WithinAbs(5.0 / std::sqrt(29.0), 1e-15));
  CHECK_THAT(two_angle.radians(), WithinAbs(std::atan2(5.0, 2.0), 1e-15));
}

TEST_CASE("Translation2d - Dot", "[Translation2d]") {
  const trajopt::Translation2d one{1.0, 3.0};
  const trajopt::Translation2d two{2.0, 5.0};

  CHECK(one.dot(two) == 17.0);
}

TEST_CASE("Translation2d - Cross", "[Translation2d]") {
  const trajopt::Translation2d one{1.0, 3.0};
  const trajopt::Translation2d two{2.0, 5.0};

  CHECK(one.cross(two) == -1.0);
}

TEST_CASE("Translation2d - Norm", "[Translation2d]") {
  const trajopt::Translation2d one{3.0, 5.0};
  CHECK(one.norm() == std::hypot(3.0, 5.0));
}

TEST_CASE("Translation2d - SquaredNorm", "[Translation2d]") {
  const trajopt::Translation2d one{3.0, 5.0};
  CHECK(one.squared_norm() == 34.0);
}

TEST_CASE("Translation2d - Distance", "[Translation2d]") {
  const trajopt::Translation2d one{1.0, 1.0};
  const trajopt::Translation2d two{6.0, 6.0};
  CHECK(one.distance(two) == 5.0 * std::numbers::sqrt2);
}

TEST_CASE("Translation2d - Constexpr", "[Translation2d]") {
  constexpr trajopt::Translation2d default_ctor;
  constexpr trajopt::Translation2d component_ctor{1.0, 2.0};
  constexpr auto added = default_ctor + component_ctor;
  constexpr auto subtracted = default_ctor - component_ctor;
  constexpr auto negated = -component_ctor;

  static_assert(default_ctor.x() == 0.0);
  static_assert(component_ctor.y() == 2.0);
  static_assert(added.x() == 1.0);
  static_assert(subtracted.y() == (-2.0));
  static_assert(negated.x() == (-1.0));
}
