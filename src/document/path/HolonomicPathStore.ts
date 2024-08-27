import { Instance, types, getEnv } from "mobx-state-tree";
import {
  DEFAULT_WAYPOINT,
  IHolonomicWaypointStore
} from "../HolonomicWaypointStore";
import { IReactionDisposer, reaction } from "mobx";
import {
  SAVE_FILE_VERSION,
  type ChoreoPath,
  type Traj,
  Waypoint,
  Expr
} from "../2025/DocumentTypes";
import { ChoreoPathStore } from "./ChoreoPathStore";
import { ChoreoTrajStore } from "./ChoreoTrajStore";
import { PathUIStore } from "./PathUIStore";
import { Env } from "../DocumentManager";

export const HolonomicPathStore = types
  .model("HolonomicPathStore", {
    snapshot: types.frozen<ChoreoPath<number>>(),
    path: ChoreoPathStore,
    traj: ChoreoTrajStore,
    ui: PathUIStore,
    name: "",
    uuid: types.identifier,
    isTrajectoryStale: true,
    usesControlIntervalGuessing: true,
    defaultControlIntervalCount: 40,
    usesDefaultObstacles: true
  })

  .views((self) => {
    return {
      canGenerate(): boolean {
        return self.path.waypoints.length >= 2 && !self.ui.generating;
      },
      canExport(): boolean {
        return self.traj.samples.length >= 2;
      },
      serialize(): Traj {
        return {
          name: self.name,
          version: SAVE_FILE_VERSION,
          path: self.path.serialize(),
          traj: self.traj.serialize(),
          snapshot: self.snapshot
        };
      },
      lowestSelectedPoint(): IHolonomicWaypointStore | null {
        for (const point of self.path.waypoints) {
          if (point.selected) return point;
        }
        return null;
      }
    };
  })
  .views((self) => {
    return {
      waypointTimestamps(): number[] {
        return self.traj.waypoints;
      }
      // asSolverPath() {
      //   const savedPath = self.asSavedPath();
      //   savedPath.constraints.forEach((constraint) => {
      //     constraint.scope = constraint.scope.map((id) => {
      //       if (typeof id === "number") {
      //         /* pass through, this if is for type narrowing*/
      //       } else if (id === "first") {
      //         id = 0;
      //       } else if (id === "last") {
      //         id = savedPath.waypoints.length - 1;
      //       }
      //       return id;
      //     });
      //     constraint.scope = constraint.scope.sort(
      //       (a, b) => (a as number) - (b as number)
      //     );
      //     // avoid zero-length segments by converting them to waypoint constraints.
      //     if (
      //       constraint.scope.length == 2 &&
      //       constraint.scope[0] == constraint.scope[1]
      //     ) {
      //       constraint.scope.length = 1;
      //     }
      //   });
      //   return savedPath;
      // },
      // stopPoints() {
      //   const stopPoints = self.constraints.filter(
      //     (c) => c.type === "StopPoint"
      //   );
      //   const wptIndices = stopPoints
      //     .flatMap((c: IConstraintStore) => {
      //       const scope = c.scope.at(0);
      //       if (scope === undefined) {
      //         return 0;
      //       } else if (scope === "first") {
      //         return 0;
      //       } else if (scope === "last") {
      //         return self.waypoints.length - 1;
      //       } else {
      //         return self.findUUIDIndex(scope.uuid);
      //       }
      //     })
      //     .filter((item, pos, ary) => !pos || item != ary[pos - 1])
      //     .sort((a, b) => a - b);
      //   return wptIndices;
      //   // remove duplicates
      // },
      // stopPointIndices(): Array<number | undefined> {
      //   const stopPoints = this.stopPoints();
      //   return stopPoints.length > 1
      //     ? stopPoints
      //         .flatMap((w) =>
      //           self.waypoints
      //             .slice(0, w)
      //             .flatMap((w) => wintervals)
      //             .reduce((sum, num) => sum + num, 0)
      //         )
      //         .sort((a, b) => a - b)
      //         // remove duplicates
      //         .filter((item, pos, ary) => !pos || item != ary[pos - 1])
      //     : [0, undefined];
      // },
      // splitTrajectories() {
      //   const trajectories = [];

      //   const split: number[] = [];
      //   {
      //     let stopPointIndex = 0;
      //     self.generatedWaypoints.forEach((point, i) => {
      //       // start and end points are always bounds for split parts
      //       if (
      //         point.isStopPoint ||
      //         i == 0 ||
      //         i == self.generatedWaypoints.length - 1
      //       ) {
      //         split.push(stopPointIndex);
      //       }
      //       stopPointIndex += pointintervals;
      //     });
      //   }
      //   //const split = this.stopPointIndices();
      //   for (let i = 1; i < split.length; i++) {
      //     const prev = split[i - 1];
      //     let cur = split[i];
      //     // If we don't go to the end of trajectory, add 1 to include the end stop point
      //     if (cur !== undefined) {
      //       cur += 1;
      //     }
      //     const traj = self.generated.slice(prev, cur).map((s) => {
      //       return { ...s };
      //     });
      //     if (traj === undefined) {
      //       throw `Could not split segment from ${prev} to ${cur} given ${self.generated.length} samples`;
      //     }
      //     if (traj.length === 0) {
      //       continue;
      //     }
      //     const startTime = traj[0].timestamp;
      //     const endTime = traj[traj.length - 1].timestamp;
      //     for (let i = 0; i < traj.length; i++) {
      //       const e = traj[i];
      //       e.timestamp -= startTime;
      //     }
      //     const splitEventMarkers = self.eventMarkers
      //       .filter(
      //         (m) =>
      //           m.targetTimestamp !== undefined &&
      //           m.targetTimestamp >= startTime &&
      //           m.targetTimestamp <= endTime &&
      //           m.timestamp !== undefined &&
      //           m.timestamp >= startTime &&
      //           m.timestamp <= endTime
      //       )
      //       .map((m) => ({
      //         timestamp: m.timestamp! - startTime,
      //         command: m.command.asSavedCommand()
      //       }));
      //     trajectories.push({ samples: traj, eventMarkers: splitEventMarkers });
      //   }
      //   return trajectories;
      // }
    };
  })
  .actions((self) => {
    return {
      setSnapshot(snap: ChoreoPath<number>) {
        self.snapshot = snap;
      },
      setIsTrajectoryStale(isTrajectoryStale: boolean) {
        getEnv<Env>(self).withoutUndo(() => {
          self.isTrajectoryStale = isTrajectoryStale;
        });
      },
      setControlIntervalGuessing(value: boolean) {
        self.usesControlIntervalGuessing = value;
      },
      setDefaultControlIntervalCounts(counts: number) {
        self.defaultControlIntervalCount = counts;
      },
      setName(name: string) {
        self.name = name;
      },

      addWaypoint(waypoint?: Partial<Waypoint<Expr>>): IHolonomicWaypointStore {
        self.path.waypoints.push(
          getEnv<Env>(self).create.WaypointStore(
            Object.assign({ ...DEFAULT_WAYPOINT }, waypoint)
          )
        );
        if (self.path.waypoints.length === 1) {
          getEnv<Env>(self).select(self.path.waypoints[0]);
        }

        // Initialize waypoints
        if (typeof self.ui.visibleWaypointsStart === "undefined") {
          self.ui.setVisibleWaypointsStart(0);
          self.ui.setVisibleWaypointsEnd(0);
        }

        // Make the new waypoint visible by default if the (now) penultimate waypoint is already visible
        if (self.ui.visibleWaypointsEnd === self.path.waypoints.length - 2) {
          self.ui.setVisibleWaypointsEnd(self.path.waypoints.length - 1);
        }

        return self.path.waypoints[self.path.waypoints.length - 1];
      }
    };
  })
  .actions((self) => {
    return {
      deserialize(ser: Traj) {
        self.name = ser.name;
        self.snapshot = ser.snapshot;
        self.path.deserialize(ser.path);
        self.traj.deserialize(ser.traj);
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

      //     return {
      //       waypoints: toJS(self.waypoints),
      //       constraints: toJS(self.constraints),
      //       // does not need toJS to do a deep check on this, since it's just a boolean
      //       guessing: self.usesControlIntervalGuessing,
      //       obstacles: toJS(self.obstacles)
      //     };
      //   },
      //   (value) => {
      //     self.setIsTrajectoryStale(true);
      //   }

      autosaveDisposer = reaction(
        () => {
          return self.serialize();
        },
        (value) => {
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
//eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IHolonomicPathStore
  extends Instance<typeof HolonomicPathStore> {}
