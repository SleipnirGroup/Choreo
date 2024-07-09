// Copyright (c) Choreo contributors

#include <iostream>

#include <gtest/gtest.h>
#include <units/force.h>
#include <wpi/json.h>

#include "choreo/lib/ChoreoTrajectoryState.h"

using namespace choreolib;

constexpr double epsilon = 0.001;

const char* correct_json_str = R"({
  "timestamp":0.0,
  "x":1.0,"y":2.0,"heading":3.14,
  "velocityX":1.0,"velocityY":2.0,"angularVelocity":3.14,
  "moduleForcesX":[1.0,2.0,3.0,4.0],"moduleForcesY":[1.0,2.0,3.0,4.0]
  })";
const wpi::json correct_json = wpi::json::parse(correct_json_str);
const ChoreoTrajectoryState state = {0.0_s,
                                     1.0_m,
                                     2.0_m,
                                     3.14_rad,
                                     1.0_mps,
                                     2.0_mps,
                                     3.14_rad / 1.0_s,
                                     {1.0_N, 2.0_N, 3.0_N, 4.0_N},
                                     {1.0_N, 2.0_N, 3.0_N, 4.0_N}};

TEST(TrajectoryStateTest, Serialize) {
  wpi::json json{};
  to_json(json, state);
  ASSERT_EQ(json.dump(), correct_json.dump());
}

TEST(TrajectoryStateTest, Deserialize) {
  ChoreoTrajectoryState new_state;
  wpi::json json = wpi::json::parse(correct_json_str);
  choreolib::from_json(json, new_state);

  ASSERT_NEAR(state.timestamp.value(), new_state.timestamp.value(), epsilon);

  ASSERT_NEAR(state.x.value(), new_state.x.value(), epsilon);
  ASSERT_NEAR(state.y.value(), new_state.y.value(), epsilon);
  ASSERT_NEAR(state.heading.value(), new_state.heading.value(), epsilon);

  ASSERT_NEAR(state.velocityX.value(), new_state.velocityX.value(), epsilon);
  ASSERT_NEAR(state.velocityY.value(), new_state.velocityY.value(), epsilon);
  ASSERT_NEAR(state.angularVelocity.value(), new_state.angularVelocity.value(),
              epsilon);

  ASSERT_EQ(state.moduleForcesX.size(), new_state.moduleForcesX.size());
  ASSERT_EQ(new_state.moduleForcesX.size(), new_state.moduleForcesY.size());

  for (int i = 0; i < 4; ++i) {
    ASSERT_NEAR(state.moduleForcesX[i].value(),
                new_state.moduleForcesX[i].value(), epsilon);
    ASSERT_NEAR(state.moduleForcesY[i].value(),
                new_state.moduleForcesY[i].value(), epsilon);
  }
}
