import { types } from "mobx-state-tree";
import type { DifferentialSamplesContainer } from "../../ts/src/generated/types";
import { DifferentialSampleStore } from "./DifferentialSampleStore";

export const DifferentialSamplesContainerStore = types
  .model("DifferentialSamplesContainerStore", {
    samples: types.array(DifferentialSampleStore)
  })
  .views((self) => ({
    get serialize(): DifferentialSamplesContainer {
      return {
        samples: self.samples.map((item) => item.serialize)
      };
    }
  }))
  .actions((self) => ({
    deserialize(value: DifferentialSamplesContainer) {
      self.samples.clear();
      value.samples.forEach((sample) => {
        self.samples.push(DifferentialSampleStore.create(sample));
      });
    }
  }));
