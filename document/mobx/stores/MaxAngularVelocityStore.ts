import { types } from "mobx-state-tree";
import type { MaxAngularVelocity } from "../../ts/src/generated/types";
import { ExprStore } from "./ExprStore";

export const MaxAngularVelocityStore = types
  .model("MaxAngularVelocityStore", {
    type: types.literal("MaxAngularVelocity"),
    max: ExprStore
  })
  .views((self) => ({
    get serialize(): MaxAngularVelocity {
      return {
        type: "MaxAngularVelocity",
        max: self.max.serialize
      };
    }
  }))
  .actions((self) => ({
    deserialize(value: MaxAngularVelocity) {
      self.max.deserialize(value.max);
    }
  }));
