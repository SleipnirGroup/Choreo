import { types } from "mobx-state-tree";
import type { DriveType } from "../../ts/src/generated/types";

export const DriveTypeStore = types
  .model("DriveTypeStore", {
    value: types.enumeration("DriveType", ["Swerve", "Differential"])
  })
  .views((self) => ({
    get serialize(): DriveType {
      return self.value as DriveType;
    }
  }))
  .actions((self) => ({
    deserialize(value: DriveType) {
      self.value = value;
    }
  }));
