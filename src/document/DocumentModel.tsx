import { Instance, types } from "mobx-state-tree";
import {
  SavedDocument,
  SavedTrajectorySample,
  SAVE_FILE_VERSION,
  updateToCurrent,
} from "./DocumentSpecTypes";

import { invoke } from "@tauri-apps/api/tauri";
import { RobotConfigStore } from "./RobotConfigStore";
import { SelectableItemTypes, UIStateStore } from "./UIStateStore";
import { PathListStore } from "./PathListStore";
import { UndoManager } from "mst-middlewares";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.min.css";

export const DocumentStore = types
  .model("DocumentStore", {
    pathlist: PathListStore,
    robotConfig: RobotConfigStore,
    splitTrajectoriesAtStopPoints: types.boolean,
    usesObstacles: types.boolean,
  })
  .volatile((self) => ({
    history: UndoManager.create({}, { targetStore: self }),
  }));

export interface IDocumentStore extends Instance<typeof DocumentStore> {}

const StateStore = types
  .model("StateStore", {
    uiState: UIStateStore,
    document: DocumentStore,
  })
  .views((self) => ({
    asSavedDocument(): SavedDocument {
      return {
        version: SAVE_FILE_VERSION,
        robotConfiguration: self.document.robotConfig.asSavedRobotConfig(),
        paths: self.document.pathlist.asSavedPathList(),
        splitTrajectoriesAtStopPoints:
          self.document.splitTrajectoriesAtStopPoints,
        usesObstacles: self.document.usesObstacles,
      };
    },
  }))
  .actions((self) => {
    return {
      afterCreate() {
        self.document.history = UndoManager.create(
          {},
          { targetStore: self.document }
        );
      },
      fromSavedDocument(document: any) {
        document = updateToCurrent(document);
        self.document.robotConfig.fromSavedRobotConfig(
          document.robotConfiguration
        );
        self.document.pathlist.fromSavedPathList(document.paths);
        self.document.splitTrajectoriesAtStopPoints =
          document.splitTrajectoriesAtStopPoints;
        self.document.usesObstacles = document.usesObstacles;
      },
      select(item: SelectableItemTypes) {
        self.uiState.setSelectedSidebarItem(item);
      },
      async generatePath(uuid: string) {
        const pathStore = self.document.pathlist.paths.get(uuid);
        if (pathStore === undefined) {
          throw "Path store is undefined";
        }

        return new Promise((resolve, reject) => {
          pathStore.fixWaypointHeadings();
          const controlIntervalOptResult =
            pathStore.optimizeControlIntervalCounts(self.document.robotConfig);
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
            if (wpt.isInitialGuess) {
              if (idx == 0) {
                reject("Cannot start a path with an initial guess point.");
              } else if (idx == pathStore.waypoints.length - 1) {
                reject("Cannot end a path with an initial guess point.");
              }
            }
          });
          pathStore.setGenerating(true);
          resolve(pathStore);
        })
          .then(
            () =>
              invoke("generate_trajectory", {
                path: pathStore.waypoints,
                config: self.document.robotConfig.asSolverRobotConfig(),
                constraints: pathStore.asSolverPath().constraints,
                circleObstacles: pathStore.asSolverPath().circleObstacles,
                polygonObstacles: [],
              }),
            (e) => e
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
                  timestamp: samp.timestamp,
                });
              });
              pathStore.setTrajectory(newTraj);
              if (newTraj.length == 0) throw "No traj";
            },
            (e) => {
              console.error(e);
              if ((e as string).includes("Infeasible_Problem_Detected")) {
                throw "Infeasible Problem Detected";
              }
              if ((e as string).includes("Maximum_Iterations_Exceeded")) {
                throw "Maximum Iterations Exceeded";
              }
              throw e;
            }
          )
          .finally(() => {
            pathStore.setGenerating(false);
            self.uiState.setPathAnimationTimestamp(0);
          });
      },
    };
  })
  .actions((self) => {
    return {
      generatePathWithToasts(activePathUUID: string) {
        const path = self.document.pathlist.paths.get(activePathUUID)!;
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
            },
          },

          error: {
            render({ data, toastProps }) {
              console.error(data);
              if ((data as string).includes("User_Requested_Stop")) {
                toastProps.style = { visibility: "hidden" };
                return `Cancelled "${pathName}"`;
              }
              return `Can't generate "${pathName}": ` + (data as string);
            },
          },
        });
      },
    };
  })
  .actions((self) => {
    return {
      setSplitTrajectoriesAtStopPoints(split: boolean) {
        self.document.splitTrajectoriesAtStopPoints = split;
      },
      setUsesObstacles(usesObstacles: boolean) {
        self.document.usesObstacles = usesObstacles;
      },
    };
  });

export default StateStore;
export interface IStateStore extends Instance<typeof StateStore> {}
