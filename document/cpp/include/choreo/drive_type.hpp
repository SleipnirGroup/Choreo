// Copyright (c) Choreo contributors
#pragma once

#include <string>
#include <wpi/util/json.hpp>

namespace choreo {

enum class DriveType { Swerve, Differential };

inline void to_json(wpi::util::json &json, const DriveType &t) {
  switch (t) {
    case DriveType::Swerve:
      json = "Swerve";
      break;
    case DriveType::Differential:
      json = "Differential";
      break;
  }
}

inline void from_json(const wpi::util::json &json, DriveType &t) {
  std::string s = json.get_string();
  if (s == "Swerve") {
    t = DriveType::Swerve;
  } else if (s == "Differential") {
    t = DriveType::Differential;
  } else {
    throw std::invalid_argument("Unknown DriveType: " + s);
  }
}

} // namespace choreo
