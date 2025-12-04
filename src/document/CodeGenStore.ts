import { types } from "mobx-state-tree";
import { CodeGenConfig } from "./schema/DocumentTypes";
import { path } from "@tauri-apps/api";
import { toast } from "react-toastify";

export const CodeGenStore = types
  .model("CodeGenStore", {
    enabled: types.boolean,
    root: types.string,
    genVars: types.boolean,
    genTrajNames: types.boolean
  })
  .views((self) => ({
    get serialize(): CodeGenConfig | null {
      if (!self.enabled) {
        return null;
      }
      return {
        root: self.root,
        genVars: self.genVars,
        genTrajNames: self.genTrajNames
      };
    },
    get javaPkg() {
      if (!self.enabled) {
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
      self.enabled = true;
      self.root = root;
    },
    setGenVars(genVars: boolean) {
      self.enabled = true;
      self.genVars = genVars;
    },
    setGenTrajNames(genTrajNames: boolean) {
      self.enabled = true;
      self.genTrajNames = genTrajNames;
    },
    deserialize(data: CodeGenConfig | null) {
      self.enabled = data != null;
      self.root = data?.root ?? "";
      self.genVars = data?.genVars ?? true;
      self.genTrajNames = data?.genTrajNames ?? true;
    }
  }));
