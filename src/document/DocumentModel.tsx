import { Instance, getEnv, types } from "mobx-state-tree";
import {
  SavedDocument,
  SavedGeneratedWaypoint,
  SavedTrajectorySample,
  SAVE_FILE_VERSION,
  updateToCurrent
} from "./DocumentSpecTypes";

import { invoke } from "@tauri-apps/api/tauri";
import { IRobotConfigStore, RobotConfigStore } from "./RobotConfigStore";
import { PathListStore } from "./PathListStore";
import { UndoManager } from "mst-middlewares";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.min.css";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { ExpressionStore, Units, Variables} from "./ExpressionStore";
import { CircularObstacleStore, ICircularObstacleStore } from "./CircularObstacleStore";
import {v4 as uuidv4} from "uuid";
import { HolonomicWaypointStore, IHolonomicWaypointStore } from "./HolonomicWaypointStore";
import { ConstraintStores, IConstraintStore } from "./ConstraintStore";
import { EventMarkerStore, IEventMarkerStore } from "./EventMarkerStore";

export type SelectableItemTypes =
| IRobotConfigStore
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
      if (snapshot.scope) {
        return ConstraintStores[snapshot.type];
      }
      if (snapshot.radius) {
        return CircularObstacleStore;
      }
      return HolonomicWaypointStore;
    }
  },
  RobotConfigStore,
  HolonomicWaypointStore,
  CircularObstacleStore,
  EventMarkerStore,
  ...Object.values(ConstraintStores)
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
    asSavedDocument(): SavedDocument {
      return {
        version: SAVE_FILE_VERSION,
        robotConfiguration: self.robotConfig.asSavedRobotConfig(),
        paths: self.pathlist.asSavedPathList(),
        splitTrajectoriesAtStopPoints:
          self.splitTrajectoriesAtStopPoints,
        usesObstacles: self.usesObstacles
      };
    },
    get isSidebarConstraintSelected() {
      return (
        self.selectedSidebarItem !== undefined &&
        self.selectedSidebarItem.scope !== undefined
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
  })).actions(self=>({
    setSelectedSidebarItem(item: SelectableItemTypes) {
      self.selectedSidebarItem = item;
    },
      afterCreate() {
        self.variables.addPose("pose");
        self.variables.add("name", "pose.x()", Units.Meter);
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
      fromSavedDocument(document: any) {
        document = updateToCurrent(document);
        self.robotConfig.fromSavedRobotConfig(
          document.robotConfiguration
        );
        self.pathlist.fromSavedPathList(document.paths);
        self.splitTrajectoriesAtStopPoints =
          document.splitTrajectoriesAtStopPoints;
        self.usesObstacles = document.usesObstacles;
      },
      async generatePath(uuid: string) {
        const pathStore = self.pathlist.paths.get(uuid);
        if (pathStore === undefined) {
          throw "Path store is undefined";
        }
        let generatedWaypoints: SavedGeneratedWaypoint[] = [];
        return new Promise((resolve, reject) => {
          const controlIntervalOptResult =
            pathStore.optimizeControlIntervalCounts(self.robotConfig);
          if (controlIntervalOptResult !== undefined) {
            return new Promise((resolve, reject) =>
              reject(controlIntervalOptResult)
            );
          }
          if (pathStore.waypoints.length < 2) {
            return;
          }
          pathStore.constraints.forEach((constraint) => {
            if (constraint.issues.length > 0) {
              reject(constraint.issues.join(", "));
            }
          });
          pathStore.waypoints.forEach((wpt, idx) => {
            if (wpt.isInitialGuess) {
              if (idx == 0) {
                reject("Cannot start a path with an initial guess point.");
              } else if (idx == pathStore.waypoints.length - 1) {
                reject("Cannot end a path with an initial guess point.");
              }
            }
          });
          pathStore.setGenerating(true);
          // Capture the timestamps of the waypoints that were actually sent to the solver
          const waypointTimestamps = pathStore.waypointTimestamps();
          console.log(waypointTimestamps);
          const stopPoints = pathStore.stopPoints();
          generatedWaypoints = pathStore.waypoints.map((point, idx) => ({
            timestamp: 0,
            isStopPoint: stopPoints.includes(idx),
            ...point.asSavedWaypoint()
          }));
          pathStore.eventMarkers.forEach((m) => m.updateTargetIndex());
          resolve(pathStore);
        })
          .then(
            () => {
              const handle = pathStore.uuid
                .split("")
                .reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0);
              let unlisten: UnlistenFn;
              let controlIntervalCount = 0;
              for (const waypoint of generatedWaypoints) {
                controlIntervalCount += waypoint.controlIntervalCount;
              }
              // last waypoint doesn't count, except as its own interval.
              controlIntervalCount -=
                generatedWaypoints[generatedWaypoints.length - 1]
                  .controlIntervalCount;
              controlIntervalCount += 1;

              pathStore.setIterationNumber(0);

              return listen("solver-status", async (event) => {
                if (event.payload!.handle == handle) {
                  const samples = event.payload.traj.samples;
                  const progress = pathStore.generationProgress;
                  // mutate in-progress trajectory in place if it's already the right size
                  // should avoid allocations on every progress update
                  if (progress.length != controlIntervalCount) {
                    console.log("resize", controlIntervalCount, samples.length);
                    pathStore.setInProgressTrajectory(
                      samples.map((samp) => ({
                        x: samp.x,
                        y: samp.y,
                        heading: samp.heading,
                        angularVelocity: samp.angular_velocity,
                        velocityX: samp.velocity_x,
                        velocityY: samp.velocity_y,
                        timestamp: samp.timestamp
                      }))
                    );
                  } else {
                    for (let i = 0; i < controlIntervalCount; i++) {
                      const samp = samples[i];
                      const prog = progress[i];
                      prog.x = samp.x;
                      prog.y = samp.y;
                      prog.heading = samp.heading;
                      prog.angularVelocity = samp.angular_velocity;
                      prog.velocityX = samp.velocity_x;
                      prog.velocityY = samp.velocity_y;
                      prog.timestamp = samp.timestamp;
                    }
                  }
                  // todo: get this from the progress update, so it actually means something
                  // beyond just triggering UI updates
                  pathStore.setIterationNumber(
                    pathStore.generationIterationNumber + 1
                  );
                }
              })
                .then((unlistener) => {
                  unlisten = unlistener;
                  return invoke("generate_trajectory", {
                    path: pathStore.waypoints,
                    config: self.robotConfig.asSolverRobotConfig(),
                    constraints: pathStore.asSolverPath().constraints,
                    circleObstacles: pathStore.asSolverPath().circleObstacles,
                    polygonObstacles: [],
                    handle: handle
                  });
                })
                .then(
                  (result) => {
                    unlisten();
                    return result;
                  },
                  (e) => {
                    unlisten();
                    throw e;
                  }
                );
            },

            (e) => {
              throw e;
            }
          )
          .then(
            (rust_traj) => {
              const newTraj: Array<SavedTrajectorySample> = [];
              rust_traj.samples.forEach((samp) => {
                newTraj.push({
                  x: samp.x,
                  y: samp.y,
                  heading: samp.heading,
                  angularVelocity: samp.angular_velocity,
                  velocityX: samp.velocity_x,
                  velocityY: samp.velocity_y,
                  moduleForcesX: samp.module_forces_x,
                  moduleForcesY: samp.module_forces_y,
                  timestamp: samp.timestamp
                });
              });
              if (newTraj.length == 0) throw "No traj";
              self.history.startGroup(() => {
                pathStore.setTrajectory(newTraj);
                if (newTraj.length > 0) {
                  let currentInterval = 0;
                  generatedWaypoints.forEach((w) => {
                    if (newTraj.at(currentInterval)?.timestamp !== undefined) {
                      w.timestamp = newTraj.at(currentInterval)!.timestamp;
                      currentInterval += w.controlIntervalCount;
                    }
                  });
                  pathStore.eventMarkers.forEach((m) => {
                    m.updateTargetIndex();
                  });
                }
                pathStore.setGeneratedWaypoints(generatedWaypoints);
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
            pathStore.setGenerating(false);
            pathStore.setIsTrajectoryStale(false);
          });
      }
    }
  ))
  .actions((self) => {
    return {
      generatePathWithToasts(activePathUUID: string) {
        const path = self.pathlist.paths.get(activePathUUID)!;
        if (path.generating) {
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
        const waypoints = self.pathlist.activePath.waypoints;
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
export interface IDocumentStore extends Instance<typeof DocumentStore> {}
export default DocumentStore;
