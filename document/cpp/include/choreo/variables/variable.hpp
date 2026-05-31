#pragma once

#include <variant>

#include <wpi/units/acceleration.hpp>
#include <wpi/units/angle.hpp>
#include <wpi/units/angular_acceleration.hpp>
#include <wpi/units/angular_velocity.hpp>
#include <wpi/units/dimensionless.hpp>
#include <wpi/units/length.hpp>
#include <wpi/units/mass.hpp>
#include <wpi/units/moment_of_inertia.hpp>
#include <wpi/units/time.hpp>
#include <wpi/units/torque.hpp>
#include <wpi/units/velocity.hpp>
#include <wpi/util/json.hpp>

namespace choreo {
namespace variables {
namespace dimensions {

template <typename T>
struct Dimension {
  static const std::string tag;
  using baseUnit = T;
};
template <typename T>
const std::string Dimension<T>::tag = "default value";

using Number = Dimension<wpi::units::scalar_t>;
const std::string Number::tag = "Number";
using Length = Dimension<wpi::units::meter_t>;
const std::string Length::tag = "Length";
using LinVel = Dimension<wpi::units::meters_per_second_t>;
const std::string LinVel::tag = "LinVel";
using LinAcc = Dimension<wpi::units::meters_per_second_squared_t>;
const std::string LinAcc::tag = "LinAcc";
using Angle = Dimension<wpi::units::radian_t>;
const std::string Angle::tag = "Angle";
using AngVel = Dimension<wpi::units::radians_per_second_t>;
const std::string AngVel::tag = "AngVel";
using AngAcc = Dimension<wpi::units::radians_per_second_squared_t>;
const std::string AngAcc::tag = "AngAcc";
using Time = Dimension<wpi::units::second_t>;
const std::string Time::tag = "Time";
using Mass = Dimension<wpi::units::kilogram_t>;
const std::string Mass::tag = "Mass";
using Torque = Dimension<wpi::units::newton_meter_t>;
const std::string Torque::tag = "Torque";
using MoI = Dimension<wpi::units::kilogram_square_meter_t>;
const std::string MoI::tag = "MoI";

}  // namespace dimensions

template <typename BaseUnit>
struct Variable {

  Variable(const BaseUnit value) : var(value){}
  Variable(): Variable(BaseUnit(0)){};
    template <typename U>
    requires std::is_convertible_v<U, BaseUnit>
  // NOLINTNEXTLINE (google-explicit-constructor)
  Variable(U&& u) : Variable(static_cast<BaseUnit>(u)) {}
  Expr<BaseUnit> var;
  using Unit = BaseUnit;
  using Dimension = dimensions::Dimension<BaseUnit>;
  
};

template <typename T>
inline void to_json(wpi::util::json& json, const Variable<T>& variable) {
  json = wpi::util::json::object("dimension", dimensions::Dimension<T>::tag, "var",
                                 variable.var);
}

template <typename T>
inline void from_json(const wpi::util::json& json, Variable<T>& variable) {
  variable.var = json.at("var").get<Expr<T>>();
}
using VariableVariant = std::variant<
    //clang-format off
    Variable<dimensions::Number::baseUnit>,
    Variable<dimensions::Length::baseUnit>,
    Variable<dimensions::LinVel::baseUnit>,
    Variable<dimensions::LinAcc::baseUnit>,
    Variable<dimensions::Angle::baseUnit>,
    Variable<dimensions::AngVel::baseUnit>,
    Variable<dimensions::AngAcc::baseUnit>,
    Variable<dimensions::Time::baseUnit>, Variable<dimensions::Mass::baseUnit>,
    Variable<dimensions::Torque::baseUnit>, Variable<dimensions::MoI::baseUnit>
    //clang-format on
    >;
template <typename T>
VariableVariant create(const wpi::util::json& json) {
  Variable<T> v;
  from_json(json, v);
  return v;
}

inline void to_json(wpi::util::json& json, const VariableVariant& variable) {
  std::visit(
      [&json](auto&& arg) {
        to_json(json, arg);  // relies on the to_json of each variant type
      },
      variable);
}
std::map<std::string, std::function<VariableVariant(const wpi::util::json&)>>
    fromJsonMap = {
        {dimensions::Number::tag, create<dimensions::Number::baseUnit>},
        {dimensions::Length::tag, create<dimensions::Length::baseUnit>},
        {dimensions::LinVel::tag, create<dimensions::LinVel::baseUnit>},
        {dimensions::LinAcc::tag, create<dimensions::LinAcc::baseUnit>},
        {dimensions::Angle::tag, create<dimensions::Angle::baseUnit>},
        {dimensions::AngVel::tag, create<dimensions::AngVel::baseUnit>},
        {dimensions::AngAcc::tag, create<dimensions::AngAcc::baseUnit>},
        {dimensions::Time::tag, create<dimensions::Time::baseUnit>},
        {dimensions::Mass::tag, create<dimensions::Mass::baseUnit>},
        {dimensions::Torque::tag, create<dimensions::Torque::baseUnit>},
        {dimensions::MoI::tag, create<dimensions::MoI::baseUnit>},
};

inline void from_json(const wpi::util::json& json, VariableVariant& c) {
  std::string dimension = json.at("dimension").get_string();

  auto parser = fromJsonMap.find(dimension);
  if (parser == fromJsonMap.end()) {
    throw std::invalid_argument("Unknown dimension: " + dimension);
  }
  auto parse = (*parser).second;
  c = parse(json);
}
}  // namespace variables
}  // namespace choreo