import { types } from "mobx-state-tree";
import type { ProjectFile } from "../../ts/src/generated/types";
import { CodeGenConfigStore } from "./CodeGenConfigStore";
import { DriveTypeStore } from "./DriveTypeStore";
import { RobotConfigStore } from "./RobotConfigStore";
import { VariablesStore } from "./VariablesStore";

export const ProjectFileStore = types
  .model("ProjectFileStore", {
    name: types.string,
    version: types.number,
    type: DriveTypeStore,
    variables: VariablesStore,
    config: RobotConfigStore,
    codegen: CodeGenConfigStore
  })
  .views((self) => ({
    get serialize(): ProjectFile {
      return {
        name: self.name,
        version: self.version,
        type: self.type.serialize,
        variables: self.variables.serialize,
        config: self.config.serialize,
        codegen: self.codegen.serialize
      };
    }
  }))
  .actions((self) => ({
    deserialize(value: ProjectFile) {
      self.name = value.name;
      self.version = value.version;
      self.type.deserialize(value.type);
      self.variables.deserialize(value.variables);
      self.config.deserialize(value.config);
      self.codegen.deserialize(value.codegen);
    }
  }));
