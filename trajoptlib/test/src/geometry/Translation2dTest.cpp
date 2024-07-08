// Copyright (c) TrajoptLib contributors

#include <cmath>
#include <numbers>

#include <catch2/catch_approx.hpp>
#include <catch2/catch_test_macros.hpp>
#include <trajopt/geometry/Translation2.hpp>

TEST_CASE("Translation2d - Polar constructor", "[Translation2d]") {
  trajopt::Translation2d one{std::numbers::sqrt2 * 1.0,
                             trajopt::Rotation2d{std::numbers::pi / 4}};
  CHECK(one.X() == Catch::Approx(1.0).margin(1e-9));
  CHECK(one.Y() == 1.0);

  trajopt::Translation2d two{2.0, trajopt::Rotation2d{std::numbers::pi / 3}};
  CHECK(two.X() == Catch::Approx(1.0).margin(1e-9));
  CHECK(two.Y() == std::numbers::sqrt3);
}

TEST_CASE("Translation2d - Sum", "[Translation2d]") {
  const trajopt::Translation2d one{1.0, 3.0};
  const trajopt::Translation2d two{2.0, 5.0};

  const auto sum = one + two;

  CHECK(sum.X() == 3.0);
  CHECK(sum.Y() == 8.0);
}

TEST_CASE("Translation2d - Difference", "[Translation2d]") {
  const trajopt::Translation2d one{1.0, 3.0};
  const trajopt::Translation2d two{2.0, 5.0};

  const auto difference = one - two;

  CHECK(difference.X() == -1.0);
  CHECK(difference.Y() == -2.0);
}

TEST_CASE("Translation2d - UnaryMinus", "[Translation2d]") {
  const trajopt::Translation2d original{-4.5, 7.0};
  const auto inverted = -original;

  CHECK(inverted.X() == 4.5);
  CHECK(inverted.Y() == -7.0);
}

TEST_CASE("Translation2d - Multiplication", "[Translation2d]") {
  const trajopt::Translation2d original{3.0, 5.0};
  const auto mult = original * 3;

  CHECK(mult.X() == 9.0);
  CHECK(mult.Y() == 15.0);
}

TEST_CASE("Translation2d - Division", "[Translation2d]") {
  const trajopt::Translation2d original{3.0, 5.0};
  const auto div = original / 2;

  CHECK(div.X() == 1.5);
  CHECK(div.Y() == 2.5);
}

TEST_CASE("Translation2d - RotateBy", "[Translation2d]") {
  const trajopt::Translation2d another{3.0, 0.0};
  const auto rotated =
      another.RotateBy(trajopt::Rotation2d{std::numbers::pi / 2});

  CHECK(rotated.X() == Catch::Approx(0.0).margin(1e-9));
  CHECK(rotated.Y() == 3.0);
}

TEST_CASE("Translation2d - Angle", "[Translation2d]") {
  const trajopt::Translation2d one{1.0, 3.0};
  const trajopt::Translation2d two{2.0, 5.0};

  CHECK(one.Angle().Radians() == std::atan2(3.0, 1.0));
  CHECK(two.Angle().Radians() == std::atan2(5.0, 2.0));
}

TEST_CASE("Translation2d - Dot", "[Translation2d]") {
  const trajopt::Translation2d one{1.0, 3.0};
  const trajopt::Translation2d two{2.0, 5.0};

  CHECK(one.Dot(two) == 17.0);
}

TEST_CASE("Translation2d - Cross", "[Translation2d]") {
  const trajopt::Translation2d one{1.0, 3.0};
  const trajopt::Translation2d two{2.0, 5.0};

  CHECK(one.Cross(two) == -1.0);
}

TEST_CASE("Translation2d - Norm", "[Translation2d]") {
  const trajopt::Translation2d one{3.0, 5.0};
  CHECK(one.Norm() == std::hypot(3.0, 5.0));
}

TEST_CASE("Translation2d - SquaredNorm", "[Translation2d]") {
  const trajopt::Translation2d one{3.0, 5.0};
  CHECK(one.SquaredNorm() == 34.0);
}

TEST_CASE("Translation2d - Distance", "[Translation2d]") {
  const trajopt::Translation2d one{1.0, 1.0};
  const trajopt::Translation2d two{6.0, 6.0};
  CHECK(one.Distance(two) == 5.0 * std::numbers::sqrt2);
}

TEST_CASE("Translation2d - Constexpr", "[Translation2d]") {
  constexpr trajopt::Translation2d defaultCtor;
  constexpr trajopt::Translation2d componentCtor{1.0, 2.0};
  constexpr auto added = defaultCtor + componentCtor;
  constexpr auto subtracted = defaultCtor - componentCtor;
  constexpr auto negated = -componentCtor;

  static_assert(defaultCtor.X() == 0.0);
  static_assert(componentCtor.Y() == 2.0);
  static_assert(added.X() == 1.0);
  static_assert(subtracted.Y() == (-2.0));
  static_assert(negated.X() == (-1.0));
}
