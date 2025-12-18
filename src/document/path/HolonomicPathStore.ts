import { IReactionDisposer, reaction } from "mobx";
import {
  IAnyStateTreeNode,
  Instance,
  destroy,
  getEnv,
  getParentOfType,
  types
} from "mobx-state-tree";
import {
  EventMarker,
  Expr,
  TRAJ_SCHEMA_VERSION,
  Waypoint,
  WaypointUUID,
  type ChoreoPath,
  type Trajectory
} from "../schema/DocumentTypes";
import { Env, uiState } from "../DocumentManager";
import { EventMarkerStore, IEventMarkerStore } from "../EventMarkerStore";
import {
  DEFAULT_WAYPOINT,
  IHolonomicWaypointStore
} from "../HolonomicWaypointStore";
import { ChoreoPathStore } from "./ChoreoPathStore";
import { ChoreoTrajectoryStore } from "./ChoreoTrajectoryStore";
import { PathUIStore } from "./PathUIStore";
import { findUUIDIndex } from "./utils";
import { ChoreoError, Commands } from "../tauriCommands";
import { SavingState } from "../UIStateStore";
import { toast, ToastContentProps } from "react-toastify";
export function waypointIDToText(
  id: WaypointUUID | undefined,
  points: IHolonomicWaypointStore[]
) {
  if (id == undefined) return "?";
  if (id == "first") return "Start";
  if (id == "last") return "End";
  return findUUIDIndex(id.uuid, points) + 1;
}
export const DEFAULT_EVENT_MARKER: EventMarker = {
  name: "Marker",
  from: {
    target: undefined,
    offset: {
      exp: "0 s",
      val: 0
    },
    targetTimestamp: undefined
  },
  event: undefined
};
// When adding new fields, consult
// https://choreo.autos/contributing/schema-upgrade/
// to see all the places that change with every schema upgrade.
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
        const markers = self.markers.map((m) => m.serialize);
        return {
          name: self.name,
          version: TRAJ_SCHEMA_VERSION,
          params: self.params.serialize,
          trajectory: self.trajectory.serialize,
          snapshot: self.snapshot,
          events: markers
        };
      },
      lowestSelectedPoint(): IHolonomicWaypointStore | null {
        for (const point of self.params.waypoints) {
          if (point.selected) return point;
        }
        return null;
      }
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
      addEventMarker(marker?: EventMarker): IEventMarkerStore {
        const m = marker ?? DEFAULT_EVENT_MARKER;
        const toAdd = getEnv<Env>(self).create.EventMarkerStore(m);

        self.markers.push(toAdd);
        toAdd.deserialize(m, getEnv<Env>(self).create.CommandStore);
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
      processGenerationResult(ser: Trajectory) {
        self.trajectory.deserialize(ser.trajectory);
        self.markers.forEach((m) => {
          const index = m.from.trajectoryTargetIndex;
          if (index === undefined) {
            m.from.setTargetTimestamp(undefined);
          } else {
            m.from.setTargetTimestamp(ser.trajectory.waypoints[index]);
          }
        });
        self.setSnapshot(ser.snapshot);
        self.ui.setUpToDate(true);
      },
      deserialize(ser: Trajectory) {
        self.name = ser.name;
        self.snapshot = ser.snapshot;
        self.params.deserialize(ser.params);
        self.trajectory.deserialize(ser.trajectory);
        self.markers.clear();
        ser.events.forEach((m) => {
          self.addEventMarker(m);
        });
        Commands.trajectoryUpToDate(self.serialize).then((upToDate) =>
          self.ui.setUpToDate(upToDate)
        );
      }
    };
  })
  .actions((self) => {
    let autosaveDisposer: IReactionDisposer;
    let exporter: Env["exporter"] = (uuid) => getEnv(self)?.exporter(uuid);
    let debounceId: NodeJS.Timeout | undefined = undefined;
    const afterCreate = () => {
      const performSave = () => {
        if (!uiState.hasSaveLocation) {
          return;
        }
        self.ui.setSavingState(SavingState.SAVING);
        toast.promise(
          exporter(self.uuid)
            .then(() => {
              self.ui.setSavingState(SavingState.SAVED);
            })
            .catch((e) => {
              self.ui.setSavingState(SavingState.ERROR);
            }),
          {
            error: {
              render(toastProps: ToastContentProps<ChoreoError>) {
                return `"${self.name}" save fail. Alert developers: (${toastProps.data!.type}) ${toastProps.data!.content}`;
              }
            }
          }
        );
      };

      // Anything accessed in self.serialize will cause the trajectory to be marked stale
      // this is a reaction, not an autorun so that the effect does not happen
      // when mobx first runs it to determine dependencies.
      autosaveDisposer = reaction(
        () => {
          return self.serialize;
        },
        (ser) => {
          Commands.trajectoryUpToDate(ser).then((upToDate) =>
            self.ui.setUpToDate(upToDate)
          );
          clearTimeout(debounceId);
          debounceId = setTimeout(performSave, 50);
        }
      );
    };
    /**Only to be used on the default path*/
    const disableExport = () => {
      exporter = (uuid) => Promise.resolve();
    };
    const beforeDestroy = () => {
      autosaveDisposer();
      clearTimeout(debounceId);
    };
    return {
      afterCreate,
      disableExport,
      beforeDestroy
    };
  });
// TS complains of circular dependencies if we directly alias this
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IHolonomicPathStore extends Instance<
  typeof HolonomicPathStore
> {}
export function getPathStore(self: IAnyStateTreeNode): IHolonomicPathStore {
  const path: IHolonomicPathStore = getParentOfType(self, HolonomicPathStore);
  return path;
}
