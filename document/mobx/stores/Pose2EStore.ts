import { types } from "mobx-state-tree";
import type { Pose2E } from "../../ts/src/generated/types";
import { ExprStore } from "./ExprStore";

export const Pose2EStore = types
  .model("Pose2EStore", {
    x: ExprStore,
    y: ExprStore,
    heading: ExprStore
  })
  .views((self) => ({
    get serialize(): Pose2E {
      return {
        x: self.x.serialize,
        y: self.y.serialize,
        heading: self.heading.serialize
      };
    }
  }))
  .actions((self) => ({
    deserialize(value: Pose2E) {
      self.x.deserialize(value.x);
      self.y.deserialize(value.y);
      self.heading.deserialize(value.heading);
    }
  }));
