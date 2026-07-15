import { types } from "mobx-state-tree";
import type { TrajectoryFile } from "../../ts/src/generated/types";
import { EventMarkerStore } from "./EventMarkerStore";
import { ParametersStore } from "./ParametersStore";
import { RobotConfigStore } from "./RobotConfigStore";
import { TrajectoryStore } from "./TrajectoryStore";

export const TrajectoryFileStore = types
  .model("TrajectoryFileStore", {
    name: types.string,
    version: types.number,
    config: types.maybeNull(RobotConfigStore),
    snapshot: types.maybeNull(ParametersStore),
    params: ParametersStore,
    trajectory: types.maybeNull(TrajectoryStore),
    events: types.array(EventMarkerStore)
  })
  .views((self) => ({
    get serialize(): TrajectoryFile {
      return {
        name: self.name,
        version: self.version,
        config: self.config?.serialize ?? null,
        snapshot: self.snapshot?.serialize ?? null,
        params: self.params.serialize,
        trajectory: self.trajectory?.serialize ?? null,
        events: self.events.map((item) => item.serialize)
      };
    }
  }))
  .actions((self) => ({
    deserialize(value: TrajectoryFile) {
      self.name = value.name;
      self.version = value.version;

      if (value.config == null) {
        self.config = null;
      } else if (self.config == null) {
        self.config = RobotConfigStore.create(value.config);
      } else {
        self.config.deserialize(value.config);
      }

      if (value.snapshot == null) {
        self.snapshot = null;
      } else if (self.snapshot == null) {
        self.snapshot = ParametersStore.create({});
        self.snapshot.deserialize(value.snapshot);
      } else {
        self.snapshot.deserialize(value.snapshot);
      }

      self.params.deserialize(value.params);

      if (value.trajectory == null) {
        self.trajectory = null;
      } else if (self.trajectory == null) {
        self.trajectory = TrajectoryStore.create(value.trajectory);
      } else {
        self.trajectory.deserialize(value.trajectory);
      }

      self.events.clear();
      value.events.forEach((event) => {
        self.events.push(EventMarkerStore.create(event));
      });
    }
  }));
