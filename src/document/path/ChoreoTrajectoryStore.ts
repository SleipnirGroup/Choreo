import { getEnv, Instance, types } from "mobx-state-tree";
import {
  deepCopy,
  DifferentialSample,
  SampleType,
  type SwerveSample,
  Output,
  RobotConfigValue
} from "../schema/DocumentTypes";
import { Env } from "../DocumentManager";
import { Commands } from "../tauriCommands";

// When adding new fields, consult
// https://choreo.autos/contributing/schema-upgrade/
// to see all the places that change with every schema upgrade.
export const ChoreoTrajectoryStore = types
  .model("ChoreoTrajectoryStore", {
    config: types.maybeNull(types.frozen<RobotConfigValue>()),
    sampleType: types.maybe(types.frozen<SampleType>()),
    waypoints: types.frozen<number[]>(),
    samples: types.frozen<SwerveSample[] | DifferentialSample[]>(),
    splits: types.frozen<number[]>()
  })
  .views((self) => ({
    get currentConfigSnapshot(): RobotConfigValue {
      return deepCopy(getEnv<Env>(self).getConfigSnapshot());
    }
  }))
  .views((self) => ({
    get fullTrajectory(): SwerveSample[] | DifferentialSample[] {
      return self.samples;
    },
    get isSwerve(): boolean {
      return self.sampleType === "Swerve";
    },
    get isDifferential(): boolean {
      return self.sampleType === "Differential";
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
      return last.time;
    },
    get serialize(): Output {
      return deepCopy({
        config: self.config,
        sampleType: self.sampleType,
        waypoints: self.waypoints,
        samples: self.samples,
        splits: self.splits
      });
    },
    async isConfigUpToDate(): Promise<boolean> {
      return (
        self.config !== null &&
        self.config !== undefined &&
        (await Commands.configMatches(self.config, self.currentConfigSnapshot))
      );
    }
  }))
  .actions((self) => ({
    deserialize(ser: Output) {
      self.config = ser.config === null || ser.config === undefined ? null : deepCopy(ser.config);
      self.sampleType = ser.sampleType;
      self.waypoints = deepCopy(ser.waypoints);
      self.splits = deepCopy(ser.splits);
      self.samples = deepCopy(ser.samples);
    },
    setSwerveSamples(samples: SwerveSample[]) {
      self.sampleType = "Swerve";
      self.samples = deepCopy(samples);
    },
    setDifferentialSamples(samples: DifferentialSample[]) {
      self.sampleType = "Differential";
      self.samples = deepCopy(samples);
    },
    setSplits(splits: number[]) {
      self.splits = deepCopy(splits);
    },
    setWaypoints(waypoints: number[]) {
      self.waypoints = deepCopy(waypoints);
    }
  }));

export type IChoreoTrajectoryStore = Instance<typeof ChoreoTrajectoryStore>;
