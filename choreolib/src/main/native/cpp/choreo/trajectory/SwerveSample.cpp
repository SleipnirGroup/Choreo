// Copyright (c) Choreo contributors

#include "choreo/trajectory/SwerveSample.hpp"

#include <algorithm>

#include <wpi/util/json.hpp>

void choreo::to_json(wpi::util::json& json,
                     const SwerveSample& trajectorySample) {
  std::array<double, 4> fx;
  std::transform(trajectorySample.moduleForcesX.begin(),
                 trajectorySample.moduleForcesX.end(), fx.begin(),
                 [](wpi::units::newton_t x) { return x.value(); });

  std::array<double, 4> fy;
  std::transform(trajectorySample.moduleForcesY.begin(),
                 trajectorySample.moduleForcesY.end(), fy.begin(),
                 [](wpi::units::newton_t x) { return x.value(); });

  json = wpi::util::json::object(
      "t", trajectorySample.timestamp.value(), "x", trajectorySample.x.value(),
      "y", trajectorySample.y.value(), "heading",
      trajectorySample.heading.value(), "vx", trajectorySample.vx.value(), "vy",
      trajectorySample.vy.value(), "omega", trajectorySample.omega.value(),
      "ax", trajectorySample.ax.value(), "ay", trajectorySample.ay.value(),
      "alpha", trajectorySample.alpha.value(), "fx", fx, "fy", fy);
}

void choreo::from_json(const wpi::util::json& json,
                       SwerveSample& trajectorySample) {
  trajectorySample.timestamp = wpi::units::second_t{json.at("t").get_number()};
  trajectorySample.x = wpi::units::meter_t{json.at("x").get_number()};
  trajectorySample.y = wpi::units::meter_t{json.at("y").get_number()};
  trajectorySample.heading =
      wpi::units::radian_t{json.at("heading").get_number()};
  trajectorySample.vx =
      wpi::units::meters_per_second_t{json.at("vx").get_number()};
  trajectorySample.vy =
      wpi::units::meters_per_second_t{json.at("vy").get_number()};
  trajectorySample.omega =
      wpi::units::radians_per_second_t{json.at("omega").get_number()};
  trajectorySample.ax =
      wpi::units::meters_per_second_squared_t{json.at("ax").get_number()};
  trajectorySample.ay =
      wpi::units::meters_per_second_squared_t{json.at("ay").get_number()};
  trajectorySample.alpha =
      wpi::units::radians_per_second_squared_t{json.at("alpha").get_number()};
  const auto& fx = json.at("fx");
  const auto& fy = json.at("fy");
  for (int i = 0; i < 4; ++i) {
    trajectorySample.moduleForcesX[i] =
        wpi::units::newton_t{fx.at(i).get_number()};
    trajectorySample.moduleForcesY[i] =
        wpi::units::newton_t{fy.at(i).get_number()};
  }
}
