import { types } from "mobx-state-tree";
import type { IncompleteTrajectoryProgressMessage } from "../../ts/src/generated/types";
import { DriveTypeStore } from "./DriveTypeStore";

export const IncompleteTrajectoryProgressMessageStore = types
  .model("IncompleteTrajectoryProgressMessageStore", {
    version: types.literal(1),
    event: types.literal("incompleteTrajectory"),
    driveType: DriveTypeStore,
    sampleCount: types.number,
    sampleStructType: types.string,
    sampleStructSize: types.number,
    samplesBase64: types.string
  })
  .views((self) => ({
    get serialize(): IncompleteTrajectoryProgressMessage {
      return {
        version: 1,
        event: "incompleteTrajectory",
        driveType: self.driveType.serialize,
        sampleCount: self.sampleCount,
        sampleStructType: self.sampleStructType,
        sampleStructSize: self.sampleStructSize,
        samplesBase64: self.samplesBase64
      };
    }
  }))
  .actions((self) => ({
    deserialize(value: IncompleteTrajectoryProgressMessage) {
      self.driveType.deserialize(value.driveType);
      self.sampleCount = value.sampleCount;
      self.sampleStructType = value.sampleStructType;
      self.sampleStructSize = value.sampleStructSize;
      self.samplesBase64 = value.samplesBase64;
    }
  }));
