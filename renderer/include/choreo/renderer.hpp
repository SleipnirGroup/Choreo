// Copyright (c) Choreo contributors

#pragma once
#include <string>
#include <utility>
#include <vector>

#include <choreo/parameters.hpp>
#include <choreo/robot_config.hpp>
#include <choreo/trajectory/swerve_sample.hpp>

#include "../svg.hpp"
#include "gradient.hpp"

namespace SVGPP {
// Minimal helper to create arbitrary tags not modelled by svg.hpp (filter /
// fe*).
class RawElement : public Element {
 public:
  static constexpr ElementKind static_kind = ElementKind::Custom;
  RawElement() = default;
  explicit RawElement(const std::string& tag) : tag_(tag) {}
  explicit RawElement(const std::string& tag, SVGAttrib attrs)
      : Element(std::move(attrs)), tag_(tag) {}
  ElementKind kind() const override { return static_kind; }
  std::string tag() override { return tag_; }

 private:
  std::string tag_;
};
}  // namespace SVGPP
namespace choreo {
namespace render {
SVGPP::SVG render(std::vector<choreo::SwerveSample> samples,
                  choreo::RobotConfig config, choreo::Parameters parameters,
                  choreo::render::path_gradient::PathGradient& gradient);
}  // namespace render
}  // namespace choreo
