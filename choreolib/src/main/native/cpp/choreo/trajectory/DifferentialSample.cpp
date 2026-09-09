// Copyright (c) Choreo contributors

#include "choreo/trajectory/DifferentialSample.hpp"

#include <wpi/json.h>

void choreo::to_json(wpi::json& json,
                     const DifferentialSample& trajectorySample) {
  json = wpi::json{{"t", trajectorySample.timestamp.value()},
                   {"x", trajectorySample.x.value()},
                   {"y", trajectorySample.y.value()},
                   {"heading", trajectorySample.heading.value()},
                   {"vl", trajectorySample.vl.value()},
                   {"vr", trajectorySample.vr.value()},
                   {"omega", trajectorySample.omega.value()},
                   {"al", trajectorySample.al.value()},
                   {"ar", trajectorySample.ar.value()},
                   {"fl", trajectorySample.fl.value()},
                   {"fr", trajectorySample.fr.value()}};
}

void choreo::from_json(const wpi::json& json,
                       DifferentialSample& trajectorySample) {
  trajectorySample.timestamp = units::second_t{json.at("t").get<double>()};
  trajectorySample.x = units::meter_t{json.at("x").get<double>()};
  trajectorySample.y = units::meter_t{json.at("y").get<double>()};
  trajectorySample.heading = units::radian_t{json.at("heading").get<double>()};
  trajectorySample.vl = units::meters_per_second_t{json.at("vl").get<double>()};
  trajectorySample.vr = units::meters_per_second_t{json.at("vr").get<double>()};
  trajectorySample.omega =
      units::radians_per_second_t{json.at("omega").get<double>()};
  trajectorySample.al =
      units::meters_per_second_squared_t{json.at("al").get<double>()};
  trajectorySample.ar =
      units::meters_per_second_squared_t{json.at("ar").get<double>()};
  trajectorySample.fl = units::newton_t{json.at("fl").get<double>()};
  trajectorySample.fr = units::newton_t{json.at("fr").get<double>()};
}
