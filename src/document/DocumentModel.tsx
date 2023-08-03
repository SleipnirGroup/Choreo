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
      generatePath(uuid: string) {
        const pathStore = self.document.pathlist.paths.get(uuid);
        if (pathStore === undefined) {
          return;
        }
        pathStore.setTrajectory([]);
        if (pathStore.waypoints.length < 2) {
          return;
        }
        pathStore.setGenerating(true);
        invoke("generate_trajectory", {
          path: pathStore.waypoints,
          config: self.document.robotConfig,
        })
          .then((rust_traj) => {
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
          })
          .finally(() => {
            pathStore.setGenerating(false);
          });
      },
    };
  });

export default StateStore;
export interface IStateStore extends Instance<typeof StateStore> {}
