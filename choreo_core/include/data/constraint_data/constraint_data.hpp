#pragma once
#include "data/constraint_data/max_velocity.hpp"
#include "data/constraint_data/max_acceleration.hpp"
#include "data/constraint_data/max_angular_velocity.hpp"
#include "data/constraint_data/max_angular_acceleration.hpp"
#include "data/constraint_data/point_at.hpp"
#include "data/constraint_data/heading_constraint.hpp"
#include "data/constraint_data/stop_point.hpp"
#include "data/constraint_data/keep_in_circle.hpp"
#include "data/constraint_data/keep_in_rectangle.hpp"
#include "data/constraint_data/keep_in_lane.hpp"
#include "data/constraint_data/keep_out_circle.hpp"
#include "variant"
#include <wpi/util/json.hpp>
namespace choreo::ConstraintData {
    using ConstraintVariant = std::variant<
        MaxVelocity,
        MaxAcceleration,
        MaxAngularVelocity,
        MaxAngularAcceleration,
        PointAt,
        HeadingConstraint,
        StopPoint,
        KeepInCircle,
        KeepInRectangle,
        KeepInLane,
        KeepOutCircle
    >;
    inline void to_json(wpi::util::json& json, const ConstraintVariant& c) {
        std::visit([&json](auto&& arg) {
            to_json(json, arg); // relies on the to_json of each variant type
        }, c);
    }
    inline void from_json(const wpi::util::json& json, ConstraintVariant& c) {
        std::string type = json.at("type").get_string();
        if (type == "MaxVelocity") {
            MaxVelocity data;
            from_json(json, data);
            c = data;
        } else if (type == "MaxAcceleration") {
            MaxAcceleration data;
            from_json(json, data);
            c = data;
        } else if (type == "MaxAngularVelocity") {
            MaxAngularVelocity data;
            from_json(json, data);
            c = data;
        } else if (type == "MaxAngularAcceleration") {
            MaxAngularAcceleration data;
            from_json(json, data);
            c = data;
        } else if (type == "PointAt") {
            PointAt data;
            from_json(json, data);
            c = data;
        } else if (type == "Heading") {
            HeadingConstraint data;
            from_json(json, data);
            c = data;
        } else if (type == "StopPoint") {
            StopPoint data;
            from_json(json, data);
            c = data;
        } else if (type == "KeepInCircle") {
            KeepInCircle data;
            from_json(json, data);
            c = data;
        } else if (type == "KeepInRectangle") {
            KeepInRectangle data;
            from_json(json, data);
            c = data;
        } else if (type == "KeepInLane") {
            KeepInLane data;
            from_json(json, data);
            c = data;
        } else if (type == "KeepOutCircle") {
            KeepOutCircle data;
            from_json(json, data);
            c = data;
        } else {
            throw std::invalid_argument("Unknown constraint type: " + type);
        }}
} // namespace choreo