// Copyright (c) Choreo contributors

#include "choreo/trajectory/SwerveSample.hpp"

#include <algorithm>

#include <wpi/json.h>

void choreo::to_json(wpi::json& json, const SwerveSample& trajectorySample) {
  std::array<double, 4> fx;
  std::transform(trajectorySample.moduleForcesX.begin(),
                 trajectorySample.moduleForcesX.end(), fx.begin(),
                 [](units::newton_t x) { return x.value(); });

  std::array<double, 4> fy;
  std::transform(trajectorySample.moduleForcesY.begin(),
                 trajectorySample.moduleForcesY.end(), fy.begin(),
                 [](units::newton_t x) { return x.value(); });

  json = wpi::json{{"t", trajectorySample.timestamp.value()},
                   {"x", trajectorySample.x.value()},
                   {"y", trajectorySample.y.value()},
                   {"heading", trajectorySample.heading.value()},
                   {"vx", trajectorySample.vx.value()},
                   {"vy", trajectorySample.vy.value()},
                   {"omega", trajectorySample.omega.value()},
                   {"ax", trajectorySample.ax.value()},
                   {"ay", trajectorySample.ay.value()},
                   {"alpha", trajectorySample.alpha.value()},
                   {"fx", fx},
                   {"fy", fy}};
}

void choreo::from_json(const wpi::json& json, SwerveSample& trajectorySample) {
  trajectorySample.timestamp = units::second_t{json.at("t").get<double>()};
  trajectorySample.x = units::meter_t{json.at("x").get<double>()};
  trajectorySample.y = units::meter_t{json.at("y").get<double>()};
  trajectorySample.heading = units::radian_t{json.at("heading").get<double>()};
  trajectorySample.vx = units::meters_per_second_t{json.at("vx").get<double>()};
  trajectorySample.vy = units::meters_per_second_t{json.at("vy").get<double>()};
  trajectorySample.omega =
      units::radians_per_second_t{json.at("omega").get<double>()};
  trajectorySample.ax =
      units::meters_per_second_squared_t{json.at("ax").get<double>()};
  trajectorySample.ay =
      units::meters_per_second_squared_t{json.at("ay").get<double>()};
  trajectorySample.alpha =
      units::radians_per_second_squared_t{json.at("alpha").get<double>()};
  const auto& fx = json.at("fx");
  const auto& fy = json.at("fy");
  for (int i = 0; i < 4; ++i) {
    trajectorySample.moduleForcesX[i] = units::newton_t{fx.at(i).get<double>()};
    trajectorySample.moduleForcesY[i] = units::newton_t{fy.at(i).get<double>()};
  }
}
