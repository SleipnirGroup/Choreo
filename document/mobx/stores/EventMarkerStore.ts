import { types } from "mobx-state-tree";
import type { EventMarker } from "../../ts/src/generated/types";
import { EventMarkerDataStore } from "./EventMarkerDataStore";

export const EventMarkerStore = types
  .model("EventMarkerStore", {
    name: types.string,
    from: EventMarkerDataStore
  })
  .views((self) => ({
    get serialize(): EventMarker {
      return {
        name: self.name,
        from: self.from.serialize
      };
    }
  }))
  .actions((self) => ({
    deserialize(value: EventMarker) {
      self.name = value.name;
      self.from.deserialize(value.from);
    }
  }));
