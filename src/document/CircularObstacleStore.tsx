import { Instance, getParent, getRoot, isAlive, types } from "mobx-state-tree";
import { SavedCircleObstacle } from "./DocumentSpecTypes";
import { safeGetIdentifier } from "../util/mobxutils";
import { IStateStore } from "./DocumentModel";
import { ExpressionStore, Units } from "./ExpressionStore";
import { number } from "mathjs";
import {v4 as uuidv4} from "uuid"


export const CircularObstacleStore = types
  .model("CircularObstacleStore", {
    x: ExpressionStore,
    y: ExpressionStore,
    radius: ExpressionStore,
    uuid: types.identifier
  })
  .views((self) => ({
    asSavedCircleObstacle(): SavedCircleObstacle {
      const { x, y, radius } = self;
      return {
        x: x.value,
        y: y.value,
        radius: radius.value
      };
    },
    get selected(): boolean {
      if (!isAlive(self)) {
        return false;
      }
      return (
        self.uuid ===
        safeGetIdentifier(
          getRoot<IStateStore>(self).uiState.selectedSidebarItem
        )
      );
    }
  }))
  .actions((self) => ({
    fromSavedCircleObstacle(obstacle: SavedCircleObstacle) {
      self.x.set(obstacle.x);
      self.y.set(obstacle.y);
      self.radius.set(obstacle.radius);
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

