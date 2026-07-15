import { types } from "mobx-state-tree";
import type { HolonomicSamplesContainer } from "../../ts/src/generated/types";
import { HolonomicSampleStore } from "./HolonomicSampleStore";

export const HolonomicSamplesContainerStore = types
  .model("HolonomicSamplesContainerStore", {
    samples: types.array(HolonomicSampleStore)
  })
  .views((self) => ({
    get serialize(): HolonomicSamplesContainer {
      return {
        samples: self.samples.map((item) => item.serialize)
      };
    }
  }))
  .actions((self) => ({
    deserialize(value: HolonomicSamplesContainer) {
      self.samples.clear();
      value.samples.forEach((sample) => {
        self.samples.push(HolonomicSampleStore.create(sample));
      });
    }
  }));
