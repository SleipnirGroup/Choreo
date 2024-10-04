// Copyright (c) Choreo contributors

#pragma once

#include <numbers>

#include <frc/geometry/Pose2d.h>
#include <units/base.h>

#include "choreo/util/Map.h"

namespace choreo::util {

static constexpr units::meter_t fieldLength = 16.5811_m;
static constexpr units::meter_t fieldWidth = 8.19912_m;

enum class FlipperType { Mirrored, RotateAround };

struct MirroredFlipper {
  static constexpr bool isMirrored = true;

  /**
   * Flips the X coordinate.
   *
   * @param x The X coordinate to flip.
   * @return The flipped X coordinate.
   */
  static constexpr units::meter_t FlipX(units::meter_t x) {
    return fieldLength - x;
  }

  /**
   * Flips the Y coordinate.
   *
   * @param y The Y coordinate to flip.
   * @return The flipped Y coordinate.
   */
  static constexpr units::meter_t FlipY(units::meter_t y) { return y; }

  /**
   * Flips the heading.
   *
   * @param heading The heading to flip.
   * @return The flipped heading.
   */
  static constexpr units::radian_t FlipHeading(units::radian_t heading) {
    return units::radian_t{std::numbers::pi} - heading;
  }
};

struct RotateAroundFlipper {
  static constexpr bool isMirrored = false;

  /**
   * Flips the X coordinate.
   *
   * @param x The X coordinate to flip.
   * @return The flipped X coordinate.
   */
  static constexpr units::meter_t FlipX(units::meter_t x) {
    return fieldLength - x;
  }

  /**
   * Flips the Y coordinate.
   *
   * @param y The Y coordinate to flip.
   * @return The flipped Y coordinate.
   */
  static constexpr units::meter_t FlipY(units::meter_t y) {
    return fieldWidth - y;
  }

  /**
   * Flips the heading.
   *
   * @param heading The heading to flip.
   * @return The flipped heading.
   */
  static constexpr units::radian_t FlipHeading(units::radian_t heading) {
    return units::radian_t{std::numbers::pi} - heading;
  }
};

inline constexpr Map flipperMap{std::array{
    std::pair{2022, FlipperType::RotateAround},
    std::pair{2023, FlipperType::Mirrored},
    std::pair{2024, FlipperType::Mirrored},
}};

inline constexpr int kDefaultYear = 2024;

/**
 * A utility to standardize flipping of coordinate data based on the current
 * alliance across different years.
 *
 * Grabs the instance of the flipper for the supplied template parameter. Will
 * not compile if an invalid year is supplied.
 *
 * @tparam Year The field year (default: the current year).
 */
template <int Year = kDefaultYear>
constexpr auto GetFlipperForYear() {
  constexpr bool yearInMap = [] {
    try {
      [[maybe_unused]]
      auto checked = flipperMap.at(Year);
      return true;
    } catch (...) {
      return false;
    }
  }();

  if constexpr (!yearInMap) {
    static_assert(yearInMap, "Year not found in flipperMap");
  } else {
    constexpr auto flipperType = flipperMap.at(Year);
    if constexpr (flipperType == FlipperType::RotateAround) {
      return RotateAroundFlipper{};
    } else if constexpr (flipperType == FlipperType::Mirrored) {
      return MirroredFlipper{};
    } else {
      static_assert(flipperType == FlipperType::RotateAround ||
                        flipperType == FlipperType::Mirrored,
                    "Invalid FlipperType in flipperMap");
    }
  }
}

}  // namespace choreo::util
