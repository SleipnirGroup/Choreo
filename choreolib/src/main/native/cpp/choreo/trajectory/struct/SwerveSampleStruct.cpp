// Copyright (c) Choreo contributors

#include "choreo/trajectory/struct/SwerveSampleStruct.hpp"

namespace {
constexpr size_t kTimestampOff = 0;
constexpr size_t kXOff = kTimestampOff + 8;
constexpr size_t kYOff = kXOff + 8;
constexpr size_t kHeadingOff = kYOff + 8;
constexpr size_t kVxOff = kHeadingOff + 8;
constexpr size_t kVyOff = kVxOff + 8;
constexpr size_t kOmegaOff = kVyOff + 8;
constexpr size_t kAxOff = kOmegaOff + 8;
constexpr size_t kAyOff = kAxOff + 8;
constexpr size_t kAlphaOff = kAyOff + 8;
constexpr size_t kMfX0Off = kAlphaOff + 8;
constexpr size_t kMfX1Off = kMfX0Off + 8;
constexpr size_t kMfX2Off = kMfX1Off + 8;
constexpr size_t kMfX3Off = kMfX2Off + 8;
constexpr size_t kMfY0Off = kMfX3Off + 8;
constexpr size_t kMfY1Off = kMfY0Off + 8;
constexpr size_t kMfY2Off = kMfY1Off + 8;
constexpr size_t kMfY3Off = kMfY2Off + 8;
}  // namespace

using StructType = wpi::util::Struct<choreo::SwerveSample>;

choreo::SwerveSample StructType::Unpack(std::span<const uint8_t> data) {
  return choreo::SwerveSample{
      units::second_t{wpi::util::UnpackStruct<double, kTimestampOff>(data)},
      units::meter_t{wpi::util::UnpackStruct<double, kXOff>(data)},
      units::meter_t{wpi::util::UnpackStruct<double, kYOff>(data)},
      units::radian_t{wpi::util::UnpackStruct<double, kHeadingOff>(data)},
      units::meters_per_second_t{wpi::util::UnpackStruct<double, kVxOff>(data)},
      units::meters_per_second_t{wpi::util::UnpackStruct<double, kVyOff>(data)},
      units::radians_per_second_t{wpi::util::UnpackStruct<double, kOmegaOff>(data)},
      units::meters_per_second_squared_t{
          wpi::util::UnpackStruct<double, kAxOff>(data)},
      units::meters_per_second_squared_t{
          wpi::util::UnpackStruct<double, kAyOff>(data)},
      units::radians_per_second_squared_t{
          wpi::util::UnpackStruct<double, kAlphaOff>(data)},
      {units::newton_t{wpi::util::UnpackStruct<double, kMfX0Off>(data)},
       units::newton_t{wpi::util::UnpackStruct<double, kMfX1Off>(data)},
       units::newton_t{wpi::util::UnpackStruct<double, kMfX2Off>(data)},
       units::newton_t{wpi::util::UnpackStruct<double, kMfX3Off>(data)}},
      {units::newton_t{wpi::util::UnpackStruct<double, kMfY0Off>(data)},
       units::newton_t{wpi::util::UnpackStruct<double, kMfY1Off>(data)},
       units::newton_t{wpi::util::UnpackStruct<double, kMfY2Off>(data)},
       units::newton_t{wpi::util::UnpackStruct<double, kMfY3Off>(data)}},
  };
}

void StructType::Pack(std::span<uint8_t> data,
                      const choreo::SwerveSample& value) {
  wpi::util::PackStruct<kTimestampOff>(data, value.timestamp.value());
  wpi::util::PackStruct<kXOff>(data, value.x.value());
  wpi::util::PackStruct<kYOff>(data, value.y.value());
  wpi::util::PackStruct<kHeadingOff>(data, value.heading.value());
  wpi::util::PackStruct<kVxOff>(data, value.vx.value());
  wpi::util::PackStruct<kVyOff>(data, value.vy.value());
  wpi::util::PackStruct<kOmegaOff>(data, value.omega.value());
  wpi::util::PackStruct<kAxOff>(data, value.ax.value());
  wpi::util::PackStruct<kAyOff>(data, value.ay.value());
  wpi::util::PackStruct<kAlphaOff>(data, value.alpha.value());
  wpi::util::PackStruct<kMfX0Off>(data, value.moduleForcesX[0].value());
  wpi::util::PackStruct<kMfX1Off>(data, value.moduleForcesX[1].value());
  wpi::util::PackStruct<kMfX2Off>(data, value.moduleForcesX[2].value());
  wpi::util::PackStruct<kMfX3Off>(data, value.moduleForcesX[3].value());
  wpi::util::PackStruct<kMfY0Off>(data, value.moduleForcesY[0].value());
  wpi::util::PackStruct<kMfY1Off>(data, value.moduleForcesY[1].value());
  wpi::util::PackStruct<kMfY2Off>(data, value.moduleForcesY[2].value());
  wpi::util::PackStruct<kMfY3Off>(data, value.moduleForcesY[3].value());
}
