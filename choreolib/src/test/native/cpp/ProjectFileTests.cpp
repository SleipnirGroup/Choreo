// Copyright (c) Choreo contributors

#include <iostream>

#include <gtest/gtest.h>
#include <units/force.h>
#include <wpi/json.h>

#include "choreo/trajectory/ProjectFile.h"

using namespace choreo;

constexpr std::string_view projectJsonString = R"({
  "name":"choreo",
  "version":"v2025.0.0",
  "type":"Swerve",
  "variables":{
      "expressions":{
          "test":{
              "dimension":"Number",
              "var":["12",0.0]
          }
      },
      "poses":{
          "hj":{
              "x":["1 m",1.0],
              "y":["2 m",2.0],
              "heading":["3 rad",3.0]
          }
      }
  },
  "config":{
      "modules":[
          {"x":["11 in",0.2794], "y":["11 in",0.2794]},
          {"x":["-11 in",-0.2794], "y":["11 in",0.2794]},
          {"x":["-11 in",-0.2794], "y":["-11 in",-0.2794]},
          {"x":["11 in",0.2794], "y":["-11 in",-0.2794]}
      ],
      "mass":["150 lbs",68.0388555],
      "inertia":["6 kg m ^ 2",6.0],
      "gearing":["6.5",6.5],
      "radius":["2 in",0.0508],
      "vmax":["6000 RPM",628.3185307179587],
      "tmax":["1.2 N * m",1.2],
      "bumper":{
          "front":["16 in",0.4064],
          "left":["16 in",0.4064],
          "back":["16 in",0.4064],
          "right":["16 in",0.4064]
      }
  },
  "generationFeatures":[]
})";
const wpi::json projectJson = wpi::json::parse(projectJsonString);

const ProjectFile correctProjFile{
    "choreo",
    "v2025.0.0",
    "Swerve",
    {{"test", Variable{"Number", Expression{"12", 0.0}}}},
    {{"hj", Pose{Expression{"1 m", 1.0}, Expression{"2 m", 2.0},
                 Expression{"3 rad", 3.0}}}},
    Config{
        {XYExpression{Expression{"11 in", 0.2794}, Expression{"11 in", 0.2794}},
         XYExpression{Expression{"-11 in", -0.2794},
                      Expression{"11 in", 0.2794}},
         XYExpression{Expression{"-11 in", -0.2794},
                      Expression{"-11 in", -0.2794}},
         XYExpression{Expression{"11 in", 0.2794},
                      Expression{"-11 in", -0.2794}}},
        Expression{"150 lbs", 68.0388555},
        Expression{"6 kg m ^ 2", 6.0},
        Expression{"6.5", 6.5},
        Expression{"2 in", 0.0508},
        Expression{"6000 RPM", 628.3185307179587},
        Expression{"1.2 N * m", 1.2},
        Bumpers{
            Expression{"16 in", 0.4064},
            Expression{"16 in", 0.4064},
            Expression{"16 in", 0.4064},
            Expression{"16 in", 0.4064},
        },
        Expression{}},
    {}};

TEST(ProjectFileTest, Deserialize) {
  try {
    ProjectFile projectfile = projectJson.get<ProjectFile>();
    ASSERT_EQ(correctProjFile, projectfile);
  } catch (wpi::json::parse_error& e) {
    std::cerr << "JSON parse error: " << e.what() << std::endl;
    FAIL();
  } catch (std::exception& e) {
    std::cerr << "Error: " << e.what() << std::endl;
    FAIL();
  }
  SUCCEED();
}
