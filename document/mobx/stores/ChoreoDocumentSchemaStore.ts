import { cast, types } from "mobx-state-tree";
import type { ChoreoDocumentSchema } from "../../ts/src/generated/types";
import { JsonValueStore } from "./JsonValueStore";

export const ChoreoDocumentSchemaStore = types
  .model("ChoreoDocumentSchemaStore", {
    entries: types.optional(types.map(JsonValueStore), {})
  })
  .views((self) => ({
    get serialize(): ChoreoDocumentSchema {
      return Object.fromEntries(self.entries.entries());
    }
  }))
  .actions((self) => ({
    deserialize(value: ChoreoDocumentSchema) {
      self.entries.clear();
      for (const [k, v] of Object.entries(value)) {
        self.entries.set(k, cast(v));
      }
    }
  }));
