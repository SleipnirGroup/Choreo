import {
  Instance,
  types,
} from "mobx-state-tree";
import {
  SavedDocument,
  SavedTrajectorySample,
  SAVE_FILE_VERSION,
} from "./DocumentSpecTypes";

import { invoke } from "@tauri-apps/api/tauri";
import { RobotConfigStore } from "./RobotConfigStore";
import { SelectableItemTypes, UIStateStore } from "./UIStateStore";
import { PathListStore } from "./PathListStore";
import { TrajectorySampleStore } from "./TrajectorySampleStore";

// Save file data types:

// State tree data types:





const DocumentModelStore = types
  .model("DocumentModelStore", {
    uiState: UIStateStore,
    pathlist: PathListStore,
    robotConfig: RobotConfigStore,
  })
  .views((self) => ({
    asSavedDocument(): SavedDocument {
      return {
        version: SAVE_FILE_VERSION,
        robotConfiguration: self.robotConfig.asSavedRobotConfig(),
        paths: self.pathlist.asSavedPathList(),
      };
    },
  }))
  .actions((self) => ({
    fromSavedDocument(document: SavedDocument) {
      if (document.version !== SAVE_FILE_VERSION) {
        console.error("mismatched version");
      }
      self.robotConfig.fromSavedRobotConfig(document.robotConfiguration);
      self.pathlist.fromSavedPathList(document.paths);
    },
    select(item: SelectableItemTypes) {
      self.uiState.setSelectedSidebarItem(item);
    },
    generatePath(uuid: string) {
      const pathStore = self.pathlist.paths.get(uuid);
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
        config: self.robotConfig,
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
  }));

export default DocumentModelStore;
export interface IDocumentModelStore
  extends Instance<typeof DocumentModelStore> {}
