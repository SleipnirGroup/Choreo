import { types } from "mobx-state-tree";
import type { DiagnosticProgressMessage } from "../../ts/src/generated/types";

export const DiagnosticProgressMessageStore = types
  .model("DiagnosticProgressMessageStore", {
    version: types.literal(1),
    event: types.literal("diagnostic"),
    payload: types.model("DiagnosticProgressPayload", {
      text: types.string
    })
  })
  .views((self) => ({
    get serialize(): DiagnosticProgressMessage {
      return {
        version: 1,
        event: "diagnostic",
        payload: {
          text: self.payload.text
        }
      };
    }
  }))
  .actions((self) => ({
    deserialize(value: DiagnosticProgressMessage) {
      self.payload.text = value.payload.text;
    }
  }));
