// Copyright (c) Choreo contributors

#include <iostream>

#include <gtest/gtest.h>
#include <units/force.h>
#include <wpi/json.h>

#include "choreo/trajectory/SwerveSample.hpp"
#include "choreo/trajectory/Trajectory.hpp"

using namespace choreo;

constexpr std::string_view swerveTrajectoryString =
    R"({
 "name":"New Path",
 "version":3,
 "snapshot":{
  "waypoints":[
    {"x":0.0, "y":0.0, "heading":0.0, "intervals":9, "split":false, "fixTranslation":true, "fixHeading":true, "overrideIntervals":false},
    {"x":1.0, "y":0.0, "heading":0.0, "intervals":9, "split":false, "fixTranslation":false, "fixHeading":false, "overrideIntervals":false},
    {"x":2.0, "y":0.0, "heading":0.0, "intervals":9, "split":false, "fixTranslation":false, "fixHeading":false, "overrideIntervals":false},
    {"x":3.0, "y":0.0, "heading":0.0, "intervals":40, "split":false, "fixTranslation":true, "fixHeading":true, "overrideIntervals":false}],
  "constraints":[
    {"from":"first", "to":null, "data":{"type":"StopPoint", "props":{}}},
    {"from":"last", "to":null, "data":{"type":"StopPoint", "props":{}}},
    {"from":1, "to":2, "data":{"type":"PointAt", "props":{"x":1.5, "y":4.0, "tolerance":0.017453292519943295, "flip":false}}}]
 },
 "params":{
  "waypoints":[
    {"x":["0 m",0.0], "y":["0 m",0.0], "heading":["0 deg",0.0], "intervals":9, "split":false, "fixTranslation":true, "fixHeading":true, "overrideIntervals":false},
    {"x":["1 m",1.0], "y":["0 m",0.0], "heading":["0 deg",0.0], "intervals":9, "split":false, "fixTranslation":false, "fixHeading":false, "overrideIntervals":false},
    {"x":["2 m",2.0], "y":["0 m",0.0], "heading":["0 deg",0.0], "intervals":9, "split":false, "fixTranslation":false, "fixHeading":false, "overrideIntervals":false},
    {"x":["3 m",3.0], "y":["0 m",0.0], "heading":["0 rad",0.0], "intervals":40, "split":false, "fixTranslation":true, "fixHeading":true, "overrideIntervals":false}],
  "constraints":[
    {"from":"first", "to":null, "data":{"type":"StopPoint", "props":{}}},
    {"from":"last", "to":null, "data":{"type":"StopPoint", "props":{}}},
    {"from":1, "to":2, "data":{"type":"PointAt", "props":{"x":["1.5 m",1.5], "y":["4 m",4.0], "tolerance":["1 deg",0.017453292519943295], "flip":false}}}]
 },
 "trajectory":{
   "config":{
    "frontLeft":{
        "x":0.2794,
        "y":0.2794
    },
    "backLeft":{
        "x":-0.2794,
        "y":0.2794
    },
    "mass":68.0388555,
    "inertia":6.0,
    "gearing":6.5,
    "radius":0.0508,
    "vmax":628.3185307179587,
    "tmax":1.2,
    "cof":1.5,
    "bumper":{
        "front":0.4064,
        "side":0.4064,
        "back":0.4064
    },
    "differentialTrackWidth":0.5588
  },
  "sampleType":"Swerve",
  "waypoints":[0.0,0.1,0.2,0.3],
  "samples":[
    {"t":0.0, "x":0.0, "y":0.0, "heading":0.0, "vx":0.0, "vy":0.0, "omega":0.0, "ax":0.0, "ay":0.0, "alpha":0.0, "fx":[0.0,0.0,0.0,0.0], "fy":[0.0,0.0,0.0,0.0]},
    {"t":1.0, "x":0.5, "y":0.1, "heading":0.2, "vx":3.0, "vy":3.0, "omega":10.0, "ax":20.0, "ay":20.0, "alpha":30.0, "fx":[100.0,200.0,300.0,400.0], "fy":[-100.0,-200.0,-300.0,-400.0]}
  ],
  "splits":[0],
  "forcesAvailable":false
 },
 "events":[
  {"name":"testEvent", "from":{"target":0, "targetTimestamp":0, "offset":{"exp":"0 s", "val":0.0}}, "event":null}
 ]
})";

const wpi::json swerveTrajectoryJson = wpi::json::parse(swerveTrajectoryString);

const Trajectory<SwerveSample> correctSwerveTrajectory{
    "New Path",
    {{0_s,
      0_m,
      0_m,
      0_rad,
      0_mps,
      0_mps,
      0_rad_per_s,
      0_mps_sq,
      0_mps_sq,
      0_rad_per_s_sq,
      {0_N, 0_N, 0_N, 0_N},
      {0_N, 0_N, 0_N, 0_N}},
     {1_s,
      0.5_m,
      0.1_m,
      0.2_rad,
      3.0_mps,
      3.0_mps,
      10_rad_per_s,
      20_mps_sq,
      20_mps_sq,
      30_rad_per_s_sq,
      {100_N, 200_N, 300_N, 400_N},
      {-100_N, -200_N, -300_N, -400_N}}},
    {0},
    {{0_s, "testEvent"}}};

TEST(TrajectoryFileTest, DeserializeSwerveTrajectory) {
  try {
    Trajectory<SwerveSample> deserializedSwerveTrajectory =
        swerveTrajectoryJson.get<Trajectory<SwerveSample>>();
    ASSERT_EQ(correctSwerveTrajectory, deserializedSwerveTrajectory);
  } catch (wpi::json::parse_error& e) {
    std::cerr << "JSON parse error: " << e.what() << std::endl;
    FAIL();
  } catch (std::exception& e) {
    std::cerr << "Error: " << e.what() << std::endl;
    FAIL();
  }
  SUCCEED();
}
