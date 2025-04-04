import { Instance, getEnv, getParent, isAlive, types } from "mobx-state-tree";
import {
  EventMarker,
  EventMarkerData,
  WaypointUUID
} from "./2025/DocumentTypes";
import { CommandStore } from "./CommandStore";
import { WaypointScope } from "./ConstraintStore";
import { Env, EnvConstructors } from "./DocumentManager";
import { ExpressionStore } from "./ExpressionStore";
import { IChoreoTrajectoryStore } from "./path/ChoreoTrajectoryStore";
import { IHolonomicPathStore } from "./path/HolonomicPathStore";
import {
  findUUIDIndex,
  getByWaypointID,
  savedWaypointIdToWaypointId,
  waypointIdToSavedWaypointId
} from "./path/utils";

// When adding new fields, consult
// https://choreo.autos/contributing/schema-upgrade/
// to see all the places that change with every schema upgrade.
export const EventMarkerDataStore = types
  .model("EventMarkerData", {
    target: types.maybe(WaypointScope),
    targetTimestamp: types.maybe(types.number),
    offset: ExpressionStore,
    uuid: types.identifier
  })
  .volatile((self) => ({
    /** Just used to preserve the index of the target during generation */
    trajectoryTargetIndex: undefined as number | undefined
  }))
  .views((self) => ({
    getPath(): IHolonomicPathStore {
      const path: IHolonomicPathStore = getParent<IHolonomicPathStore>(
        getParent<IChoreoTrajectoryStore>(getParent<IEventMarkerStore[]>(self))
      );
      return path;
    },
    get timestamp(): number | undefined {
      if (self.targetTimestamp === undefined) {
        return undefined;
      }
      return self.targetTimestamp + self.offset.value;
    },
    getTargetIndex(): number | undefined {
      const path: IHolonomicPathStore = this.getPath();
      if (path === undefined) {
        return undefined;
      }
      const startScope = self.target;
      if (startScope === undefined) {
        return undefined;
      }
      const waypoint = getByWaypointID(startScope, path.params.waypoints);
      if (waypoint === undefined) return undefined;
      return findUUIDIndex(waypoint.uuid, path.params.waypoints);
    }
  }))
  .views((self) => ({
    get serialize(): EventMarkerData {
      const points = self.getPath().params.waypoints;
      return {
        target: waypointIdToSavedWaypointId(self.target, points),
        offset: self.offset.serialize,
        targetTimestamp: self.targetTimestamp
      };
    }
  }))
  .actions((self) => ({
    deserialize(ser: EventMarkerData) {
      const points = self.getPath().params.waypoints;
      self.target = savedWaypointIdToWaypointId(ser.target, points);
      self.targetTimestamp = self.targetTimestamp ?? undefined;
      self.offset.deserialize(ser.offset);
    },
    setTarget(target: WaypointUUID) {
      self.target = target;
    },
    setTargetTimestamp(timestamp: number | undefined) {
      self.targetTimestamp = timestamp;
    },
    setTrajectoryTargetIndex(index: number | undefined) {
      self.trajectoryTargetIndex = index;
    }
  }))
  .views((self) => ({
    /**
     *
     * @returns Returns undefined if the marker does not have both a timestamp and a target timestamp.
     * Otherwise, returns whether the target waypoint and the marker timestamp are on the same split part.
     */
    isInSameSegment(traj: IChoreoTrajectoryStore): boolean | undefined {
      let retVal: boolean | undefined = true;
      const targetTimestamp = self.targetTimestamp;
      const timestamp = self.timestamp;
      if (targetTimestamp === undefined || timestamp === undefined) {
        retVal = undefined;
        return undefined;
      } else if (self.offset.value == 0) {
        return true;
      } else {
        const splitTimes = traj.splits.map((idx) => traj.samples[idx]?.t);
        [0, ...splitTimes, traj.getTotalTimeSeconds()].forEach(
          (stopTimestamp) => {
            if (
              (targetTimestamp < stopTimestamp && timestamp > stopTimestamp) ||
              (targetTimestamp > stopTimestamp && timestamp < stopTimestamp)
            ) {
              retVal = false;
            }
          }
        );
      }
      return retVal;
    }
  }));
// When adding new fields, consult
// https://choreo.autos/contributing/schema-upgrade/
// to see all the places that change with every schema upgrade.
export const EventMarkerStore = types
  .model("GeneralMarker", {
    name: types.string,
    from: EventMarkerDataStore,
    uuid: types.identifier,
    event: CommandStore
  })
  .views((self) => ({
    get serialize(): EventMarker {
      return {
        name: self.name,
        from: self.from.serialize,
        event: self.event.serialize
      };
    },
    get selected(): boolean {
      if (!isAlive(self)) {
        return false;
      }
      return self.uuid === getEnv<Env>(self).selectedSidebar();
    }
  }))
  .actions((self) => ({
    setName(name: string) {
      self.name = name;
    },
    deserialize(
      ser: EventMarker,
      commandConstructor: EnvConstructors["CommandStore"]
    ) {
      self.name = ser.name;
      self.from.deserialize(ser.from);
      self.event.deserialize(ser.event, commandConstructor);
    },
    setSelected(selected: boolean) {
      if (selected && !self.selected) {
        getEnv<Env>(self).select(
          getParent<IEventMarkerStore[]>(self)?.find(
            (point) => self.uuid == point.uuid
          )
        );
      }
    }
  }));
export type IEventMarkerStore = Instance<typeof EventMarkerStore>;
