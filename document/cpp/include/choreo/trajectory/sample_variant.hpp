// Copyright (c) Choreo contributors

#pragma once

#include <algorithm>
#include <utility>
#include <variant>
#include <vector>

#include <wpi/util/json.hpp>

#include "differential_sample.hpp"
#include "swerve_sample.hpp"

namespace choreo {

using SampleVariant = std::variant<DifferentialSample, SwerveSample>;

inline void to_json(wpi::util::json& j, SampleVariant const& sample) {
  std::visit([&j](auto const& value) { j = value; }, sample);
}

inline void from_json(wpi::util::json const& j, SampleVariant& sample) {
  if (j.contains("vl") && j.contains("vr")) {
    DifferentialSample ds;
    from_json(j, ds);
    sample = std::move(ds);
    return;
  } else if (j.contains("fx") && j.contains("fy")) {
    SwerveSample ss;
    from_json(j, ss);
    sample = std::move(ss);
    return;
  }

  throw std::runtime_error("JSON does not match any known sample type");
}

using SampleListVariant =
    std::variant<std::vector<DifferentialSample>, std::vector<SwerveSample>>;

inline void to_json(wpi::util::json& j, SampleListVariant const& samples) {
  std::visit(
      [&j](auto const& value) {
        j.set_array();
        for (const auto& s : value) {
          j.get_array().push_back(wpi::util::json(s));
        }
      },
      samples);
}
inline void from_json(wpi::util::json const& j, SampleListVariant& samples) {
  if (j.get_array().size() == 0) {
    samples = std::vector<DifferentialSample>{};
    return;
  }
  if (j.contains("vl") && j.contains("vr")) {
    samples = j.get_array() |
              std::views::transform([](const wpi::util::json& x) {
                DifferentialSample ds;
                from_json(x, ds);
                return ds;
              }) |
              std::ranges::to<std::vector>();
    return;
  } else if (j.contains("fx") && j.contains("fy")) {
    samples = j.get_array() |
              std::views::transform([](const wpi::util::json& x) {
                SwerveSample ss;
                from_json(x, ss);
                return ss;
              }) |
              std::ranges::to<std::vector>();
    return;
  } else {
  }

  throw std::runtime_error("JSON does not match any known sample type");
}
}  // namespace choreo
