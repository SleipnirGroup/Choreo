import { types } from "mobx-state-tree";
import type { EventMarkerData } from "../../ts/src/generated/types";
import { ExprStore } from "./ExprStore";

export const EventMarkerDataStore = types
  .model("EventMarkerDataStore", {
    target: types.maybeNull(types.number),
    targetTimestamp: types.maybeNull(types.number),
    offset: ExprStore
  })
  .views((self) => ({
    get serialize(): EventMarkerData {
      return {
        target: self.target,
        targetTimestamp: self.targetTimestamp,
        offset: self.offset.serialize
      };
    }
  }))
  .actions((self) => ({
    deserialize(value: EventMarkerData) {
      self.target = value.target;
      self.targetTimestamp = value.targetTimestamp;
      self.offset.deserialize(value.offset);
    }
  }));
