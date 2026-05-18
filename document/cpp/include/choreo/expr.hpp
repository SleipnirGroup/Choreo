// Copyright (c) Choreo contributors

#pragma once

#include <algorithm>
#include <string>
#include <utility>

#include <wpi/units/base.hpp>
#include <wpi/util/json.hpp>
namespace choreo {
template <typename BaseUnit>
struct Expr {
  std::string exp;
  BaseUnit val;
  /// default constructor for deserialization. Don't use this directly, as it
  /// will create an Expr with an empty string and a value of 0, which is not a
  /// valid state for an Expr. Instead, use the constructor that accepts a
  /// BaseUnit or a double, which will properly initialize the exp string.
  Expr() : Expr(BaseUnit(0)) {};
  Expr(std::string exp, double val) : exp(exp), val(val) {}
  /// a constructor that accepts anything convertible to BaseUnit directly and
  /// formats the string with the unit abbreviation
  template <typename U>
    requires std::is_convertible_v<U, BaseUnit>
  // NOLINTNEXTLINE (google-explicit-constructor)
  Expr(U&& u) : Expr(static_cast<BaseUnit>(u)) {}
  // TODO: double constructor, but only if the unit type is scalar. This is a
  // bit tricky to implement, because we need to use SFINAE to only enable this
  // constructor if the unit type is scalar, but we also need to make sure that
  // it doesn't conflict with the constructor that accepts a BaseUnit directly.
  // We can use std::enable_if_t and std::is_same_v to achieve this, but it will
  // require some careful template metaprogramming.
  // NOLINTNEXTLINE (google-explicit-constructor)
  Expr(BaseUnit unitval) : val(unitval) {
    // std::println("Constructing Expr with value {} and unit {}", val.value(),
    // typeid(BaseUnit).name());
    // TODO: make a compile-time function that maps the BaseUnit type to its
    //  MathJS-compatible abbreviation as a string, so that we can format the
    //  exp string properly. This will likely involve some template
    //  specialization or constexpr if statements to handle different unit types
    //  (e.g. length, mass, time, etc.). For now, we'll just not put the unit
    //  suffix.
    exp = std::format("{}", val.value());
  }
  operator double() const { return val.value(); }
  BaseUnit unit() const { return val; }
};

template <typename BaseUnit>
inline void to_json(wpi::util::json& json, const Expr<BaseUnit>& expr) {
  json = wpi::util::json::object("exp", expr.exp, "val", expr.val.value());
}

template <typename BaseUnit>
inline void from_json(const wpi::util::json& json, Expr<BaseUnit>& expr) {
  expr.exp = json.at("exp").get_string();
  // get_number, not get_double, because get_double can throw if the value is
  // serialized as an int.
  expr.val = BaseUnit(json.at("val").get_number());
}
}  // namespace choreo
