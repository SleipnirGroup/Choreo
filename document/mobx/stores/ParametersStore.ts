import { types } from "mobx-state-tree";
import type { Parameters } from "../../ts/src/generated/types";
import { ConstraintStore } from "./ConstraintStore";
import { ExprStore } from "./ExprStore";
import { WaypointStore } from "./WaypointStore";

export const ParametersStore = types
  .model("ParametersStore", {
    waypoints: types.optional(types.array(WaypointStore), []),
    constraints: types.optional(types.array(ConstraintStore), []),
    target_dt: types.optional(ExprStore, { exp: "", val: 0 })
  })
  .views((self) => ({
    get serialize(): Parameters {
      return {
        waypoints: self.waypoints.map((item) => item.serialize),
        constraints: self.constraints.map((item) => item.serialize),
        target_dt: self.target_dt.serialize
      };
    }
  }))
  .actions((self) => ({
    deserialize(value: Parameters) {
      self.waypoints.clear();
      value.waypoints.forEach((waypoint) => {
        self.waypoints.push(WaypointStore.create(waypoint));
      });

      self.constraints.clear();
      value.constraints.forEach((constraint) => {
        const constraintStore = ConstraintStore.create({});
        constraintStore.deserialize(constraint);
        self.constraints.push(constraintStore);
      });

      self.target_dt.deserialize(value.target_dt);
    }
  }));
