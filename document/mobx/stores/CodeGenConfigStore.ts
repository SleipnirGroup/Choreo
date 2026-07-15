import { types } from "mobx-state-tree";
import type { CodeGenConfig } from "../../ts/src/generated/types";

export const CodeGenConfigStore = types
  .model("CodeGenConfigStore", {
    root: types.maybe(types.string),
    genVars: types.maybe(types.boolean),
    genTrajData: types.maybe(types.boolean),
    useChoreoLib: types.maybe(types.boolean)
  })
  .views((self) => ({
    get serialize(): CodeGenConfig {
      return {
        root: self.root,
        genVars: self.genVars,
        genTrajData: self.genTrajData,
        useChoreoLib: self.useChoreoLib
      };
    }
  }))
  .actions((self) => ({
    deserialize(value: CodeGenConfig) {
      self.root = value.root;
      self.genVars = value.genVars;
      self.genTrajData = value.genTrajData;
      self.useChoreoLib = value.useChoreoLib;
    }
  }));
