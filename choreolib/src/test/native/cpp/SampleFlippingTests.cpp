// Copyright (c) Choreo contributors

#include <iostream>
#include <numbers>

#include <gtest/gtest.h>
#include <units/force.h>

#include "choreo/trajectory/DifferentialSample.h"
#include "choreo/trajectory/SwerveSample.h"
#include "choreo/util/AllianceFlipperUtil.h"

using namespace choreo;

TEST(SampleFlippingTest, ZeroSwerveSample) {
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
    SwerveSample mirrored2026{0_s,
                              util::fieldLength - 0_m,
                              0_m,
                              units::radian_t{std::numbers::pi} - 0_rad,
                              0_mps,
                              0_mps,
                              0_rad_per_s,
                              0_mps_sq,
                              0_mps_sq,
                              0_rad_per_s_sq,
                              {0_N, 0_N, 0_N, 0_N},
                              {0_N, 0_N, 0_N, 0_N}};
    SwerveSample rotated2026{0_s,
                             util::fieldLength - 0_m,
                             util::fieldWidth - 0_m,
                             units::radian_t{std::numbers::pi} + 0_rad,
                             0_mps,
                             0_mps,
                             0_rad_per_s,
                             0_mps_sq,
                             0_mps_sq,
                             0_rad_per_s_sq,
                             {0_N, 0_N, 0_N, 0_N},
                             {0_N, 0_N, 0_N, 0_N}};

    util::SetFlipper(
        util::Flipper::MirroredX(util::fieldLength, util::fieldWidth));
    ASSERT_TRUE(sample.Flipped() == mirrored2026);
    ASSERT_TRUE(sample.MirrorX() == mirrored2026);
    util::SetFlipper(
        util::Flipper::RotatedAround(util::fieldLength, util::fieldWidth));
    ASSERT_TRUE(sample.Flipped() == rotated2026);
    ASSERT_TRUE(sample.MirrorX() == mirrored2026);
  } catch (std::exception& e) {
    std::cerr << "Error: " << e.what() << std::endl;
    FAIL();
  }
}

TEST(SampleFlippingTest, SwerveSample) {
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
    SwerveSample mirrored2026{0_s,
                              util::fieldLength - 1_m,
                              2_m,
                              units::radian_t{std::numbers::pi} - 3_rad,
                              -4_mps,
                              5_mps,
                              -6_rad_per_s,
                              -7_mps_sq,
                              8_mps_sq,
                              -9_rad_per_s_sq,
                              {-11_N, -10_N, -13_N, -12_N},
                              {15_N, 14_N, 17_N, 16_N}};
    SwerveSample rotated2026{0_s,
                             util::fieldLength - 1_m,
                             util::fieldWidth - 2_m,
                             units::radian_t{std::numbers::pi} + 3_rad,
                             -4_mps,
                             -5_mps,
                             6_rad_per_s,
                             -7_mps_sq,
                             -8_mps_sq,
                             9_rad_per_s_sq,
                             {-10_N, -11_N, -12_N, -13_N},
                             {-14_N, -15_N, -16_N, -17_N}};

    util::SetFlipper(
        util::Flipper::MirroredX(util::fieldLength, util::fieldWidth));
    ASSERT_TRUE(sample.Flipped() == mirrored2026);
    ASSERT_TRUE(sample.MirrorX() == mirrored2026);
    util::SetFlipper(
        util::Flipper::RotatedAround(util::fieldLength, util::fieldWidth));
    ASSERT_TRUE(sample.Flipped() == rotated2026);
    ASSERT_TRUE(sample.MirrorX() == mirrored2026);
  } catch (std::exception& e) {
    std::cerr << "Error: " << e.what() << std::endl;
    FAIL();
  }
}

TEST(SampleFlippingTest, ZeroDifferentialSample) {
  try {
    DifferentialSample sample{
        0_s,         0_m,      0_m,      0_rad,          0_mps, 0_mps,
        0_rad_per_s, 0_mps_sq, 0_mps_sq, 0_rad_per_s_sq, 0_N,   0_N};
    DifferentialSample mirrored2026{
        0_s,         util::fieldLength - 0_m,
        0_m,         units::radian_t{std::numbers::pi} - 0_rad,
        0_mps,       0_mps,
        0_rad_per_s, 0_mps_sq,
        0_mps_sq,    0_rad_per_s_sq,
        0_N,         0_N};
    DifferentialSample rotated2026{0_s,
                                   util::fieldLength - 0_m,
                                   util::fieldWidth - 0_m,
                                   units::radian_t{std::numbers::pi} + 0_rad,
                                   0_mps,
                                   0_mps,
                                   0_rad_per_s,
                                   0_mps_sq,
                                   0_mps_sq,
                                   0_rad_per_s_sq,
                                   0_N,
                                   0_N};

    util::SetFlipper(
        util::Flipper::MirroredX(util::fieldLength, util::fieldWidth));
    ASSERT_TRUE(sample.Flipped() == mirrored2026);
    ASSERT_TRUE(sample.MirrorX() == mirrored2026);
    util::SetFlipper(
        util::Flipper::RotatedAround(util::fieldLength, util::fieldWidth));
    ASSERT_TRUE(sample.Flipped() == rotated2026);
    ASSERT_TRUE(sample.MirrorX() == mirrored2026);
  } catch (std::exception& e) {
    std::cerr << "Error: " << e.what() << std::endl;
    FAIL();
  }
}

TEST(SampleFlippingTest, DifferentialSample) {
  try {
    DifferentialSample sample{
        0_s,         1_m,      2_m,      3_rad,          4_mps, 5_mps,
        6_rad_per_s, 7_mps_sq, 8_mps_sq, 9_rad_per_s_sq, 10_N,  11_N};
    DifferentialSample mirrored2026{
        0_s,          util::fieldLength - 1_m,
        2_m,          units::radian_t{std::numbers::pi} - 3_rad,
        5_mps,        4_mps,
        -6_rad_per_s, 8_mps_sq,
        7_mps_sq,     -9_rad_per_s_sq,
        11_N,         10_N};
    DifferentialSample rotated2026{0_s,
                                   util::fieldLength - 1_m,
                                   util::fieldWidth - 2_m,
                                   units::radian_t{std::numbers::pi} + 3_rad,
                                   4_mps,
                                   5_mps,
                                   6_rad_per_s,
                                   7_mps_sq,
                                   8_mps_sq,
                                   9_rad_per_s_sq,
                                   10_N,
                                   11_N};

    util::SetFlipper(
        util::Flipper::MirroredX(util::fieldLength, util::fieldWidth));
    ASSERT_TRUE(sample.Flipped() == mirrored2026);
    ASSERT_TRUE(sample.MirrorX() == mirrored2026);
    util::SetFlipper(
        util::Flipper::RotatedAround(util::fieldLength, util::fieldWidth));
    ASSERT_TRUE(sample.Flipped() == rotated2026);
    ASSERT_TRUE(sample.MirrorX() == mirrored2026);
  } catch (std::exception& e) {
    std::cerr << "Error: " << e.what() << std::endl;
    FAIL();
  }
}

TEST(SampleFlippingTest, BothMirrorEqualsRotation) {
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

    util::SetFlipper(util::Flipper::FRC_CURRENT());
    ASSERT_TRUE(sample.MirrorX().MirrorY() == sample.Flipped());
  } catch (std::exception& e) {
    std::cerr << "Error: " << e.what() << std::endl;
    FAIL();
  }
}

TEST(SampleFlippingTest, MirrorIsInverse) {
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
    DifferentialSample differentialSample{
        0_s,         1_m,      2_m,      3_rad,          4_mps, 5_mps,
        6_rad_per_s, 7_mps_sq, 8_mps_sq, 9_rad_per_s_sq, 10_N,  11_N};

    util::SetFlipper(
        util::Flipper::MirroredX(util::fieldLength, util::fieldWidth));
    ASSERT_TRUE(sample.MirrorX().MirrorX() == sample);
    ASSERT_TRUE(sample.MirrorY().MirrorY() == sample);
    ASSERT_TRUE(differentialSample.MirrorX().MirrorX() == differentialSample);
    ASSERT_TRUE(differentialSample.MirrorY().MirrorY() == differentialSample);
  } catch (std::exception& e) {
    std::cerr << "Error: " << e.what() << std::endl;
    FAIL();
  }
}
