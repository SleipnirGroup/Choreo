// Copyright (c) Choreo contributors

#include "choreo/trajectory/struct/DifferentialSampleStruct.hpp"

#include <wpi/util/struct/Struct.hpp>

namespace {
constexpr size_t kTimestampOff = 0;
constexpr size_t kXOff = kTimestampOff + 8;
constexpr size_t kYOff = kXOff + 8;
constexpr size_t kHeadingOff = kYOff + 8;
constexpr size_t kVlOff = kHeadingOff + 8;
constexpr size_t kVrOff = kVlOff + 8;
constexpr size_t kOmegaOff = kVrOff + 8;
constexpr size_t kAlOff = kOmegaOff + 8;
constexpr size_t kArOff = kAlOff + 8;
constexpr size_t kAlphaOff = kArOff + 8;
constexpr size_t kFlOff = kAlphaOff + 8;
constexpr size_t kFrOff = kFlOff + 8;
}  // namespace

using StructType = wpi::util::Struct<choreo::DifferentialSample>;

choreo::DifferentialSample StructType::Unpack(std::span<const uint8_t> data) {
  return choreo::DifferentialSample{
      wpi::units::second_t{
          wpi::util::UnpackStruct<double, kTimestampOff>(data)},
      wpi::units::meter_t{wpi::util::UnpackStruct<double, kXOff>(data)},
      wpi::units::meter_t{wpi::util::UnpackStruct<double, kYOff>(data)},
      wpi::units::radian_t{wpi::util::UnpackStruct<double, kHeadingOff>(data)},
      wpi::units::meters_per_second_t{
          wpi::util::UnpackStruct<double, kVlOff>(data)},
      wpi::units::meters_per_second_t{
          wpi::util::UnpackStruct<double, kVrOff>(data)},
      wpi::units::radians_per_second_t{
          wpi::util::UnpackStruct<double, kOmegaOff>(data)},
      wpi::units::meters_per_second_squared_t{
          wpi::util::UnpackStruct<double, kAlOff>(data)},
      wpi::units::meters_per_second_squared_t{
          wpi::util::UnpackStruct<double, kArOff>(data)},
      wpi::units::radians_per_second_squared_t{
          wpi::util::UnpackStruct<double, kAlphaOff>(data)},
      wpi::units::newton_t{wpi::util::UnpackStruct<double, kFlOff>(data)},
      wpi::units::newton_t{wpi::util::UnpackStruct<double, kFrOff>(data)}};
}

void StructType::Pack(std::span<uint8_t> data,
                      const choreo::DifferentialSample& value) {
  wpi::util::PackStruct<kTimestampOff>(data, value.timestamp.value());
  wpi::util::PackStruct<kXOff>(data, value.x.value());
  wpi::util::PackStruct<kYOff>(data, value.y.value());
  wpi::util::PackStruct<kHeadingOff>(data, value.heading.value());
  wpi::util::PackStruct<kVlOff>(data, value.vl.value());
  wpi::util::PackStruct<kVrOff>(data, value.vr.value());
  wpi::util::PackStruct<kOmegaOff>(data, value.omega.value());
  wpi::util::PackStruct<kAlOff>(data, value.al.value());
  wpi::util::PackStruct<kArOff>(data, value.ar.value());
  wpi::util::PackStruct<kAlphaOff>(data, value.alpha.value());
  wpi::util::PackStruct<kFlOff>(data, value.fl.value());
  wpi::util::PackStruct<kFrOff>(data, value.fr.value());
}
