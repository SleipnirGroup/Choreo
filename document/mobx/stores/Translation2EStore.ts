import { types } from "mobx-state-tree";
import type { Translation2E } from "../../ts/src/generated/types";
import { ExprStore } from "./ExprStore";

export const Translation2EStore = types
  .model("Translation2EStore", {
    x: ExprStore,
    y: ExprStore
  })
  .views((self) => ({
    get serialize(): Translation2E {
      return {
        x: self.x.serialize,
        y: self.y.serialize
      };
    }
  }))
  .actions((self) => ({
    deserialize(value: Translation2E) {
      self.x.deserialize(value.x);
      self.y.deserialize(value.y);
    }
  }));
