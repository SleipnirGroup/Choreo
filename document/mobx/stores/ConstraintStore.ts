import { types } from "mobx-state-tree";
import type { Constraint } from "../../ts/src/generated/types";
import { ConstraintVariantStore } from "./ConstraintVariantStore";
import { WaypointIDStore } from "./WaypointIDStore";

export const ConstraintStore = types
  .model("ConstraintStore", {
    from: (WaypointIDStore, { kind: "first", idx: 0 }),
    to: types.maybe(WaypointIDStore),
    data: ConstraintVariantStore,
    enabled: types.optional(types.boolean, true)
  })
  .views((self) => ({
    get serialize(): Constraint {
      return {
        from: self.from.serialize,
        to: self.to?.serialize,
        data: self.data.serialize,
        enabled: self.enabled
      };
    }
  }))
  .actions((self) => ({
    deserialize(value: Constraint) {
      self.from.deserialize(value.from);
      if (value.to === undefined) {
        self.to = undefined;
      } else if (self.to === undefined) {
        self.to = WaypointIDStore.create({ kind: "first", idx: 0 });
        self.to.deserialize(value.to);
      } else {
        self.to.deserialize(value.to);
      }
      self.data.deserialize(value.data);
      self.enabled = value.enabled;
    }
  }));
