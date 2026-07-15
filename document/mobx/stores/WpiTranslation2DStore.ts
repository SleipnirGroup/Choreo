import { types } from "mobx-state-tree";
import type { WpiTranslation2D } from "../../ts/src/generated/types";

export const WpiTranslation2DStore = types
  .model("WpiTranslation2DStore", {
    x: types.number,
    y: types.number
  })
  .views((self) => ({
    get serialize(): WpiTranslation2D {
      return {
        x: self.x,
        y: self.y
      };
    }
  }))
  .actions((self) => ({
    deserialize(value: WpiTranslation2D) {
      self.x = value.x;
      self.y = value.y;
    }
  }));
