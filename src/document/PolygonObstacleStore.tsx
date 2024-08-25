import { Instance, types } from "mobx-state-tree";

export const PolygonObstacleStore = types.model("PolygonObstacleStore", {
  x: types.array(types.number),
  y: types.array(types.number),
  radius: 0
});

export type IPolygonObstacleStore = Instance<typeof PolygonObstacleStore>;
