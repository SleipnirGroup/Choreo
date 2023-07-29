import { Instance, types, getRoot, detach, destroy } from "mobx-state-tree";
import {
  SavedPath,
  SavedTrajectorySample,
  SavedWaypoint,
} from "./DocumentSpecTypes";
import {
  HolonomicWaypointStore,
  IHolonomicWaypointStore,
} from "./HolonomicWaypointStore";
import { TrajectorySampleStore } from "./TrajectorySampleStore";
import { moveItem } from "mobx-utils";
import { v4 as uuidv4 } from "uuid";
import { IDocumentModelStore } from "./DocumentModel";

export const HolonomicPathStore = types
  .model("HolonomicPathStore", {
    name: "",
    uuid: types.identifier,
    waypoints: types.array(HolonomicWaypointStore),
    generated: types.array(TrajectorySampleStore),
    generating: false,
  })
  .views((self) => {
    return {
      getTotalTimeSeconds(): number {
        if (self.generated.length === 0) {
          return 0;
        }
        return self.generated[self.generated.length - 1].timestamp;
      },
      getSavedTrajectory(): Array<SavedTrajectorySample> | null {
        let trajectory = null;
        if (self.generated.length >= 2) {
          trajectory = self.generated.map((point) =>
            point.asSavedTrajectorySample()
          );
        }
        return trajectory;
      },
      canGenerate(): boolean {
        return self.waypoints.length >= 2 && !self.generating;
      },
      canExport(): boolean {
        return self.generated.length >= 2;
      },
      asSavedPath(): SavedPath {
        let trajectory: Array<SavedTrajectorySample> | null = null;
        if (self.generated.length >= 2) {
          trajectory = self.generated.map((point) =>
            point.asSavedTrajectorySample()
          );
        }
        return {
          waypoints: self.waypoints.map((point) => point.asSavedWaypoint()),
          trajectory: trajectory,
        };
      },
      lowestSelectedPoint(): IHolonomicWaypointStore | null {
        for (let point of self.waypoints) {
          if (point.selected) return point;
        }
        return null;
      },
    };
  })
  .actions((self) => {
    return {
      fromSavedPath(path: SavedPath) {
        self.waypoints.clear();
        path.waypoints.forEach((point: SavedWaypoint, index: number): void => {
          let waypoint = this.addWaypoint();
          waypoint.fromSavedWaypoint(point);
        });
        self.generated.clear();
        if (path.trajectory !== undefined && path.trajectory !== null) {
          path.trajectory.forEach((savedSample, index) => {
            let sample = TrajectorySampleStore.create();
            sample.fromSavedTrajectorySample(savedSample);
            self.generated.push(sample);
          });
        }
      },
      setName(name: string) {
        self.name = name;
      },
      selectOnly(selectedIndex: number) {
        self.waypoints.forEach((point, index) => {
          point.setSelected(selectedIndex == index);
        });
      },
      addWaypoint(): IHolonomicWaypointStore {
        self.waypoints.push(HolonomicWaypointStore.create({ uuid: uuidv4() }));
        if (self.waypoints.length === 1) {
          const root = getRoot<IDocumentModelStore>(self);
          root.select(self.waypoints[0]);
        }
        return self.waypoints[self.waypoints.length - 1];
      },
      deleteWaypoint(index: number) {
        // const root = getRoot<IDocumentModelStore>(self);
        // root.select(undefined);
        destroy(self.waypoints[index]);
        if (self.waypoints.length === 0) {
          self.generated.length = 0;
          return;
        } else if (self.waypoints[index - 1]) {
          self.waypoints[index - 1].setSelected(true);
        } else if (self.waypoints[index + 1]) {
          self.waypoints[index + 1].setSelected(true);
        }
      },
      deleteWaypointUUID(uuid: string) {
        let index = self.waypoints.findIndex((point) => point.uuid === uuid);
        if (index == -1) return;
        const root = getRoot<IDocumentModelStore>(self);
        root.select(undefined);

        if (self.waypoints.length === 1) {
          self.generated.length = 0;
        } else if (self.waypoints[index - 1]) {
          self.waypoints[index - 1].setSelected(true);
        } else if (self.waypoints[index + 1]) {
          self.waypoints[index + 1].setSelected(true);
        }
        destroy(self.waypoints[index]);
      },
      reorder(startIndex: number, endIndex: number) {
        //self.waypoints.splice(endIndex, 0, self.waypoints.splice(startIndex, 1)[0]);
        moveItem(self.waypoints, startIndex, endIndex);
      },
      setTrajectory(trajectory: Array<SavedTrajectorySample>) {
        // @ts-ignore
        self.generated = trajectory;
        self.generating = false;
      },
      setGenerating(generating: boolean) {
        self.generating = generating;
      },
    };
  });
export interface IHolonomicPathStore
  extends Instance<typeof HolonomicPathStore> {}
