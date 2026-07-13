// Copyright (c) Choreo contributors

#pragma once

#include <string>

#include <wpi/units/acceleration.hpp>
#include <wpi/units/angle.hpp>
#include <wpi/units/angular_acceleration.hpp>
#include <wpi/units/angular_velocity.hpp>
#include <wpi/units/base.hpp>
#include <wpi/units/current.hpp>
#include <wpi/units/dimensionless.hpp>
#include <wpi/units/length.hpp>
#include <wpi/units/mass.hpp>
#include <wpi/units/moment_of_inertia.hpp>
#include <wpi/units/time.hpp>
#include <wpi/units/torque.hpp>
#include <wpi/units/velocity.hpp>
#include <wpi/units/voltage.hpp>

namespace choreo {
namespace dimensions {

template <typename T>
struct Dimension {
  Dimension() = default;
  Dimension(const Dimension&) = default;
  inline static constexpr std::string_view tag = "default value";
  using baseUnit = T;
};

template <>
struct Dimension<wpi::units::scalar_t> {
  Dimension() = default;
  Dimension(const Dimension&) = default;
  inline static constexpr std::string_view tag = "Number";
  using baseUnit = wpi::units::scalar_t;
};

template <>
struct Dimension<wpi::units::meter_t> {
  Dimension() = default;
  Dimension(const Dimension&) = default;
  inline static constexpr std::string_view tag = "Length";
  using baseUnit = wpi::units::meter_t;
};

template <>
struct Dimension<wpi::units::meters_per_second_t> {
  Dimension() = default;
  Dimension(const Dimension&) = default;
  inline static constexpr std::string_view tag = "LinVel";
  using baseUnit = wpi::units::meters_per_second_t;
};

template <>
struct Dimension<wpi::units::meters_per_second_squared_t> {
  Dimension() = default;
  Dimension(const Dimension&) = default;
  inline static constexpr std::string_view tag = "LinAcc";
  using baseUnit = wpi::units::meters_per_second_squared_t;
};

template <>
struct Dimension<wpi::units::radian_t> {
  Dimension() = default;
  Dimension(const Dimension&) = default;
  inline static constexpr std::string_view tag = "Angle";
  using baseUnit = wpi::units::radian_t;
};

template <>
struct Dimension<wpi::units::radians_per_second_t> {
  Dimension() = default;
  Dimension(const Dimension&) = default;
  inline static constexpr std::string_view tag = "AngVel";
  using baseUnit = wpi::units::radians_per_second_t;
};

template <>
struct Dimension<wpi::units::radians_per_second_squared_t> {
  Dimension() = default;
  Dimension(const Dimension&) = default;
  inline static constexpr std::string_view tag = "AngAcc";
  using baseUnit = wpi::units::radians_per_second_squared_t;
};

template <>
struct Dimension<wpi::units::second_t> {
  Dimension() = default;
  Dimension(const Dimension&) = default;
  inline static constexpr std::string_view tag = "Time";
  using baseUnit = wpi::units::second_t;
};

template <>
struct Dimension<wpi::units::kilogram_t> {
  Dimension() = default;
  Dimension(const Dimension&) = default;
  inline static constexpr std::string_view tag = "Mass";
  using baseUnit = wpi::units::kilogram_t;
};

template <>
struct Dimension<wpi::units::newton_meter_t> {
  Dimension() = default;
  Dimension(const Dimension&) = default;
  inline static constexpr std::string_view tag = "Torque";
  using baseUnit = wpi::units::newton_meter_t;
};

template <>
struct Dimension<wpi::units::kilogram_square_meter_t> {
  Dimension() = default;
  Dimension(const Dimension&) = default;
  inline static constexpr std::string_view tag = "MoI";
  using baseUnit = wpi::units::kilogram_square_meter_t;
};

template <>
struct Dimension<wpi::units::ampere_t> {
  Dimension() = default;
  Dimension(const Dimension&) = default;
  inline static constexpr std::string_view tag = "Current";
  using baseUnit = wpi::units::ampere_t;
};

template <>
struct Dimension<wpi::units::unit_t<wpi::units::compound_unit<
    wpi::units::newton_meter, wpi::units::inverse<wpi::units::ampere>>>> {
  inline static constexpr std::string_view tag = "KT";
  using baseUnit = wpi::units::unit_t<wpi::units::compound_unit<
      wpi::units::newton_meter, wpi::units::inverse<wpi::units::ampere>>>;
};

template <>
struct Dimension<wpi::units::unit_t<wpi::units::compound_unit<
    wpi::units::volt, wpi::units::inverse<wpi::units::radians_per_second>>>> {
  inline static constexpr std::string_view tag = "KV";
  using baseUnit = wpi::units::unit_t<wpi::units::compound_unit<
      wpi::units::volt, wpi::units::inverse<wpi::units::radians_per_second>>>;
};

using Number = Dimension<wpi::units::scalar_t>;
using Length = Dimension<wpi::units::meter_t>;
using LinVel = Dimension<wpi::units::meters_per_second_t>;
using LinAcc = Dimension<wpi::units::meters_per_second_squared_t>;
using Angle = Dimension<wpi::units::radian_t>;
using AngVel = Dimension<wpi::units::radians_per_second_t>;
using AngAcc = Dimension<wpi::units::radians_per_second_squared_t>;
using Time = Dimension<wpi::units::second_t>;
using Mass = Dimension<wpi::units::kilogram_t>;
using Torque = Dimension<wpi::units::newton_meter_t>;
using MoI = Dimension<wpi::units::kilogram_square_meter_t>;
using Current = Dimension<wpi::units::ampere_t>;
using KT = Dimension<wpi::units::unit_t<wpi::units::compound_unit<
    wpi::units::newton_meter, wpi::units::inverse<wpi::units::ampere>>>>;
using KV = Dimension<wpi::units::unit_t<wpi::units::compound_unit<
    wpi::units::volt, wpi::units::inverse<wpi::units::radians_per_second>>>>;

}  // namespace dimensions
}  // namespace choreo
