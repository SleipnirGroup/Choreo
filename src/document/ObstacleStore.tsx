import { Instance, types } from "mobx-state-tree";

export const ObstacleStore = types
    .model("ObstacleStore",  {
        x: 0,
        y: 0,
        radius: 0
    })

export interface IObstacleStore
    extends Instance<typeof ObstacleStore> {}