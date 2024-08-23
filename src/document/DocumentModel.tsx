import { Instance, getEnv, types } from "mobx-state-tree";
import { invoke } from "@tauri-apps/api/tauri";
import { IRobotConfigStore, RobotConfigStore } from "./RobotConfigStore";
import { PathListStore } from "./PathListStore";
import { UndoManager } from "mst-middlewares";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.min.css";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { ExpressionStore, Units, Variables } from "./ExpressionStore";
import { CircularObstacleStore, ICircularObstacleStore } from "./CircularObstacleStore";
import { v4 as uuidv4 } from "uuid";
import { HolonomicWaypointStore, IHolonomicWaypointStore } from "./HolonomicWaypointStore";
import { ConstraintStore, IConstraintStore } from "./ConstraintStore";
import { EventMarkerStore, IEventMarkerStore } from "./EventMarkerStore";
import {
  SAVE_FILE_VERSION,
  Project,
  Traj,
  Sample
} from "./2025/DocumentTypes";

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
    pathlist: PathListStore,
    robotConfig: RobotConfigStore,
    variables: Variables,
    splitTrajectoriesAtStopPoints: types.boolean,
    usesObstacles: types.boolean,
    selectedSidebarItem: types.maybe(types.safeReference(SelectableItem)),
  })
  .views((self) => ({
    serializeChor(): Project {
      return {
        version: SAVE_FILE_VERSION,
        variables: self.variables.serialize(),
        config: self.robotConfig.serialize()
      }
    },
    get isSidebarConstraintSelected() {
      return (
        self.selectedSidebarItem !== undefined &&
        self.selectedSidebarItem.from !== undefined
      );
    },
    get isSidebarCircularObstacleSelected() {
      return (
        self.selectedSidebarItem !== undefined &&
        self.selectedSidebarItem.radius !== undefined
      );
    },
    get isSidebarWaypointSelected() {
      return (
        self.selectedSidebarItem !== undefined &&
        !this.isSidebarConstraintSelected &&
        !this.isSidebarCircularObstacleSelected
      );
    },
  }))
  .volatile((self) => ({
    history: UndoManager.create({}, { targetStore: self })
  })).actions(self => ({
    deserializeChor(ser: Project) {
      self.variables.deserialize(ser.variables);
      self.robotConfig.deserialize(ser.config);
    },
    setSelectedSidebarItem(item: SelectableItemTypes) {
      self.selectedSidebarItem = item;
    },
    afterCreate() {
      self.history = UndoManager.create(
        {},
        { targetStore: self }
      );
    },
    undo() {
      self.history.canUndo && self.history.undo();
    },
    redo() {
      self.history.canRedo && self.history.redo();
    },
    async generatePath(uuid: string) {
      const pathStore = self.pathlist.paths.get(uuid);
      if (pathStore === undefined) {
        throw "Path store is undefined";
      }
      if (pathStore.path.waypoints.length < 2) {
        return;
      }
      console.log(pathStore.serialize(), self.robotConfig.serialize())
      const controlIntervalOptResult = await invoke("guess_control_interval_counts", {
        traj: pathStore.serialize(),
        config: self.robotConfig.serialize()
      }) as number[];
      pathStore.path.constraints.forEach((constraint) => {
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
      let controlIntervalCount = 0;
      pathStore.ui.setIterationNumber(0);

      await listen("solver-status", async (event) => {
        if (event.payload!.handle == handle) {
          const samples = event.payload.traj.samples as Sample[];
          const progress = pathStore.ui.generationProgress;
          // mutate in-progress trajectory in place if it's already the right size
          // should avoid allocations on every progress update
          if (progress.length != controlIntervalCount) {
            console.log("resize", controlIntervalCount, samples.length);
            pathStore.ui.setInProgressTrajectory(
              samples
            );
            controlIntervalCount = progress.length;
          } else {

            for (let i = 0; i < controlIntervalCount; i++) {
              const samp = samples[i];
              const prog = progress[i];
              samp.t = prog.t;
              samp.x = prog.x;
              samp.y = prog.y;
              samp.heading = prog.heading;
              samp.vx = prog.vx;
              samp.vy = prog.vy;
              samp.omega = prog.omega;
              samp.fx = prog.fx;
              samp.fy = prog.fy;
            }
          }
          // todo: get this from the progress update, so it actually means something
          // beyond just triggering UI updates
          pathStore.ui.setIterationNumber(
            pathStore.ui.generationIterationNumber + 1
          );
        }
      })
        .then((unlistener) => {
          unlisten = unlistener;
          return invoke("generate", {
            chor: self.serializeChor(),
            traj: pathStore.serialize(),
            handle: handle
          });
        })
        .finally(()=>{unlisten()})
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
            console.error(e);
            if ((e as string).includes("infeasible")) {
              throw "Infeasible Problem Detected";
            }
            if ((e as string).includes("maximum iterations exceeded")) {
              throw "Maximum Iterations Exceeded";
            }
            throw e;
          }
        )
        .finally(() => {
          // none of the below should trigger autosave
          pathStore.ui.setGenerating(false);
          pathStore.setIsTrajectoryStale(false);
        });
    }
  }
  ))
  .actions((self) => {
    return {
      generatePathWithToasts(activePathUUID: string) {
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
              console.error(data);
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
        const waypoints = self.pathlist.activePath.path.waypoints;
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
export interface IDocumentStore extends Instance<typeof DocumentStore> { }
export default DocumentStore;
