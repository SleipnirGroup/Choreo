// Copyright (c) Choreo contributors

#pragma once

#include <map>
#include <string>
#include <variant>

#include "../expr.hpp"
#include "dimension.hpp"

namespace choreo {

template <typename DimensionType>
struct Variable {
  using Unit = typename DimensionType::baseUnit;
  using Dimension = DimensionType;
  // NOLINTNEXTLINE (google-explicit-constructor)
  Variable(const Unit value) : var(value) {}
  Variable() : Variable(Unit(0)) {};
  template <typename U>
    requires std::is_convertible_v<U, Unit>
  // NOLINTNEXTLINE (google-explicit-constructor)
  Variable(U&& u) : Variable(static_cast<Unit>(u)) {}
  static Variable fromJson(const wpi::util::json& json);

  Expr<DimensionType> var;
};

template <typename T>
inline void to_json(wpi::util::json& json, const Variable<T>& variable) {
  json = wpi::util::json::object("dimension", T::tag, "var", variable.var);
}

template <typename T>
inline void from_json(const wpi::util::json& json, Variable<T>& variable) {
  variable.var = json.at("var").get<Expr<T>>();
}

template <typename T>
inline Variable<T> Variable<T>::fromJson(const wpi::util::json& json) {
  Variable<T> value;
  from_json(json, value);
  return value;
}
using VariableVariant = std::variant<
    //clang-format off
    Variable<dimensions::Number>, Variable<dimensions::Length>,
    Variable<dimensions::LinVel>, Variable<dimensions::LinAcc>,
    Variable<dimensions::Angle>, Variable<dimensions::AngVel>,
    Variable<dimensions::AngAcc>, Variable<dimensions::Time>,
    Variable<dimensions::Mass>, Variable<dimensions::Torque>,
    Variable<dimensions::MoI>, Variable<dimensions::Current>,
    Variable<dimensions::KT>, Variable<dimensions::KV>
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
inline std::map<std::string,
                std::function<VariableVariant(const wpi::util::json&)>>
    fromJsonMap = {
        {dimensions::Number::tag, create<dimensions::Number>},
        {dimensions::Length::tag, create<dimensions::Length>},
        {dimensions::LinVel::tag, create<dimensions::LinVel>},
        {dimensions::LinAcc::tag, create<dimensions::LinAcc>},
        {dimensions::Angle::tag, create<dimensions::Angle>},
        {dimensions::AngVel::tag, create<dimensions::AngVel>},
        {dimensions::AngAcc::tag, create<dimensions::AngAcc>},
        {dimensions::Time::tag, create<dimensions::Time>},
        {dimensions::Mass::tag, create<dimensions::Mass>},
        {dimensions::Torque::tag, create<dimensions::Torque>},
        {dimensions::MoI::tag, create<dimensions::MoI>},
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
}  // namespace choreo
