import { types } from "mobx-state-tree";
import type { KeepInCircle } from "../../ts/src/generated/types";
import { ExprStore } from "./ExprStore";

export const KeepInCircleStore = types
  .model("KeepInCircleStore", {
    type: types.literal("KeepInCircle"),
    x: ExprStore,
    y: ExprStore,
    r: ExprStore
  })
  .views((self) => ({
    get serialize(): KeepInCircle {
      return {
        type: "KeepInCircle",
        x: self.x.serialize,
        y: self.y.serialize,
        r: self.r.serialize
      };
    }
  }))
  .actions((self) => ({
    deserialize(value: KeepInCircle) {
      self.x.deserialize(value.x);
      self.y.deserialize(value.y);
      self.r.deserialize(value.r);
    }
  }));
