// Copyright (c) Choreo contributors

#include <iostream>

#include <catch2/catch_test_macros.hpp>
#include <wpi/units/force.hpp>
#include <wpi/util/json.hpp>

#include "choreo/trajectory/SwerveSample.hpp"
#include "choreo/trajectory/Trajectory.hpp"
#include "choreo/util/AllianceFlipperUtil.hpp"

using namespace choreo;

TEST_CASE("SampleFlippingTest ZeroSwerveSample", "[choreolib]") {
  try {
    SwerveSample sample{0_s,
                        0_m,
                        0_m,
                        0_rad,
                        0_mps,
                        0_mps,
                        0_rad_per_s,
                        0_mps_sq,
                        0_mps_sq,
                        0_rad_per_s_sq,
                        {0_N, 0_N, 0_N, 0_N},
                        {0_N, 0_N, 0_N, 0_N}};
    SwerveSample mirrored2024{0_s,
                              0_m,
                              0_m,
                              wpi::units::radian_t{std::numbers::pi} - 0_rad,
                              0_mps,
                              0_mps,
                              0_rad_per_s,
                              0_mps_sq,
                              0_mps_sq,
                              0_rad_per_s_sq,
                              {0_N, 0_N, 0_N, 0_N},
                              {0_N, 0_N, 0_N, 0_N}};
    SwerveSample rotated2022{0_s,
                             0_m,
                             0_m,
                             wpi::units::radian_t{std::numbers::pi} + 0_rad,
                             0_mps,
                             0_mps,
                             0_rad_per_s,
                             0_mps_sq,
                             0_mps_sq,
                             0_rad_per_s_sq,
                             {0_N, 0_N, 0_N, 0_N},
                             {0_N, 0_N, 0_N, 0_N}};

    REQUIRE(sample.Flipped<2024>() == mirrored2024);
    REQUIRE(sample.Flipped<2022>() == rotated2022);
  } catch (std::exception& e) {
    FAIL(e.what());
  }
}

TEST_CASE("SampleFlippingTest SwerveSample", "[choreolib]") {
  try {
    SwerveSample sample{0_s,
                        1_m,
                        2_m,
                        3_rad,
                        4_mps,
                        5_mps,
                        6_rad_per_s,
                        7_mps_sq,
                        8_mps_sq,
                        9_rad_per_s_sq,
                        {10_N, 11_N, 12_N, 13_N},
                        {14_N, 15_N, 16_N, 17_N}};
    SwerveSample mirrored2024{0_s,
                              -1_m,
                              2_m,
                              wpi::units::radian_t{std::numbers::pi} - 3_rad,
                              -4_mps,
                              5_mps,
                              -6_rad_per_s,
                              -7_mps_sq,
                              8_mps_sq,
                              -9_rad_per_s_sq,
                              {-11_N, -10_N, -13_N, -12_N},
                              {15_N, 14_N, 17_N, 16_N}};
    SwerveSample rotated2022{0_s,
                             -1_m,
                             -2_m,
                             wpi::units::radian_t{std::numbers::pi} + 3_rad,
                             -4_mps,
                             -5_mps,
                             6_rad_per_s,
                             -7_mps_sq,
                             -8_mps_sq,
                             9_rad_per_s_sq,
                             {-10_N, -11_N, -12_N, -13_N},
                             {-14_N, -15_N, -16_N, -17_N}};

    REQUIRE(sample.Flipped<2024>() == mirrored2024);
    REQUIRE(sample.Flipped<2022>() == rotated2022);
  } catch (std::exception& e) {
    FAIL(e.what());
  }
}

TEST_CASE("SampleFlippingTest ZeroDifferentialSample", "[choreolib]") {
  try {
    DifferentialSample sample{
        0_s,         0_m,      0_m,      0_rad,          0_mps, 0_mps,
        0_rad_per_s, 0_mps_sq, 0_mps_sq, 0_rad_per_s_sq, 0_N,   0_N};
    DifferentialSample mirrored2024{
        0_s,         0_m,
        0_m,         wpi::units::radian_t{std::numbers::pi} - 0_rad,
        0_mps,       0_mps,
        0_rad_per_s, 0_mps_sq,
        0_mps_sq,    0_rad_per_s_sq,
        0_N,         0_N};
    DifferentialSample rotated2022{
        0_s,         0_m,
        0_m,         wpi::units::radian_t{std::numbers::pi} + 0_rad,
        0_mps,       0_mps,
        0_rad_per_s, 0_mps_sq,
        0_mps_sq,    0_rad_per_s_sq,
        0_N,         0_N};

    REQUIRE(sample.Flipped<2024>() == mirrored2024);
    REQUIRE(sample.Flipped<2022>() == rotated2022);
  } catch (std::exception& e) {
    FAIL(e.what());
  }
}

TEST_CASE("SampleFlippingTest DifferentialSample", "[choreolib]") {
  try {
    DifferentialSample sample{
        0_s,         1_m,      2_m,      3_rad,          4_mps, 5_mps,
        6_rad_per_s, 7_mps_sq, 8_mps_sq, 9_rad_per_s_sq, 10_N,  11_N};
    DifferentialSample mirrored2024{
        0_s,          -1_m,
        2_m,          wpi::units::radian_t{std::numbers::pi} - 3_rad,
        5_mps,        4_mps,
        -6_rad_per_s, 8_mps_sq,
        7_mps_sq,     -9_rad_per_s_sq,
        11_N,         10_N};
    DifferentialSample rotated2022{
        0_s,         -1_m,
        -2_m,        wpi::units::radian_t{std::numbers::pi} + 3_rad,
        4_mps,       5_mps,
        6_rad_per_s, 7_mps_sq,
        8_mps_sq,    9_rad_per_s_sq,
        10_N,        11_N};

    REQUIRE(sample.Flipped<2024>() == mirrored2024);
    REQUIRE(sample.Flipped<2022>() == rotated2022);
  } catch (std::exception& e) {
    FAIL(e.what());
  }
}
