import { Instance, getEnv, getParent, isAlive, types } from "mobx-state-tree";
import {
  Command,
  EventMarker,
  EventMarkerData,
  WaypointUUID
} from "./2025/DocumentTypes";
import { CommandStore } from "./CommandStore";
import { WaypointScope } from "./ConstraintStore";
import { Env } from "./DocumentManager";
import { ExpressionStore } from "./ExpressionStore";
import { IChoreoTrajectoryStore } from "./path/ChoreoTrajectoryStore";
import { IHolonomicPathStore } from "./path/HolonomicPathStore";
import {
  findUUIDIndex,
  getByWaypointID,
  savedWaypointIdToWaypointId,
  waypointIdToSavedWaypointId
} from "./path/utils";

export const EventMarkerDataStore = types
  .model("EventMarkerData", {
    name: types.string,
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
        name: self.name,
        target: waypointIdToSavedWaypointId(self.target, points),
        offset: self.offset.serialize,
        targetTimestamp: self.targetTimestamp
      };
    }
  }))
  .actions((self) => ({
    deserialize(ser: EventMarkerData) {
      const points = self.getPath().params.waypoints;
      self.name = ser.name;
      self.target = savedWaypointIdToWaypointId(ser.target, points);
      self.targetTimestamp = self.targetTimestamp ?? undefined;
      self.offset.deserialize(ser.offset);
    },
    setTarget(target: WaypointUUID) {
      self.target = target;
    },
    setName(name: string) {
      self.name = name;
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

export const EventMarkerStore = types
  .model("GeneralMarker", {
    data: EventMarkerDataStore,
    uuid: types.identifier,
    event: CommandStore
  })
  .views((self) => ({
    get serialize(): EventMarker<Command> {
      return {
        data: self.data.serialize,
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
    deserialize(ser: EventMarker<Command>) {
      self.data.deserialize(ser.data);
      self.event.deserialize(ser.event);
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
