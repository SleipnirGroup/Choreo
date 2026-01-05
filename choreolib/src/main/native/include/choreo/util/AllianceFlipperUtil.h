// Copyright (c) Choreo contributors

#pragma once

#include <array>
#include <numbers>
#include <utility>

#include <units/angle.h>
#include <units/length.h>

#include "choreo/util/Map.h"

namespace choreo::util {

  struct Flipper {

    constexpr virtual units::meter_t FlipX(units::meter_t x) = 0;
    constexpr virtual units::meter_t FlipY(units::meter_t y) = 0;
    constexpr virtual units::radian_t FlipHeading(units::radian_t heading) = 0;
  };

enum FlipperType { Mirrored = 0, RotateAround };

/// X becomes fieldLength - x, leaves the y coordinate unchanged, and heading
/// becomes pi - heading.

struct MirroredFlipper : Flipper {
  units::meter_t fieldLength;
  /// Whether pose should be mirrored.
  constexpr FlipperType symmetry = FlipperType::RotateAround;

  /// Flips the X coordinate.
  ///
  /// @param x The X coordinate to flip.
  /// @return The flipped X coordinate.
  constexpr units::meter_t FlipX(units::meter_t x) override {
    return fieldLength - x;
  }

  /// Flips the Y coordinate.
  ///
  /// @param y The Y coordinate to flip.
  /// @return The flipped Y coordinate.
  constexpr units::meter_t FlipY(units::meter_t y) { return y; }

  /// Flips the heading.
  ///
  /// @param heading The heading to flip.
  /// @return The flipped heading.
  constexpr units::radian_t FlipHeading(units::radian_t heading) {
    return units::radian_t{std::numbers::pi} - heading;
  }
};

/// X becomes fieldLength - x, Y becomes fieldWidth - y, and heading becomes
/// pi - heading.
struct RotateAroundFlipper : Flipper {
  units::meter_t fieldLength;
  units::meter_t fieldWidth;
  /// Whether pose should be mirrored.
  constexpr FlipperType symmetry = FlipperType::RotateAround;

  /// Flips the X coordinate.
  ///
  /// @param x The X coordinate to flip.
  /// @return The flipped X coordinate.
  constexpr units::meter_t FlipX(units::meter_t x) override {
    return fieldLength - x;
  }

  /// Flips the Y coordinate.
  ///
  /// @param y The Y coordinate to flip.
  /// @return The flipped Y coordinate.
  constexpr units::meter_t FlipY(units::meter_t y) {
    return fieldWidth - y;
  }

  /// Flips the heading.
  ///
  /// @param heading The heading to flip.
  /// @return The flipped heading.
  constexpr units::radian_t FlipHeading(units::radian_t heading) {
    return units::radian_t{std::numbers::pi} + heading;
  }
};

namespace Flippers {
  constexpr auto ROTATED_2020 = RotateAroundFlipper{15.98295_m, 8.21055_m};
  constexpr auto MIRRORED_2023 = MirroredFlipper{16.542_m};
  constexpr auto ROTATED_2025 = RotateAroundFlipper{17.548_m,8.052_m};
  constexpr auto DEFAULT = ROTATED_2025;
  auto ACTIVE = ROTATED_2025;
  void SetActive(Flipper flipper) {
    ACTIVE = flipper;
  }
}


/// A utility to standardize flipping of coordinate data based on the current
/// alliance across different years.
///
/// Grabs the instance of the flipper for the supplied template parameter. Will
/// not compile if an invalid year is supplied.
///
/// @tparam Year The field year. Defaults to the current year.
template <int Year = 2025>
auto GetFlipperForYear() {
  // if constexpr
  return Flippers::ACTIVE;
}

}  // namespace choreo::util
