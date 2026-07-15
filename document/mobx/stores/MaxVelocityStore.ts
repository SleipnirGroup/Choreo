import { types } from "mobx-state-tree";
import type { MaxVelocity } from "../../ts/src/generated/types";
import { ExprStore } from "./ExprStore";

export const MaxVelocityStore = types
  .model("MaxVelocityStore", {
    type: types.literal("MaxVelocity"),
    max: ExprStore
  })
  .views((self) => ({
    get serialize(): MaxVelocity {
      return {
        type: "MaxVelocity",
        max: self.max.serialize
      };
    }
  }))
  .actions((self) => ({
    deserialize(value: MaxVelocity) {
      self.max.deserialize(value.max);
    }
  }));
