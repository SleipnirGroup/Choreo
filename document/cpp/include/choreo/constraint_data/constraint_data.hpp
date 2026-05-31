// Copyright (c) Choreo contributors

#pragma once
#include <concepts>
#include <string>
#include <variant>
#include <print>

#include <wpi/util/json.hpp>

#include "heading_constraint.hpp"
#include "keep_in_circle.hpp"
// #include "keep_in_lane.hpp"
// #include "keep_in_rectangle.hpp"
// #include "keep_out_circle.hpp"
// #include "max_acceleration.hpp"
// #include "max_angular_acceleration.hpp"
#include "max_angular_velocity.hpp"
#include "max_velocity.hpp"
// #include "point_at.hpp"
// #include "stop_point.hpp"
namespace choreo::ConstraintData {

/// ConstraintLike concept.
template <typename T>
concept ConstraintLike =
    requires(T self, const choreo::Waypoint& start,
             const std::optional<choreo::Waypoint>& end,
             const std::vector<trajopt::KeepOutRegion>& bumpers) {
      {
        self.toTrajoptConstraint(start, end, bumpers)
      } -> std::same_as<trajopt::Constraint>;
      { self.scope() } -> std::same_as<choreo::ConstraintScope>;
      { T::type_string() } -> std::same_as<std::string_view>;
          };
using ConstraintVariant = std::variant<
    //clang-format off
    MaxVelocity, MaxAngularVelocity,
    // MaxVelocity, MaxAcceleration, MaxAngularVelocity,
    //              MaxAngularAcceleration, PointAt, HeadingConstraint,
    //              StopPoint,
    KeepInCircle
    // KeepInRectangle,
    // KeepInLane,
    // KeepOutCircle
    //clang-format on
    >;
inline void to_json(wpi::util::json& json, const ConstraintVariant& c) {
  std::visit(
      [&json](auto&& arg) {
        to_json(json, arg);  // relies on the to_json of each variant type
      },
      c);
}
inline void from_json(const wpi::util::json& json, ConstraintVariant& c) {
  std::string type = json.at("type").get_string();
  std::println("type: {}", type);
  if (type == MaxVelocity::type_string()) {
    MaxVelocity data;
    from_json(json, data);
    c = data;
    // } else if (type == "MaxAcceleration") {
    //   MaxAcceleration data;
    //   from_json(json, data);
    //   c = data;
  } else if (type == MaxAngularVelocity::type_string()) {
    MaxAngularVelocity data;
    from_json(json, data);
    c = data;
  // } else if (type == "MaxAngularAcceleration") {
  //   MaxAngularAcceleration data;
  //   from_json(json, data);
  //   c = data;
  // } else if (type == "PointAt") {
  //   PointAt data;
  //   from_json(json, data);
  //   c = data;
  // } else if (type == "Heading") {
  //   HeadingConstraint data;
  //   from_json(json, data);
  //   c = data;
  // } else if (type == "StopPoint") {
  //   StopPoint data;
  //   from_json(json, data);
  //   c = data;
  // } else
  } else if (type == KeepInCircle::type_string()) {
    KeepInCircle data;
    from_json(json, data);
    c = data;
    // else if (type == "KeepInRectangle") {
    //    KeepInRectangle data;
    //    from_json(json, data);
    //    c = data;
    //  } else if (type == "KeepInLane") {
    //    KeepInLane data;
    //    from_json(json, data);
    //    c = data;
    //  } else if (type == "KeepOutCircle") {
    //    KeepOutCircle data;
    //    from_json(json, data);
    //    c = data;
  } else {
    throw std::invalid_argument("Unknown constraint type: " + type);
  }
}

template <typename>
struct HoldsConstraintTypes;

/// Type trait that evaluates to true if variant only holds constraint types.
template <typename... Ts>
struct HoldsConstraintTypes<std::variant<Ts...>> {
  /// True if variant only holds constraint types.
  static constexpr bool value = (ConstraintLike<Ts> && ...);
};

static_assert(HoldsConstraintTypes<ConstraintVariant>::value);
}  // namespace choreo::ConstraintData
