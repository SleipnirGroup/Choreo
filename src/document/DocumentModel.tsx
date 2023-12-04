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
import { TrajectorySampleStore } from "./TrajectorySampleStore";
import { UndoManager } from "mst-middlewares";
import { IHolonomicPathStore } from "./HolonomicPathStore";
import { toJS } from "mobx";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.min.css";
import { Box } from "@mui/material";

export const DocumentStore = types
  .model("DocumentStore", {
    pathlist: PathListStore,
    robotConfig: RobotConfigStore,
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
      },
      select(item: SelectableItemTypes) {
        self.uiState.setSelectedSidebarItem(item);
      },
      async generatePath(uuid: string) {
        const pathStore = self.document.pathlist.paths.get(uuid);
        if (pathStore === undefined) {
          return new Promise((resolve, reject) =>
            reject("Path store is undefined")
          );
        }
        return new Promise((resolve, reject) => {
          const controlIntervalOptResult =
            pathStore.optimizeControlIntervalCounts(self.document.robotConfig);
          if (controlIntervalOptResult !== undefined) {
            return new Promise((resolve, reject) =>
              reject(controlIntervalOptResult)
            );
          }
          pathStore.setTrajectory([]);
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
                config: self.document.robotConfig,
                constraints: pathStore.asSolverPath().constraints,
              }),
            (e) => e
          )
          .then(
            (rust_traj) => {
              let newTraj: Array<SavedTrajectorySample> = [];
              // @ts-ignore
              rust_traj.samples.forEach((samp) => {
                let newPoint = TrajectorySampleStore.create();
                newPoint.setX(samp.x);
                newPoint.setY(samp.y);
                newPoint.setHeading(samp.heading);
                newPoint.setAngularVelocity(samp.angular_velocity);
                newPoint.setVelocityX(samp.velocity_x);
                newPoint.setVelocityY(samp.velocity_y);
                newPoint.setTimestamp(samp.timestamp);
                newTraj.push(newPoint);
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
        toast.dismiss();
        var pathName = self.document.pathlist.paths.get(activePathUUID)!.name;
        if (pathName === undefined) {
          toast.error("Tried to generate unknown path.");
        }
        toast.promise(
          self.generatePath(activePathUUID),
          {
            success: {
              render({ data, toastProps }) {
                console.log("success");
                return `Generated \"${pathName}\"`;
              },
            },

            error: {
              render({ data, toastProps }) {
                console.log(data);
                if ((data as string).includes("User_Requested_Stop")) {
                  toastProps.style = { visibility: "hidden" };
                  return `Cancelled \"${pathName}\"`;
                }
                return `Can't generate \"${pathName}\": ` + (data as string);
              },
            },
          },
          {
            containerId: "FIELD",
          }
        );
      },
    };
  });

export default StateStore;
export interface IStateStore extends Instance<typeof StateStore> {}
