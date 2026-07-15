import { types } from "mobx-state-tree";
import type { ProgressUpdateMessage } from "../../ts/src/generated/types";
import { CompleteTrajectoryProgressMessageStore } from "./CompleteTrajectoryProgressMessageStore";
import { DiagnosticProgressMessageStore } from "./DiagnosticProgressMessageStore";
import { ErrorProgressMessageStore } from "./ErrorProgressMessageStore";
import { IncompleteTrajectoryProgressMessageStore } from "./IncompleteTrajectoryProgressMessageStore";

export const ProgressUpdateMessageStore = types
  .model("ProgressUpdateMessageStore", {
    event: types.enumeration("ProgressUpdateEvent", [
      "incompleteTrajectory",
      "diagnostic",
      "error",
      "completeTrajectory"
    ]),
    incompleteTrajectory: types.maybe(IncompleteTrajectoryProgressMessageStore),
    diagnostic: types.maybe(DiagnosticProgressMessageStore),
    error: types.maybe(ErrorProgressMessageStore),
    completeTrajectory: types.maybe(CompleteTrajectoryProgressMessageStore)
  })
  .views((self) => ({
    get serialize(): ProgressUpdateMessage {
      if (self.event === "incompleteTrajectory" && self.incompleteTrajectory) {
        return self.incompleteTrajectory.serialize;
      }
      if (self.event === "diagnostic" && self.diagnostic) {
        return self.diagnostic.serialize;
      }
      if (self.event === "error" && self.error) {
        return self.error.serialize;
      }
      if (self.event === "completeTrajectory" && self.completeTrajectory) {
        return self.completeTrajectory.serialize;
      }
      throw new Error("ProgressUpdateMessageStore is missing active variant data.");
    }
  }))
  .actions((self) => ({
    deserialize(value: ProgressUpdateMessage) {
      self.incompleteTrajectory = undefined;
      self.diagnostic = undefined;
      self.error = undefined;
      self.completeTrajectory = undefined;

      if (value.event === "incompleteTrajectory") {
        self.event = "incompleteTrajectory";
        self.incompleteTrajectory = IncompleteTrajectoryProgressMessageStore.create({
          version: 1,
          event: "incompleteTrajectory",
          driveType: { value: value.driveType },
          sampleCount: value.sampleCount,
          sampleStructType: value.sampleStructType,
          sampleStructSize: value.sampleStructSize,
          samplesBase64: value.samplesBase64
        });
        return;
      }

      if (value.event === "diagnostic") {
        self.event = "diagnostic";
        self.diagnostic = DiagnosticProgressMessageStore.create({
          version: 1,
          event: "diagnostic",
          payload: { text: value.payload.text }
        });
        return;
      }

      if (value.event === "error") {
        self.event = "error";
        self.error = ErrorProgressMessageStore.create({
          version: 1,
          event: "error",
          payload: { message: value.payload.message }
        });
        return;
      }

      self.event = "completeTrajectory";
      self.completeTrajectory = CompleteTrajectoryProgressMessageStore.create({
        version: 1,
        event: "completeTrajectory",
        payload: { trajectoryFile: value.payload.trajectoryFile }
      });
    }
  }));
