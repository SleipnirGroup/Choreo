import { types } from "mobx-state-tree";
import { CodeGenConfig } from "./schema/DocumentTypes";
import { path } from "@tauri-apps/api";
import { toast } from "react-toastify";

const PATH_SEP_REGEX = /[/\\\\]/g;

export const CodeGenStore = types
  .model("CodeGenStore", {
    root: types.maybeNull(types.string),
    genVars: types.boolean,
    genTrajData: types.boolean,
    useChoreoLib: types.boolean
  })
  .views((self) => ({
    get serialize(): CodeGenConfig {
      return {
        root: self.root,
        genVars: self.genVars,
        genTrajData: self.genTrajData,
        useChoreoLib: self.useChoreoLib
      };
    },
    get javaPkg() {
      if (!self.root) {
        return null;
      }
      const splitPath = self.root.split(path.sep() + "java" + path.sep());
      if (splitPath.length === 1) {
        toast.error(
          'Invalid path: make sure your code generation root points to a "java" directory.'
        );
        return null;
      }
      return splitPath[1].replaceAll("/", ".").replaceAll("\\", ".");
    }
  }))
  .actions((self) => ({
    setRoot(root: string) {
      self.root = root.replace(PATH_SEP_REGEX, "/");
    },
    setGenVars(genVars: boolean) {
      self.genVars = genVars;
    },
    setGenTrajData(genTrajData: boolean) {
      self.genTrajData = genTrajData;
    },
    setUseChoreoLib(useChoreoLib: boolean) {
      self.useChoreoLib = useChoreoLib;
    },
    deserialize(data: CodeGenConfig) {
      self.root = data.root;
      self.genVars = data.genVars;
      self.genTrajData = data.genTrajData;
      self.useChoreoLib = data.useChoreoLib;
    }
  }));
