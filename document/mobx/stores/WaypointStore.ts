import { types } from "mobx-state-tree";
import type { Waypoint } from "../../ts/src/generated/types";
import { ExprStore } from "./ExprStore";

export const WaypointStore = types
  .model("WaypointStore", {
    x: ExprStore,
    y: ExprStore,
    heading: ExprStore,
    intervals: types.number,
    split: types.boolean,
    fix_translation: types.boolean,
    fix_heading: types.boolean,
    override_intervals: types.boolean
  })
  .views((self) => ({
    get serialize(): Waypoint {
      return {
        x: self.x.serialize,
        y: self.y.serialize,
        heading: self.heading.serialize,
        intervals: self.intervals,
        split: self.split,
        fix_translation: self.fix_translation,
        fix_heading: self.fix_heading,
        override_intervals: self.override_intervals
      };
    }
  }))
  .actions((self) => ({
    deserialize(value: Waypoint) {
      self.x.deserialize(value.x);
      self.y.deserialize(value.y);
      self.heading.deserialize(value.heading);
      self.intervals = value.intervals;
      self.split = value.split;
      self.fix_translation = value.fix_translation;
      self.fix_heading = value.fix_heading;
      self.override_intervals = value.override_intervals;
    }
  }));
