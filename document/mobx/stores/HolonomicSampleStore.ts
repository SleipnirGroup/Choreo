import { types } from "mobx-state-tree";
import type { HolonomicSample } from "../../ts/src/generated/types";
import { WpiChassisAccelerationsStore } from "./WpiChassisAccelerationsStore";
import { WpiChassisVelocitiesStore } from "./WpiChassisVelocitiesStore";
import { WpiPose2DStore } from "./WpiPose2DStore";

export const HolonomicSampleStore = types
  .model("HolonomicSampleStore", {
    time: types.number,
    pose: WpiPose2DStore,
    velocity: WpiChassisVelocitiesStore,
    acceleration: WpiChassisAccelerationsStore
  })
  .views((self) => ({
    get serialize(): HolonomicSample {
      return {
        time: self.time,
        pose: self.pose.serialize,
        velocity: self.velocity.serialize,
        acceleration: self.acceleration.serialize
      };
    }
  }))
  .actions((self) => ({
    deserialize(value: HolonomicSample) {
      self.time = value.time;
      self.pose.deserialize(value.pose);
      self.velocity.deserialize(value.velocity);
      self.acceleration.deserialize(value.acceleration);
    }
  }));
