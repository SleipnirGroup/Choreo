import { Instance, types } from "mobx-state-tree";
import { SavedTrajectorySample } from "./DocumentSpecTypes";

export const TrajectorySampleStore = types
  .model("TrajectorySampleStore", {
    timestamp: 0,
    x: 0,
    y: 0,
    heading: 0,
    velocityX: 0,
    velocityY: 0,
    angularVelocity: 0,
  })
  .views((self) => {
    return {
      asSavedTrajectorySample(): SavedTrajectorySample {
        let {
          timestamp,
          x,
          y,
          heading,
          velocityX,
          velocityY,
          angularVelocity,
        } = self;
        return {
          timestamp,
          x,
          y,
          heading,
          velocityX,
          velocityY,
          angularVelocity,
        };
      },
    };
  })
  .actions((self) => {
    return {
      fromSavedTrajectorySample(sample: SavedTrajectorySample) {
        self.timestamp = sample.timestamp;
        self.x = sample.x;
        self.y = sample.y;
        self.heading = sample.heading;
        self.velocityX = sample.velocityX;
        self.velocityY = sample.velocityY;
        self.angularVelocity = sample.angularVelocity;
      },
      setX(x: number) {
        self.x = x;
      },
      setY(y: number) {
        self.y = y;
      },
      setHeading(heading: number) {
        self.heading = heading;
      },
      setVelocityX(vx: number) {
        self.velocityX = vx;
      },
      setVelocityY(vy: number) {
        self.velocityY = vy;
      },
      setAngularVelocity(omega: number) {
        self.angularVelocity = omega;
      },
      setTimestamp(timestamp: number) {
        self.timestamp = timestamp;
      },
    };
  });
export interface ITrajectorySampleStore
  extends Instance<typeof TrajectorySampleStore> {}