import { types } from "mobx-state-tree";
import type {
  DifferentialSamplesContainer,
  HolonomicSamplesContainer,
  Trajectory
} from "../../ts/src/generated/types";
import { DifferentialSamplesContainerStore } from "./DifferentialSamplesContainerStore";
import { HolonomicSamplesContainerStore } from "./HolonomicSamplesContainerStore";

export const TrajectoryStore = types
  .model("TrajectoryStore", {
    sample_type: types.enumeration("TrajectorySampleType", ["Swerve", "Differential"]),
    waypoints: types.array(types.number),
    splits: types.array(types.number),
    holonomicSamples: types.maybe(HolonomicSamplesContainerStore),
    differentialSamples: types.maybe(DifferentialSamplesContainerStore)
  })
  .views((self) => ({
    get serialize(): Trajectory {
      if (self.sample_type === "Swerve" && self.holonomicSamples) {
        return {
          sample_type: "Swerve",
          waypoints: self.waypoints.slice(),
          splits: self.splits.slice(),
          samples: self.holonomicSamples.serialize
        };
      }

      if (self.sample_type === "Differential" && self.differentialSamples) {
        return {
          sample_type: "Differential",
          waypoints: self.waypoints.slice(),
          splits: self.splits.slice(),
          samples: self.differentialSamples.serialize
        };
      }

      throw new Error("TrajectoryStore is missing matching samples container.");
    }
  }))
  .actions((self) => ({
    deserialize(value: Trajectory) {
      self.sample_type = value.sample_type;
      self.waypoints.replace(value.waypoints);
      self.splits.replace(value.splits);

      self.holonomicSamples = undefined;
      self.differentialSamples = undefined;

      if (value.sample_type === "Swerve") {
        const samples = value.samples as HolonomicSamplesContainer;
        self.holonomicSamples = HolonomicSamplesContainerStore.create({
          samples: samples.samples
        });
      } else {
        const samples = value.samples as DifferentialSamplesContainer;
        self.differentialSamples = DifferentialSamplesContainerStore.create({
          samples: samples.samples
        });
      }
    }
  }));
