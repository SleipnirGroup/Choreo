import { Instance, getParent, getRoot, isAlive, types } from "mobx-state-tree";
import { SavedCircleObstacle } from "./DocumentSpecTypes";
import { safeGetIdentifier } from "../util/mobxutils";
import { IStateStore } from "./DocumentModel";

export const CircularObstacleStore = types
  .model("CircularObstacleStore", {
    x: 0,
    y: 0,
    radius: 0,
    uuid: types.identifier
  })
  .views((self) => ({
    asSavedCircleObstacle(): SavedCircleObstacle {
      const { x, y, radius } = self;
      return {
        x,
        y,
        radius
      };
    },
    get selected(): boolean {
      if (!isAlive(self)) {
        return false;
      }
      return (
        self.uuid ==
        safeGetIdentifier(
          getRoot<IStateStore>(self).uiState.selectedSidebarItem
        )
      );
    }
  }))
  .actions((self) => ({
    fromSavedCircleObstacle(obstacle: SavedCircleObstacle) {
      self.x = obstacle.x;
      self.y = obstacle.y;
      self.radius = obstacle.radius;
    },
    setX(x: number) {
      self.x = x;
    },
    setY(y: number) {
      self.y = y;
    },
    setRadius(radius: number) {
      self.radius = radius;
    },
    setSelected(selected: boolean) {
      if (selected && !self.selected) {
        const root = getRoot<IStateStore>(self);
        if (root === undefined) {
          return;
        }
        root.select(
          getParent<ICircularObstacleStore[]>(self)?.find(
            (obstacle) => self.uuid == obstacle.uuid
          )
        );
      }
    }
  }));

export interface ICircularObstacleStore
  extends Instance<typeof CircularObstacleStore> {}
