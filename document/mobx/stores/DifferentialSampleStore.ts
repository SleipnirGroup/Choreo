import { types } from "mobx-state-tree";
import type { DifferentialSample } from "../../ts/src/generated/types";
import { WpiChassisAccelerationsStore } from "./WpiChassisAccelerationsStore";
import { WpiChassisVelocitiesStore } from "./WpiChassisVelocitiesStore";
import { WpiPose2DStore } from "./WpiPose2DStore";

export const DifferentialSampleStore = types
  .model("DifferentialSampleStore", {
    time: types.number,
    pose: WpiPose2DStore,
    velocity: WpiChassisVelocitiesStore,
    acceleration: WpiChassisAccelerationsStore,
    leftVelocity: types.number,
    rightVelocity: types.number
  })
  .views((self) => ({
    get serialize(): DifferentialSample {
      return {
        time: self.time,
        pose: self.pose.serialize,
        velocity: self.velocity.serialize,
        acceleration: self.acceleration.serialize,
        leftVelocity: self.leftVelocity,
        rightVelocity: self.rightVelocity
      };
    }
  }))
  .actions((self) => ({
    deserialize(value: DifferentialSample) {
      self.time = value.time;
      self.pose.deserialize(value.pose);
      self.velocity.deserialize(value.velocity);
      self.acceleration.deserialize(value.acceleration);
      self.leftVelocity = value.leftVelocity;
      self.rightVelocity = value.rightVelocity;
    }
  }));
