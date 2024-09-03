import { Event, UnlistenFn, listen } from "@tauri-apps/api/event";
import { Instance, types, getParent } from "mobx-state-tree";
import { UndoManager } from "mst-middlewares";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.min.css";
import {
  Project,
  SAVE_FILE_VERSION,
  Traj,
  SwerveTrajoptlibSample,
  ProgressUpdate
} from "./2025/DocumentTypes";
import {
  CircularObstacleStore,
  ICircularObstacleStore
} from "./CircularObstacleStore";
import { ConstraintStore, IConstraintStore } from "./ConstraintStore";
import { EventMarkerStore, IEventMarkerStore } from "./EventMarkerStore";
import { Variables } from "./ExpressionStore";
import {
  HolonomicWaypointStore,
  IHolonomicWaypointStore
} from "./HolonomicWaypointStore";
import { PathListStore } from "./PathListStore";
import { RobotConfigStore } from "./RobotConfigStore";
import { Commands } from "./tauriCommands";
import { tracing } from "./tauriTracing";

export type SelectableItemTypes =
  | IHolonomicWaypointStore
  | IConstraintStore
  | ICircularObstacleStore
  | IEventMarkerStore
  | undefined;
export const SelectableItem = types.union(
  {
    dispatcher: (snapshot) => {
      if (snapshot.mass) return RobotConfigStore;
      if (snapshot.target) return EventMarkerStore;
      if (snapshot.from) {
        return ConstraintStore;
      }
      if (snapshot.radius) {
        return CircularObstacleStore;
      }
      return HolonomicWaypointStore;
    }
  },
  HolonomicWaypointStore,
  CircularObstacleStore,
  EventMarkerStore,
  ConstraintStore
);
export const DocumentStore = types
  .model("DocumentStore", {
    name: types.string,
    pathlist: PathListStore,
    robotConfig: RobotConfigStore,
    variables: Variables,
    splitTrajectoriesAtStopPoints: types.boolean,
    usesObstacles: types.boolean,
    selectedSidebarItem: types.maybe(types.safeReference(SelectableItem)),
    hoveredSidebarItem: types.maybe(types.safeReference(SelectableItem))
  })
  .views((self) => ({
    serializeChor(): Project {
      return {
        name: self.name,
        version: SAVE_FILE_VERSION,
        variables: self.variables.serialize,
        config: self.robotConfig.serialize
      };
    },
    get isSidebarConstraintSelected() {
      return (
        self.selectedSidebarItem !== undefined &&
        Object.hasOwn(self.selectedSidebarItem, "from")
      );
    },
    get isSidebarCircularObstacleSelected() {
      return (
        self.selectedSidebarItem !== undefined &&
        Object.hasOwn(self.selectedSidebarItem, "radius")
      );
    },
    get isSidebarWaypointSelected() {
      return (
        self.selectedSidebarItem !== undefined &&
        !this.isSidebarConstraintSelected &&
        !this.isSidebarCircularObstacleSelected
      );
    },
    get isSidebarConstraintHovered() {
      return (
        self.hoveredSidebarItem !== undefined &&
        Object.hasOwn(self.hoveredSidebarItem, "from")
      );
    },
    get isSidebarCircularObstacleHovered() {
      return (
        self.hoveredSidebarItem !== undefined &&
        Object.hasOwn(self.hoveredSidebarItem, "radius")
      );
    },
    get isSidebarWaypointHovered() {
      return (
        self.hoveredSidebarItem !== undefined &&
        !this.isSidebarConstraintHovered &&
        !this.isSidebarCircularObstacleHovered
      );
    },
    get hoveredWaypointIndex() {
      if (this.isSidebarWaypointHovered) {
        const pt = self.hoveredSidebarItem as IHolonomicWaypointStore;
        return getParent<IHolonomicWaypointStore[]>(pt).findIndex(
          (p) => p.uuid == pt.uuid
        );
      } else {
        return undefined;
      }
    }
  }))
  .volatile((self) => ({
    history: UndoManager.create({}, { targetStore: self })
  }))
  .actions((self) => ({
    deserializeChor(ser: Project) {
      self.name = ser.name;
      self.variables.deserialize(ser.variables);
      self.robotConfig.deserialize(ser.config);
      self.pathlist.paths.clear();
    },
    setName(name: string) {
      self.name = name;
    },
    setSelectedSidebarItem(item: SelectableItemTypes) {
      self.history.withoutUndo(() => {
        self.selectedSidebarItem = item;
      });
    },
    setHoveredSidebarItem(item: SelectableItemTypes | undefined) {
      self.history.withoutUndo(() => {
        self.hoveredSidebarItem = item;
      });
    },
    afterCreate() {
      self.history = UndoManager.create({}, { targetStore: self });
    },
    undo() {
      if (self.history.canUndo) {
        self.history.undo();
      }
    },
    redo() {
      if (self.history.canRedo) {
        self.history.redo();
      }
    },
    async generatePath(uuid: string) {
      const pathStore = self.pathlist.paths.get(uuid);
      if (pathStore === undefined) {
        throw "Path store is undefined";
      }
      if (pathStore.params.waypoints.length < 2) {
        return;
      }
      const config = self.robotConfig.serialize;
      pathStore.params.constraints.forEach((constraint) => {
        if (constraint.issues.length > 0) {
          throw constraint.issues.join(", ");
        }
      });

      // TODO error if start or end are unconstrained.
      // pathStore.waypoints.forEach((wpt, idx) => {
      //   if (!wpt.fixHeading && !wpt.fixTranslation) {
      //     if (idx == 0) {
      //       reject("Cannot start a path with an ");
      //     } else if (idx == pathStore.waypoints.length - 1) {
      //       reject("Cannot end a path with an initial guess point.");
      //     }
      //   }
      // });
      pathStore.ui.setGenerating(true);
      // Capture the timestamps of the waypoints that were actually sent to the solver
      // const waypointTimestamps = pathStore.waypointTimestamps();
      // console.log(waypointTimestamps);
      // const stopPoints = pathStore.stopPoints();
      // generatedWaypoints = pathStore.waypoints.map((point, idx) => ({
      //   timestamp: 0,
      //   isStopPoint: stopPoints.includes(idx),
      //   ...point.asSavedWaypoint()
      // }));
      // pathStore.eventMarkers.forEach((m) => m.updateTargetIndex());
      const handle = pathStore.uuid
        .split("")
        .reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0);
      let unlisten: UnlistenFn;
      pathStore.ui.setIterationNumber(0);

      await Commands.guessIntervals(config, pathStore.serialize)
        .catch((e) => {
          tracing.error("guessIntervals:", e);
          throw e;
        })
        .then((counts) => {
          tracing.debug(counts);
          counts.forEach((count, i) => {
            const waypoint = pathStore.params.waypoints[i];
            if (waypoint.overrideIntervals && count !== waypoint.intervals) {
              console.assert(
                false,
                "Control interval guessing did not ignore override intervals! %o",
                {
                  path: pathStore.name,
                  waypoint: i,
                  override: waypoint.intervals,
                  calculated: count
                }
              );
            } else {
              waypoint.setIntervals(count);
            }
          });
        })
        .then(() => {
          tracing.debug("generatePathPre");
          return listen("solver-status", async (rawEvent) => {
            const event: Event<ProgressUpdate> =
              rawEvent as Event<ProgressUpdate>;
            if (event.payload!.handle == handle) {
              if (event.payload!.type === "swerveTraj") {
                const samples = event.payload
                  .update as SwerveTrajoptlibSample[];
                const useModuleForces = pathStore.traj.useModuleForces;
                pathStore.ui.setInProgressTrajectory(
                  samples.map((s) => ({
                    t: s.timestamp,
                    vx: s.velocity_x,
                    vy: s.velocity_y,
                    omega: s.angular_velocity,
                    fx: useModuleForces ? s.module_forces_x : [0, 0, 0, 0],
                    fy: useModuleForces ? s.module_forces_y : [0, 0, 0, 0],
                    ...s
                  }))
                );
                pathStore.ui.setIterationNumber(
                  pathStore.ui.generationIterationNumber + 1
                );
              } else if (event.payload!.type === "diagnosticText") {
                // const line = event.payload.update as string;
                // This is the text output of sleipnir solver
                // console.log(line)
              }
            }
          });
        })
        .then((unlistener) => {
          unlisten = unlistener;
          return Commands.generate(
            self.serializeChor(),
            pathStore.serialize,
            handle
          );
        })
        .finally(() => {
          unlisten();
        })
        .then(
          (rust_traj) => {
            const result: Traj = rust_traj as Traj;
            if (result.traj.samples.length == 0) throw "No traj";
            self.history.startGroup(() => {
              const newTraj = result.traj.samples;
              pathStore.traj.setSamples(newTraj);
              pathStore.traj.setWaypoints(result.traj.waypoints);

              pathStore.setSnapshot(result.snapshot);
              // set this within the group so it gets picked up in the autosave
              pathStore.setIsTrajectoryStale(false);
              self.history.stopGroup();
            });
          },
          (e) => {
            tracing.error("generatePathPost:", e);
            throw e;
          }
        )
        .finally(() => {
          // none of the below should trigger autosave
          pathStore.ui.setGenerating(false);
          pathStore.setIsTrajectoryStale(false);
        });
    }
  }))
  .actions((self) => {
    return {
      generatePathWithToasts(activePathUUID: string) {
        tracing.debug("generatePathWithToasts", activePathUUID);
        const path = self.pathlist.paths.get(activePathUUID)!;
        if (path.ui.generating) {
          return Promise.resolve();
        }
        toast.dismiss();

        const pathName = path.name;
        if (pathName === undefined) {
          toast.error("Tried to generate unknown path.");
        }
        return toast.promise(self.generatePath(activePathUUID), {
          success: {
            render({ data, toastProps }) {
              return `Generated "${pathName}"`;
            }
          },

          error: {
            render({ data, toastProps }) {
              tracing.error("generatePathWithToasts:", data);
              if ((data as string).includes("callback requested stop")) {
                toastProps.style = { visibility: "hidden" };
                return `Cancelled "${pathName}"`;
              }
              return `Can't generate "${pathName}": ` + (data as string);
            }
          }
        });
      },
      zoomToFitWaypoints() {
        const waypoints = self.pathlist.activePath.params.waypoints;
        if (waypoints.length <= 0) {
          return;
        }

        let xMin = Infinity;
        let xMax = -Infinity;
        let yMin = Infinity;
        let yMax = -Infinity;

        for (const waypoint of waypoints) {
          xMin = Math.min(xMin, waypoint.x.value);
          xMax = Math.max(xMax, waypoint.x.value);
          yMin = Math.min(yMin, waypoint.y.value);
          yMax = Math.max(yMax, waypoint.y.value);
        }

        const x = (xMin + xMax) / 2;
        const y = (yMin + yMax) / 2;
        let k = 10 / (xMax - xMin) + 0.01;

        // x-scaling desmos graph: https://www.desmos.com/calculator/5ie360vse3

        if (k > 1.7) {
          k = 1.7;
        }

        this.callCenter(x, y, k);
      },
      zoomIn() {
        window.dispatchEvent(new CustomEvent("zoomIn"));
      },
      zoomOut() {
        window.dispatchEvent(new CustomEvent("zoomOut"));
      },

      // x, y, k are the center coordinates (x, y) and scale factor (k)
      callCenter(x: number, y: number, k: number) {
        window.dispatchEvent(
          new CustomEvent("center", { detail: { x, y, k } })
        );
      }
    };
  })
  .actions((self) => {
    return {
      setSplitTrajectoriesAtStopPoints(split: boolean) {
        self.splitTrajectoriesAtStopPoints = split;
      },
      setUsesObstacles(usesObstacles: boolean) {
        self.usesObstacles = usesObstacles;
      }
    };
  });
export type IDocumentStore = Instance<typeof DocumentStore>;
export default DocumentStore;
