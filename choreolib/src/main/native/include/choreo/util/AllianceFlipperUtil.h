// Copyright (c) Choreo contributors

#pragma once

#include <numbers>
#include <frc/geometry/Pose2d.h>
#include "choreo/util/ConstexprMap.h"
#include <units/base.h>

namespace choreo {
namespace util {

static constexpr units::meter_t fieldLength = 16.5811_m;
static constexpr units::meter_t fieldWidth = 8.19912_m;

enum class FlipperType { Mirrored, RotateAround };

struct MirroredFlipper {
  static constexpr bool isMirrored = true;

  static constexpr units::meter_t FlipX(units::meter_t x) {
    return fieldLength - x;
  }

  static constexpr units::meter_t FlipY(units::meter_t y) { return y; }

  static constexpr units::radian_t FlipHeading(units::radian_t heading) {
    return units::radian_t{std::numbers::pi} - heading;
  }
};


struct RotateAroundFlipper {
  static constexpr bool isMirrored = false;

  static constexpr units::meter_t FlipX(units::meter_t x) {
    return fieldLength - x;
  }

  static constexpr units::meter_t FlipY(units::meter_t y) {
    return fieldWidth - y;
  }

  static constexpr units::radian_t FlipHeading(units::radian_t heading) {
    return units::radian_t{std::numbers::pi} - heading;
  }
};

constexpr Map flipperMap{std::array{
    std::pair{2020, FlipperType::RotateAround},
    std::pair{2021, FlipperType::RotateAround},
    std::pair{2022, FlipperType::RotateAround},
    std::pair{2023, FlipperType::Mirrored},
    std::pair{2024, FlipperType::Mirrored},
}};

template <int Year>
constexpr auto GetFlipperForYear() {
  constexpr FlipperType flipperType = flipperMap.at(Year);
  if constexpr (flipperType == FlipperType::RotateAround) {
    return RotateAroundFlipper{};
  } else if constexpr (flipperType == FlipperType::Mirrored) {
    return MirroredFlipper{};
  } else {
    static_assert(sizeof(Year) == 0, "Unsupported FlipperType");
  }
}
}  // namespace util
}  // namespace choreo
