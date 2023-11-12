import { Instance, types } from "mobx-state-tree";

export const CircularObstacleStore = types
    .model("CircularObstacleStore",  {
        x: 0,
        y: 0,
        radius: 0
    })

export interface ICircularObstacleStore
    extends Instance<typeof CircularObstacleStore> {}