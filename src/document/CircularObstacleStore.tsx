import { Instance, types } from "mobx-state-tree";
import { SavedCircleObstacle } from "./DocumentSpecTypes";

export const CircularObstacleStore = types
    .model("CircularObstacleStore",  {
        x: 0,
        y: 0,
        radius: 0
    })
    .views((self) => {
        return {
            asSavedCircleObstacle(): SavedCircleObstacle {
                let {
                    x,
                    y,
                    radius,
                } = self;
                return {
                    x,
                    y,
                    radius
                };
            },
        };
    })
    .actions((self) => {
        return {
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
            }
        }
    })

export interface ICircularObstacleStore
    extends Instance<typeof CircularObstacleStore> {}