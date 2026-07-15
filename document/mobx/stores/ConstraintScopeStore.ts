import { types } from "mobx-state-tree";
import type { ConstraintScope } from "../../ts/src/generated/types";

export const ConstraintScopeStore = types
  .model("ConstraintScopeStore", {
    value: types.enumeration("ConstraintScope", ["both", "waypoint", "segment"])
  })
  .views((self) => ({
    get serialize(): ConstraintScope {
      return self.value as ConstraintScope;
    }
  }))
  .actions((self) => ({
    deserialize(value: ConstraintScope) {
      self.value = value;
    }
  }));
