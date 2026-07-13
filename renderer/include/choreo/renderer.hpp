// Copyright (c) Choreo contributors

#pragma once
#include <algorithm>
#include <format>
#include <fstream>
#include <functional>
#include <ranges>
#include <string>
#include <utility>
#include <vector>

#include <choreo/parameters.hpp>
#include <choreo/robot_config.hpp>
#include <choreo/trajectory/swerve_sample.hpp>

#include "../svg.hpp"

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

#include <lunasvg.h>

#include "choreo/animate.hpp"
#include "choreo/project.hpp"
#include "choreo/trajectory.hpp"
#include "gradient.hpp"

namespace choreo {
namespace render {
  const double PLOT_WIDTH = 300;
  const double PLOT_HEIGHT = 300;
  const double PADDING = 40;
template<SampleLike T>
void graph(SVGPP::Group& group, std::vector<T> data, auto accessor, std::string title = "") {
  std::vector<std::pair<wpi::units::second_t, double>> values;
  for (const auto& d : data) {
    auto point = accessor(d);
    values.push_back({point.first, static_cast<double>(point.second)});
  }
  std::sort(values.begin(), values.end(),
            [](const auto& a, const auto& b) { return a.first < b.first; });

  std::pair<wpi::units::second_t, double> min{};
  std::pair<wpi::units::second_t, double> max{};
  if (!values.empty()) {
    min.first = values.front().first;
    min.second = values.front().second;
    max.first = values.front().first;
    max.second = values.front().second;
    for (const auto& v : values) {
      if (v.first < min.first) {
        min.first = v.first;
      }
      if (v.second < min.second) {
        min.second = v.second;
      }
      if (v.first > max.first) {
        max.first = v.first;
      }
      if (v.second > max.second) {
        max.second = v.second;
      }
    }
  }

  if (values.empty()) {
    return;
  }



  double timeRange = (max.first - min.first).value();
  double valueRange = max.second - min.second;

  if (timeRange <= 0) {
    timeRange = 1;
  }
  if (valueRange <= 0) {
    valueRange = 1;
  }

  double timeScale = (PLOT_WIDTH - 2 * PADDING) / timeRange;
  double valueScale = (PLOT_HEIGHT - 2 * PADDING) / valueRange;
  std::function<double(double)> timeToX = [&](double t) {
    return PADDING + (t - min.first.value()) * timeScale;
  };
  std::function<double(double)> valueToY = [&](double v) {
    return PLOT_HEIGHT - PADDING - (v - min.second) * valueScale;
  };
  std::string pointsStr;
  for (size_t i = 0; i < values.size(); ++i) {
    double x = timeToX(values[i].first.value());
    double y = valueToY(values[i].second);

    if (i > 0) {
      pointsStr += " ";
    }
    pointsStr += std::format("{:.2f},{:.2f}", x, y);
  }

  
  // X-axis ticks every 0.1 seconds
  for (double t = std::ceil(min.first.value() * 10.0) / 10.0; t <= max.first.value(); t += 0.1) {
    double x = timeToX(t);
    group.add_child<SVGPP::Line>(x, PLOT_HEIGHT - PADDING, x, PADDING)
        ->set_attr("stroke", "black")
        .set_attr("stroke-width", "1")
        .set_attr("opacity", "0.1");
    
    auto text = group.add_child<SVGPP::Text>(x, PLOT_HEIGHT - PADDING + 20, std::format("{:.1f}", t));
    text->set_attr("text-anchor", "middle")
        .set_attr("font-size", "12")
        .set_attr("fill", "black");
  }
  // Title above the plot
  auto titleNode = group.add_child<SVGPP::Text>(PLOT_WIDTH / 2.0, PADDING / 2.0, title);
  titleNode->set_attr("text-anchor", "middle")
       .set_attr("font-size", "14")
       .set_attr("fill", "black");

   //Y-axis ticks every 0.1 unit, with 0 going across the plot
   double valueRangeLog10 = std::log10(max.second - min.second);
   double yTickSpacing = std::pow(10.0, std::floor(valueRangeLog10+0.5) - 1);
   for (double v = std::ceil(min.second / yTickSpacing) * yTickSpacing; v <= max.second; v += yTickSpacing) {
     double y = valueToY(v);
     group.add_child<SVGPP::Line>(PADDING - 5, y, PLOT_WIDTH -PADDING, y)
         ->set_attr("stroke", "black")
         .set_attr("stroke-width", "1")
         .set_attr("opacity", "0.1");
     auto text = group.add_child<SVGPP::Text>(PADDING - 10, y + 4, std::format("{:.1f}", v));
     text->set_attr("text-anchor", "end")
         .set_attr("font-size", "12")
         .set_attr("fill", "black");
   }

  auto polyline = group.add_child<SVGPP::RawElement>("polyline");
  polyline->set_attr("points", pointsStr)
      .set_attr("stroke", "blue")
      .set_attr("stroke-width", "2")
      .set_attr("fill", "none")
      .set_attr("stroke-linejoin", "miter");

  group.add_child<SVGPP::Line>(PADDING, 
                                PLOT_HEIGHT - PADDING, PLOT_WIDTH - PADDING, PLOT_HEIGHT - PADDING)
      ->set_attr("stroke", "red")
      .set_attr("stroke-width", "1");

  group.add_child<SVGPP::Line>(PADDING, PADDING, PADDING, PLOT_HEIGHT - PADDING)
      ->set_attr("stroke", "green")
      .set_attr("stroke-width", "1");

  

//   // Animated vertical scrolling bar
//   auto scrollBar =   group.add_child<SVGPP::Rect>(PADDING, PADDING, 1, PLOT_HEIGHT - 2 * PADDING);
//       scrollBar->set_attr("fill", "black");
  
//   auto animate = scrollBar->add_child<SVGPP::RawElement>("animate");
//   animate->set_attr("attributeName", "x")
//       .set_attr("from", std::to_string(PADDING))
//       .set_attr("to", std::to_string(PLOT_WIDTH - PADDING))
//       .set_attr("dur", std::format("{}s", max.first()))
//       .set_attr("repeatCount", "indefinite");
}


template <SampleLike Sample>
SVGPP::SVG render(std::vector<Sample> samples, choreo::RobotConfig config,
                  choreo::Parameters parameters,
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
    field
        ->add_child<SVGPP::Rect>(-0.0254 - FIELD_LENGTH / 2.0,
                                 -0.0254 - FIELD_WIDTH / 2.0,
                                 ((FIELD_LENGTH / 2.0) + 0.0254) * 2,
                                 ((FIELD_WIDTH / 2.0) + 0.0254) * 2)
        ->set_attr("id", std::string("wall"))
        .set_attr("stroke", std::string("white"))
        .set_attr("fill", std::string("#343434ff"));
    field->add_child<SVGPP::Line>(-1000, 0, 1000, 0)
        ->set_attr("id", std::string("xaxis"))
        .set_attr("stroke", std::string("red"));
    field->add_child<SVGPP::Line>(0, -1000, 0, 1000)
        ->set_attr("id", std::string("yaxis"))
        .set_attr("stroke", std::string("green"));
  }
  auto trajectoryGroup = base->add_child<SVGPP::Group>();
  {
    auto trajectory = choreo::SwerveDriveType::WPILibTrajectory{samples};
    for (const auto& [i, tup] :
         std::views::enumerate(std::views::adjacent<2>(samples))) {
      const auto& [a, b] = tup;
      trajectoryGroup
          ->add_child<SVGPP::Line>(a.pose.X().value(), a.pose.Y().value(),
                                   b.pose.X().value(), b.pose.Y().value())
          ->set_attr("stroke", gradient(trajectory, i).toCSS());
    }
  }
  auto robot = base->add_child<SVGPP::Group>();
  {
    choreo::svg_helpers::make_animateMotion(robot, samples);
    auto start = samples.front();
    robot->add_child<SVGPP::Circle>(0.5, 0, 0.1)
        ->set_attrs({{"stroke", "none"}, {"fill", "white"}});
    auto rect = robot->add_child<SVGPP::Rect>(
        start.pose.X().value() - 0.5, start.pose.Y().value() - 0.5, 1, 1);
    rect->set_attr("stroke", "white").set_attr("fill", "none");
  }

  auto document = lunasvg::Document::loadFromData(std::string(svg));
  {
    std::ofstream out("field.svg");
    out << std::string(svg);
  }

  document->renderToBitmap(400, 200, 0x222222FF).writeToPng("original.png");
  return svg;
  
}

template<SampleLike Sample>
struct GraphConfig {
    std::function<double(Sample sample)> accessor;
    std::string title;
    static constexpr size_t rows = 3;
    static constexpr size_t cols = 3;

};


template <SampleLike Sample>
SVGPP::SVG graph(const std::vector<Sample>& samples) {
    std::array<std::array<GraphConfig<Sample>, 3>, 3> graph_configs = {{
    {{
        {[](Sample sample) { return sample.pose.X().value(); }, "X Position (m)"},
        {[](Sample sample) { return sample.pose.Y().value(); }, "Y Position (m)"},
        {[](Sample sample) { return sample.pose.Rotation().Radians().value(); }, "Heading (Radians)"}
    }},
    {{
        {[](Sample sample) { return sample.velocity.vx.value(); }, "X Velocity (m/s)"},
        {[](Sample sample) { return sample.velocity.vy.value(); }, "Y Velocity (m/s)"},
        {[](Sample sample) { return sample.velocity.omega.value(); }, "Angular Velocity (rad/s)"}
    }},
    {{
        {[](Sample sample) { return sample.acceleration.ax.value(); }, "X Acceleration (m/s²)"},
        {[](Sample sample) { return sample.acceleration.ay.value(); }, "Y Acceleration (m/s²)"},
        {[](Sample sample) { return sample.acceleration.alpha.value(); }, "Angular Acceleration (rad/s²)"}
    }}
    }};
  SVGPP::SVG graphs;
  graphs.set_attr("width", PLOT_WIDTH*3).set_attr("height", PLOT_HEIGHT*3);
  graphs.add_child<SVGPP::Rect>(0, 0, PLOT_WIDTH*3, PLOT_HEIGHT*3)->set_attr("fill", "white");

  SVGPP::Group* graphPanelRoot = graphs.add_child<SVGPP::Group>();
  auto add_graph = [&](SVGPP::Group* graphPanelRoot, int col, int row, auto accessor, std::string title) {
    auto grp = graphPanelRoot->add_child<SVGPP::Group>();
    graph(*grp, samples, accessor, title);
    grp->set_attr("transform", "translate(" + std::to_string(col * PLOT_WIDTH) + "," + 
                                 std::to_string(row * PLOT_HEIGHT) + ")");
  };
  for(size_t row = 0; row < graph_configs.size(); ++row) {
    for(size_t col = 0; col < graph_configs[row].size(); ++col) {
      auto& config = graph_configs[row][col];
      add_graph(graphPanelRoot, col, row, [accessor = config.accessor](Sample sample) { return std::pair{sample.time, accessor(sample)}; }, config.title);
    }
}

  return graphs;
}
}  // namespace render
}  // namespace choreo
