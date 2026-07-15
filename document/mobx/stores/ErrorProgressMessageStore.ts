import { types } from "mobx-state-tree";
import type { ErrorProgressMessage } from "../../ts/src/generated/types";

export const ErrorProgressMessageStore = types
  .model("ErrorProgressMessageStore", {
    version: types.literal(1),
    event: types.literal("error"),
    payload: types.model("ErrorProgressPayload", {
      message: types.string
    })
  })
  .views((self) => ({
    get serialize(): ErrorProgressMessage {
      return {
        version: 1,
        event: "error",
        payload: {
          message: self.payload.message
        }
      };
    }
  }))
  .actions((self) => ({
    deserialize(value: ErrorProgressMessage) {
      self.payload.message = value.payload.message;
    }
  }));
