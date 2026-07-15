import { types } from "mobx-state-tree";
import type { WpiRotation2D } from "../../ts/src/generated/types";

export const WpiRotation2DStore = types
  .model("WpiRotation2DStore", {
    radians: types.number
  })
  .views((self) => ({
    get serialize(): WpiRotation2D {
      return {
        radians: self.radians
      };
    }
  }))
  .actions((self) => ({
    deserialize(value: WpiRotation2D) {
      self.radians = value.radians;
    }
  }));
