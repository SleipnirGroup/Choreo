// Copyright (c) Choreo contributors

#include <format>
#include <fstream>
#include <iostream>
#include <ranges>
#include <string>
#include <utility>
#include <vector>

#include <choreo/parameters.hpp>
#include <choreo/robot_config.hpp>
#include <choreo/trajectory/swerve_sample.hpp>
#include <lunasvg.h>

#include "choreo/animate.hpp"
#include "choreo/gradient.hpp"
#include "choreo/renderer.hpp"
#include "wpi/util/fs.hpp"
using namespace lunasvg;
namespace choreo {

namespace render {

SVGPP::SVG render(std::vector<choreo::SwerveSample> samples,
                  choreo::RobotConfig config, choreo::Parameters parameters,
                  choreo::render::path_gradient::PathGradient& gradient) {
  constexpr double FIELD_WIDTH = 8;
  constexpr double FIELD_LENGTH = 16;
  using namespace SVGPP;
  SVG svg;
  svg.set_attr("viewBox",
               std::format("{} {} {} {}", -0.0254 - FIELD_LENGTH / 2.0,
                           -0.0254 - FIELD_WIDTH / 2.0, FIELD_LENGTH + 0.1508,
                           FIELD_WIDTH + 0.1508));
  auto base = svg.add_child<SVGPP::Group>();
  base->set_attr("transform", "scale(1, -1)").set_attr("stroke-width", 0.0508);
  auto field = base->add_child<SVGPP::Group>();
  {
    // wall
    field
        ->add_child<SVGPP::Rect>(-0.0254 - FIELD_LENGTH / 2.0,
                                 -0.0254 - FIELD_WIDTH / 2.0,
                                 ((FIELD_LENGTH / 2.0) + 0.0254) * 2,
                                 ((FIELD_WIDTH / 2.0) + 0.0254) * 2)
        ->set_attr("id", std::string("wall"))
        .set_attr("stroke", std::string("white"))
        .set_attr("fill", std::string("#343434ff"));
    // red X axis
    field->add_child<SVGPP::Line>(-1000, 1000, 0, 0)
        ->set_attr("id", std::string("xaxis"))
        .set_attr("stroke", std::string("red"));
    field->add_child<SVGPP::Line>(0, 0, -1000, 1000)
        ->set_attr("id", std::string("yaxis"))
        .set_attr("stroke", std::string("green"));
  }
  auto trajectory = base->add_child<SVGPP::Group>();
  {
    for (const auto& [i, tup] :
         std::views::enumerate(std::views::adjacent<2>(samples))) {
      const auto& [a, b] = tup;
      trajectory->add_child<SVGPP::Line>(a.x, b.x, a.y, b.y)
          ->set_attr("stroke", gradient(samples, i).toCSS());
    }
  }
  auto robot = base->add_child<SVGPP::Group>();
  {
    choreo::svg_helpers::make_animateMotion(robot, samples);
    auto start = samples.front();
    robot->add_child<SVGPP::Circle>(0.5, 0, 0.1)
        ->set_attrs({{"stroke", "none"}, {"fill", "white"}});
    auto rect =
        robot->add_child<SVGPP::Rect>(start.x - 0.5, start.y - 0.5, 1, 1);
    rect->set_attr("stroke", "white").set_attr("fill", "none");
  }

  auto document = Document::loadFromData(std::string(svg));
  {
    std::ofstream out("field.svg");
    out << std::string(svg);
  }

  document->renderToBitmap(400, 200, 0x222222FF).writeToPng("original.png");

  return svg;
}

}  // namespace render
}  // namespace choreo
