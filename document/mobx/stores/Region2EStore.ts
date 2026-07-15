import { types } from "mobx-state-tree";
import type { Region2E } from "../../ts/src/generated/types";
import { ExprStore } from "./ExprStore";

export const Region2EStore = types
  .model("Region2EStore", {
    x: ExprStore,
    y: ExprStore,
    heading: ExprStore,
    w: ExprStore,
    h: ExprStore
  })
  .views((self) => ({
    get serialize(): Region2E {
      return {
        x: self.x.serialize,
        y: self.y.serialize,
        heading: self.heading.serialize,
        w: self.w.serialize,
        h: self.h.serialize
      };
    }
  }))
  .actions((self) => ({
    deserialize(value: Region2E) {
      self.x.deserialize(value.x);
      self.y.deserialize(value.y);
      self.heading.deserialize(value.heading);
      self.w.deserialize(value.w);
      self.h.deserialize(value.h);
    }
  }));
