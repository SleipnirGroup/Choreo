import { types } from "mobx-state-tree";
import type { WaypointID } from "../../ts/src/generated/types";

export const WaypointIDStore = types
  .model("WaypointIDStore", {
    kind: types.enumeration("WaypointIDKind", ["idx", "first", "last"]),
    idx: types.optional(types.number, 0)
  })
  .views((self) => ({
    get serialize(): WaypointID {
      if (self.kind === "idx") {
        return { idx: self.idx };
      }
      return self.kind as "first" | "last";
    }
  }))
  .actions((self) => ({
    deserialize(value: WaypointID) {
      if (typeof value === "string") {
        self.kind = value;
        self.idx = 0;
        return;
      }
      self.kind = "idx";
      self.idx = value.idx;
    }
  }));
