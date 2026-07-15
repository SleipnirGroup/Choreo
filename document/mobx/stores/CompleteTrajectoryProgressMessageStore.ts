import { types } from "mobx-state-tree";
import type { CompleteTrajectoryProgressMessage } from "../../ts/src/generated/types";

export const CompleteTrajectoryProgressMessageStore = types
  .model("CompleteTrajectoryProgressMessageStore", {
    version: types.literal(1),
    event: types.literal("completeTrajectory"),
    payload: types.model("CompleteTrajectoryProgressPayload", {
      trajectoryFile: types.string
    })
  })
  .views((self) => ({
    get serialize(): CompleteTrajectoryProgressMessage {
      return {
        version: 1,
        event: "completeTrajectory",
        payload: {
          trajectoryFile: self.payload.trajectoryFile
        }
      };
    }
  }))
  .actions((self) => ({
    deserialize(value: CompleteTrajectoryProgressMessage) {
      self.payload.trajectoryFile = value.payload.trajectoryFile;
    }
  }));
