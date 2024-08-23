import { Instance, getEnv, getParent, getRoot, isAlive, types } from "mobx-state-tree";
import { ExpressionStore, Units } from "./ExpressionStore";
import { number } from "mathjs";
import {v4 as uuidv4} from "uuid"
import { CircleObstacle, Expr } from "./2025/DocumentTypes";
import { Env } from "./DocumentManager";

export const CircularObstacleStore = types
  .model("CircularObstacleStore", {
    x: ExpressionStore,
    y: ExpressionStore,
    radius: ExpressionStore,
    uuid: types.identifier
  })
  .views((self) => ({
    serialize() : CircleObstacle<Expr> {
      return {
        x: self.x.serialize(),
        y: self.y.serialize(),
        r: self.radius.serialize()
      }
    },
    get selected(): boolean {
      if (!isAlive(self)) {
        return false;
      }
      return (
        self.uuid ===
          getEnv<Env>(self).selectedSidebar()
      );
    }
  }))
  .actions((self) => ({
    deserialize(ser: CircleObstacle<Expr>) {
      self.x.deserialize(ser.x);
      self.y.deserialize(ser.y);
      self.radius.deserialize(ser.r);
    },
    setSelected(selected: boolean) {
      if (selected && !self.selected) {
        getEnv<Env>(self).select(
          getParent<ICircularObstacleStore[]>(self)?.find(
            (obstacle) => self.uuid == obstacle.uuid
          )
        );
      }
    }
  }));
  export interface ICircularObstacleStore
  extends Instance<typeof CircularObstacleStore> {}

