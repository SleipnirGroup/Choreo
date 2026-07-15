import { types } from "mobx-state-tree";
import type { HeadingConstraint } from "../../ts/src/generated/types";
import { ExprStore } from "./ExprStore";

export const HeadingConstraintStore = types
  .model("HeadingConstraintStore", {
    type: types.literal("Heading"),
    heading: ExprStore,
    tolerance: ExprStore
  })
  .views((self) => ({
    get serialize(): HeadingConstraint {
      return {
        type: "Heading",
        heading: self.heading.serialize,
        tolerance: self.tolerance.serialize
      };
    }
  }))
  .actions((self) => ({
    deserialize(value: HeadingConstraint) {
      self.heading.deserialize(value.heading);
      self.tolerance.deserialize(value.tolerance);
    }
  }));
