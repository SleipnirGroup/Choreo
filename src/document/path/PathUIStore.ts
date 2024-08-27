import { types, getEnv, Instance } from "mobx-state-tree";
import { type Sample } from "../2025/DocumentTypes";
import { Env } from "../DocumentManager";

export const PathUIStore = types
  .model("PathUIStore", {
    visibleWaypointsStart: types.number,
    visibleWaypointsEnd: types.number,
    generationProgress: types.frozen<Array<Sample>>([]),
    generating: false,
    generationIterationNumber: 0
  })
  .actions((self) => ({
    setVisibleWaypointsStart(start: number) {
      if (start <= self.visibleWaypointsEnd) {
        self.visibleWaypointsStart = start;
      }
    },
    setVisibleWaypointsEnd(end: number) {
      if (end >= self.visibleWaypointsStart) {
        self.visibleWaypointsEnd = end;
      }
    },
    setIterationNumber(it: number) {
      getEnv<Env>(self).withoutUndo(() => {
        self.generationIterationNumber = it;
      });
    },
    setInProgressTrajectory(trajectory: Array<Sample>) {
      getEnv<Env>(self).withoutUndo(() => {
        self.generationProgress = trajectory;
      });
    },
    setGenerating(generating: boolean) {
      getEnv<Env>(self).withoutUndo(() => {
        self.generating = generating;
      });
    }
  }));

export type IPathUIStore = Instance<typeof PathUIStore>;
