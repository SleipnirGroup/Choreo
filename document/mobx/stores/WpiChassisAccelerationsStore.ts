import { types } from "mobx-state-tree";
import type { WpiChassisAccelerations } from "../../ts/src/generated/types";

export const WpiChassisAccelerationsStore = types
  .model("WpiChassisAccelerationsStore", {
    ax: types.number,
    ay: types.number,
    alpha: types.number
  })
  .views((self) => ({
    get serialize(): WpiChassisAccelerations {
      return {
        ax: self.ax,
        ay: self.ay,
        alpha: self.alpha
      };
    }
  }))
  .actions((self) => ({
    deserialize(value: WpiChassisAccelerations) {
      self.ax = value.ax;
      self.ay = value.ay;
      self.alpha = value.alpha;
    }
  }));
