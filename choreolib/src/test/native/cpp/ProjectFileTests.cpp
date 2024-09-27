// Copyright (c) Choreo contributors

#include <iostream>

#include <gtest/gtest.h>
#include <units/force.h>
#include <wpi/detail/conversions/to_json.h>
#include <wpi/json.h>

#include "choreo/trajectory/ProjectFile.h"

using namespace choreo;

constexpr std::string_view projectJsonString = R"({
 "name":"test",
 "version":"v2025.0.0",
 "type":"Swerve",
 "variables":{
  "expressions":{
   "test":{
    "dimension":"Number",
    "var":{
     "exp":"2",
     "val":2.0
    }
   }
  },
  "poses":{
   "test2":{
    "x":{
     "exp":"2 m",
     "val":2.0
    },
    "y":{
     "exp":"3 m",
     "val":3.0
    },
    "heading":{
     "exp":"4 rad",
     "val":4.0
    }
   }
  }
 },
 "config":{
  "frontLeft":{
   "x":{
    "exp":"11 in",
    "val":0.2794
   },
   "y":{
    "exp":"11 in",
    "val":0.2794
   }
  },
  "backLeft":{
   "x":{
    "exp":"-11 in",
    "val":-0.2794
   },
   "y":{
    "exp":"11 in",
    "val":0.2794
   }
  },
  "mass":{
   "exp":"150 lbs",
   "val":68.0388555
  },
  "inertia":{
   "exp":"6 kg m ^ 2",
   "val":6.0
  },
  "gearing":{
   "exp":"6.5",
   "val":6.5
  },
  "radius":{
   "exp":"2 in",
   "val":0.0508
  },
  "vmax":{
   "exp":"6000 RPM",
   "val":628.3185307179587
  },
  "tmax":{
   "exp":"1.2 N * m",
   "val":1.2
  },
  "bumper":{
   "front":{
    "exp":"16 in",
    "val":0.4064
   },
   "side":{
    "exp":"16 in",
    "val":0.4064
   },
   "back":{
    "exp":"16 in",
    "val":0.4064
   }
  },
  "differentialTrackWidth":{
   "exp":"22 in",
   "val":0.5588
  }
 },
 "generationFeatures":[]
})";
const wpi::json projectJson = wpi::json::parse(projectJsonString);

const ProjectFile correctProjFile{
    "test",
    "v2025.0.0",
    "Swerve",
    {{"test", Variable{"Number", Expression{"2", 2.0}}}},
    {{"test2", Pose{Expression{"2 m", 2.0}, Expression{"3 m", 3.0},
                    Expression{"4 rad", 4.0}}}},
    Config{
        XYExpression{Expression{"11 in", 0.2794}, Expression{"11 in", 0.2794}},
        XYExpression{Expression{"-11 in", -0.2794},
                     Expression{"11 in", 0.2794}},
        Expression{"150 lbs", 68.0388555}, Expression{"6 kg m ^ 2", 6.0},
        Expression{"6.5", 6.5}, Expression{"2 in", 0.0508},
        Expression{"6000 RPM", 628.3185307179587}, Expression{"1.2 N * m", 1.2},
        Bumpers{
            Expression{"16 in", 0.4064},
            Expression{"16 in", 0.4064},
            Expression{"16 in", 0.4064},
        },
        Expression{"22 in", 0.5588}},
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
