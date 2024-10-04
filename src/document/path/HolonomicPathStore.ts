import { Instance, types, getEnv, destroy, IAnyStateTreeNode, getParentOfType } from "mobx-state-tree";
import {
  DEFAULT_WAYPOINT,
  IHolonomicWaypointStore
} from "../HolonomicWaypointStore";
import { IReactionDisposer, reaction } from "mobx";
import {
  SAVE_FILE_VERSION,
  type ChoreoPath,
  type Trajectory,
  Waypoint,
  Expr,
  PplibCommand,
  EventMarker,
  ChoreolibEvent,
  Command,
  WaypointIDX,
  WaypointUUID
} from "../2025/DocumentTypes";
import { ChoreoPathStore } from "./ChoreoPathStore";
import { ChoreoTrajectoryStore } from "./ChoreoTrajectoryStore";
import { PathUIStore } from "./PathUIStore";
import { Env } from "../DocumentManager";
import { EventMarkerStore, IEventMarkerStore } from "../EventMarkerStore";
import { commandIsChoreolib } from "../CommandStore";
import { findUUIDIndex } from "./utils";
export function waypointIDToText(id: WaypointUUID | undefined, points: IHolonomicWaypointStore[]) {
  if (id == undefined) return "?";
  if (id == "first") return "Start";
  if (id == "last") return "End";
  return (
    findUUIDIndex(id.uuid, points) + 1
  );
}
export const DEFAULT_EVENT_MARKER : EventMarker<PplibCommand> =
{
  data: {
    name: "Marker",
    target: undefined,
    offset: {
      exp: "0 s",
      val: 0
    },
    targetTimestamp: undefined
  },
  event: {
    type: "named",
    data: {
      name: ""
    }
  }
} 
export const HolonomicPathStore = types
  .model("HolonomicPathStore", {
    snapshot: types.frozen<ChoreoPath<number>>(),
    params: ChoreoPathStore,
    trajectory: ChoreoTrajectoryStore,
    ui: PathUIStore,
    markers: types.array(EventMarkerStore),
    name: "",
    uuid: types.identifier
  })

  .views((self) => {
    return {
      canGenerate(): boolean {
        return self.params.waypoints.length >= 2 && !self.ui.generating;
      },
      canExport(): boolean {
        return self.trajectory.samples.length >= 2;
      },
      get serialize(): Trajectory {
        const markers = self.markers.map(m=>m.serialize);
        return {
          name: self.name,
          version: SAVE_FILE_VERSION,
          params: self.params.serialize,
          trajectory: self.trajectory.serialize,
          snapshot: self.snapshot,
          pplibCommands: markers.filter(m=>!commandIsChoreolib(m.event)) as 
            EventMarker<PplibCommand>[],
          events: markers.filter(m=>commandIsChoreolib(m.event)) as 
            EventMarker<ChoreolibEvent>[],
        };
      },
      lowestSelectedPoint(): IHolonomicWaypointStore | null {
        for (const point of self.params.waypoints) {
          if (point.selected) return point;
        }
        return null;
      },
    };
  })
  .views((self) => {
    return {
      waypointTimestamps(): number[] {
        return self.trajectory.waypoints;
      }
    };
  })
  .actions((self) => {
    return {
      deleteMarkerUUID(uuid: string) {
        const index = self.markers.findIndex((m) => m.uuid === uuid);
        if (index >= 0 && index < self.markers.length) {
          destroy(self.markers[index]);
          if (self.markers.length === 0) {
            return;
          } else if (self.markers[index - 1]) {
            getEnv<Env>(self).select(self.markers[index - 1]);
          } else if (self.markers[index + 1]) {
            getEnv<Env>(self).select(self.markers[index + 1]);
          }
        }
      },
      addEventMarker(marker?: EventMarker<Command>): IEventMarkerStore {
        const m = marker ?? DEFAULT_EVENT_MARKER;
        let toAdd = getEnv<Env>(self).create.EventMarkerStore(m);
      
        self.markers.push(toAdd);
        toAdd.deserialize(m);
        return toAdd;
      },
      setSnapshot(snap: ChoreoPath<number>) {
        self.snapshot = snap;
      },
      setName(name: string) {
        self.name = name;
      },
      addWaypoint(waypoint?: Partial<Waypoint<Expr>>): IHolonomicWaypointStore {
        self.params.waypoints.push(
          getEnv<Env>(self).create.WaypointStore(
            Object.assign({ ...DEFAULT_WAYPOINT }, waypoint)
          )
        );
        if (self.params.waypoints.length === 1) {
          getEnv<Env>(self).select(self.params.waypoints[0]);
        }

        // Initialize waypoints
        if (typeof self.ui.visibleWaypointsStart === "undefined") {
          self.ui.setVisibleWaypointsStart(0);
          self.ui.setVisibleWaypointsEnd(0);
        }

        // Make the new waypoint visible by default if the (now) penultimate waypoint is already visible
        if (self.ui.visibleWaypointsEnd === self.params.waypoints.length - 2) {
          self.ui.setVisibleWaypointsEnd(self.params.waypoints.length - 1);
        }

        return self.params.waypoints[self.params.waypoints.length - 1];
      }
    };
  })
  .actions((self) => {
    return {
      deserialize(ser: Trajectory) {
        self.name = ser.name;
        self.snapshot = ser.snapshot;
        self.params.deserialize(ser.params);
        self.trajectory.deserialize(ser.trajectory);
        ser.events.forEach(m=>{
          self.addEventMarker(m);
        })
      }
    };
  })
  .actions((self) => {
    let autosaveDisposer: IReactionDisposer;
    let exporter: (uuid: string) => void;
    const afterCreate = () => {
      // Anything accessed in here will cause the trajectory to be marked stale
      // this is a reaction, not an autorun so that the effect does not happen
      // when mobx first runs it to determine dependencies.
      // staleDisposer = reaction(
      //   () => {
      //     // Reaction needs the return value to change,
      //     // so we can't just access the values and do nothing with them

      autosaveDisposer = reaction(
        () => {
          return self.serialize;
        },
        (_value) => {
          exporter(self.uuid);
        }
      );
    };
    const setExporter = (exportFunction: (uuid: string) => void) => {
      exporter = exportFunction;
    };
    const beforeDestroy = () => {
      autosaveDisposer();
    };
    return {
      afterCreate,
      setExporter,
      beforeDestroy
    };
  });
// TS complains of circular dependencies if we directly alias this
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IHolonomicPathStore
  extends Instance<typeof HolonomicPathStore> {}
export function getPathStore(self: IAnyStateTreeNode): IHolonomicPathStore {
  const path: IHolonomicPathStore = getParentOfType(self, HolonomicPathStore)
  return path;
}