import { types } from "mobx-state-tree";
import type { ForceVector2D } from "../../ts/src/generated/types";

export const ForceVector2DStore = types
  .model("ForceVector2DStore", {
    x: types.number,
    y: types.number
  })
  .views((self) => ({
    get serialize(): ForceVector2D {
      return {
        x: self.x,
        y: self.y
      };
    }
  }))
  .actions((self) => ({
    deserialize(value: ForceVector2D) {
      self.x = value.x;
      self.y = value.y;
    }
  }));
