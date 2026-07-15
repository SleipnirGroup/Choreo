import { types } from "mobx-state-tree";
import type { WpiPose2D } from "../../ts/src/generated/types";
import { WpiRotation2DStore } from "./WpiRotation2DStore";
import { WpiTranslation2DStore } from "./WpiTranslation2DStore";

export const WpiPose2DStore = types
  .model("WpiPose2DStore", {
    translation: WpiTranslation2DStore,
    rotation: WpiRotation2DStore
  })
  .views((self) => ({
    get serialize(): WpiPose2D {
      return {
        translation: self.translation.serialize,
        rotation: self.rotation.serialize
      };
    }
  }))
  .actions((self) => ({
    deserialize(value: WpiPose2D) {
      self.translation.deserialize(value.translation);
      self.rotation.deserialize(value.rotation);
    }
  }));
