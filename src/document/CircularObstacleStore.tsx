import { Instance, getEnv, getParent, isAlive, types } from "mobx-state-tree";
import { CircleObstacle, Expr } from "./2025/DocumentTypes";
import { Env } from "./DocumentManager";
import { ExpressionStore } from "./ExpressionStore";

export const CircularObstacleStore = types
  .model("CircularObstacleStore", {
    x: ExpressionStore,
    y: ExpressionStore,
    radius: ExpressionStore,
    uuid: types.identifier
  })
  .views((self) => ({
    serialize(): CircleObstacle<Expr> {
      return {
        x: self.x.serialize(),
        y: self.y.serialize(),
        r: self.radius.serialize()
      };
    },
    get selected(): boolean {
      if (!isAlive(self)) {
        return false;
      }
      return self.uuid === getEnv<Env>(self).selectedSidebar();
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
export type ICircularObstacleStore = Instance<typeof CircularObstacleStore>;
