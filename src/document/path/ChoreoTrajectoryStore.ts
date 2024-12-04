import { Instance, types } from "mobx-state-tree";
import {
  DifferentialSample,
  Output,
  type SwerveSample
} from "../2025/DocumentTypes";

// When adding new fields, consult
// https://choreo.autos/contributing/schema-upgrade/
// to see all the places that change with every schema upgrade.
export const ChoreoTrajectoryStore = types
  .model("ChoreoTrajectoryStore", {
    waypoints: types.frozen<number[]>(),
    samples: types.frozen<SwerveSample[] | DifferentialSample[]>(),
    splits: types.frozen<number[]>()
  })
  .views((self) => ({
    get fullTrajectory(): SwerveSample[] | DifferentialSample[] {
      return self.samples;
    },
    get isSwerve(): boolean {
      return self.samples.length === 0 || Object.hasOwn(self.samples[0], "vx");
    },
    get isDifferential(): boolean {
      return self.samples.length === 0 || Object.hasOwn(self.samples[0], "vl");
    },
    // 01234567
    // ...
    //   ...
    //     ...
    // 0 = 0,0
    // 1 0,1
    // 2 1,0
    // 3,1,1
    // 4,2,0,
    // 5,2,1,
    // 6,2,2
    // the last interval of a section is considered the first interval of the next
    getIdxOfFullTrajectory(
      indexRemaining: number
    ): [number, number] | undefined {
      if (self.samples.length === 0) {
        return undefined;
      }
      if (self.splits.length === 0) {
        return [0, indexRemaining];
      }
      let sect = 0;
      // intentionally goes past valid index
      for (; sect <= self.splits.length; sect++) {
        const prevSplit = self.splits[sect - 1] ?? 0;
        if (prevSplit <= indexRemaining) {
          const nextSplit = self.splits[sect];

          if (nextSplit === undefined || nextSplit > indexRemaining) {
            return [sect, indexRemaining - prevSplit];
          }
        }
      }
      return [0, indexRemaining];
    },
    getTotalTimeSeconds(): number {
      if (self.samples.length === 0) {
        return 0;
      }
      const last = self.samples[self.samples.length - 1];
      return last.t;
    },
    get serialize(): Output {
      return {
        waypoints: self.waypoints,
        samples: self.samples,
        splits: self.splits,
        trackwidth: 1.0 //TODO: trackwidth
      };
    }
  }))
  .actions((self) => ({
    deserialize(ser: Output) {
      self.waypoints = ser.waypoints;
      self.splits = ser.splits;
      self.samples = ser.samples;
    },
    setSamples(samples: SwerveSample[] | DifferentialSample[]) {
      self.samples = samples;
    },
    setSplits(splits: number[]) {
      self.splits = splits;
    },
    setWaypoints(waypoints: number[]) {
      self.waypoints = waypoints;
    }
  }));

export type IChoreoTrajectoryStore = Instance<typeof ChoreoTrajectoryStore>;
