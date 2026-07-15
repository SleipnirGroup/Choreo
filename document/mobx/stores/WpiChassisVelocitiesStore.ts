import { types } from "mobx-state-tree";
import type { WpiChassisVelocities } from "../../ts/src/generated/types";

export const WpiChassisVelocitiesStore = types
  .model("WpiChassisVelocitiesStore", {
    vx: types.number,
    vy: types.number,
    omega: types.number
  })
  .views((self) => ({
    get serialize(): WpiChassisVelocities {
      return {
        vx: self.vx,
        vy: self.vy,
        omega: self.omega
      };
    }
  }))
  .actions((self) => ({
    deserialize(value: WpiChassisVelocities) {
      self.vx = value.vx;
      self.vy = value.vy;
      self.omega = value.omega;
    }
  }));
