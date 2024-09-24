// Copyright (c) Choreo contributors

#include "choreo/trajectory/struct/DifferentialSampleStruct.h"

namespace {
constexpr size_t kTimestampOff = 0;
constexpr size_t kXOff = kTimestampOff + 8;
constexpr size_t kYOff = kXOff + 8;
constexpr size_t kHeadingOff = kYOff + 8;
constexpr size_t kVlOff = kHeadingOff + 8;
constexpr size_t kVrOff = kVlOff + 8;
constexpr size_t kAlOff = kVrOff + 8;
constexpr size_t kArOff = kAlOff + 8;
constexpr size_t kFlOff = kArOff + 8;
constexpr size_t kFrOff = kFlOff + 8;
}  // namespace

using StructType = wpi::Struct<choreo::DifferentialSample>;

choreo::DifferentialSample StructType::Unpack(std::span<const uint8_t> data) {
  return choreo::DifferentialSample{
      units::second_t{wpi::UnpackStruct<double, kTimestampOff>(data)},
      units::meter_t{wpi::UnpackStruct<double, kXOff>(data)},
      units::meter_t{wpi::UnpackStruct<double, kYOff>(data)},
      units::radian_t{wpi::UnpackStruct<double, kHeadingOff>(data)},
      units::meters_per_second_t{wpi::UnpackStruct<double, kVlOff>(data)},
      units::meters_per_second_t{wpi::UnpackStruct<double, kVrOff>(data)},
      units::meters_per_second_squared_t{
          wpi::UnpackStruct<double, kAlOff>(data)},
      units::meters_per_second_squared_t{
          wpi::UnpackStruct<double, kArOff>(data)},
      units::newton_t{wpi::UnpackStruct<double, kFlOff>(data)},
      units::newton_t{wpi::UnpackStruct<double, kFrOff>(data)}};
}

void StructType::Pack(std::span<uint8_t> data,
                      const choreo::DifferentialSample& value) {
  wpi::PackStruct<kTimestampOff>(data, value.timestamp.value());
  wpi::PackStruct<kXOff>(data, value.x.value());
  wpi::PackStruct<kYOff>(data, value.y.value());
  wpi::PackStruct<kHeadingOff>(data, value.heading.value());
  wpi::PackStruct<kVlOff>(data, value.vl.value());
  wpi::PackStruct<kVrOff>(data, value.vr.value());
  wpi::PackStruct<kAlOff>(data, value.al.value());
  wpi::PackStruct<kArOff>(data, value.ar.value());
  wpi::PackStruct<kFlOff>(data, value.fl.value());
  wpi::PackStruct<kFrOff>(data, value.fr.value());
}
