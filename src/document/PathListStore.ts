import { Instance, types } from "mobx-state-tree";
import { SavedPathList } from "./DocumentSpecTypes";
import { HolonomicPathStore } from "./HolonomicPathStore";
import { v4 as uuidv4 } from "uuid";
import { ConstraintStores } from "./ConstraintStore";

export const PathListStore = types
  .model("PathListStore", {
    paths: types.map(HolonomicPathStore),
    activePathUUID: "",
  })
  .views((self) => {
    return {
      asSavedPathList(): SavedPathList {
        let obj: any = {};
        self.paths.forEach((path) => {
          obj[path.name] = path.asSavedPath();
        });
        return obj;
      },
      toJSON(): any {
        let obj: any = {};
        self.paths.forEach((path) => {
          obj[path.name] = path;
        });
        return obj;
      },
      get pathNames() {
        return Array.from(self.paths.values()).map(
          (pathStore) => pathStore.name
        );
      },

      get pathUUIDs() {
        return Array.from(self.paths.keys());
      },
      get activePath() {
        return (
          self.paths.get(self.activePathUUID) ||
          HolonomicPathStore.create({ name: "New Path", uuid: uuidv4() })
        );
      },
    };
  })
  .actions((self) => {
    return {
      setActivePathUUID(uuid: string) {
        if (self.pathUUIDs.includes(uuid)) {
          self.activePathUUID = uuid;
        }
      },
      addPath(name: string, select: boolean = false): string {
        let usedName = name;
        let disambig = 1;
        while (self.pathNames.includes(usedName)) {
          usedName = `${name} (${disambig.toFixed(0)})`;
          disambig++;
        }
        let newUUID = uuidv4();
        let path = HolonomicPathStore.create({
          uuid: newUUID,
          name: usedName,
          waypoints: [],
        });
        path
          .addConstraint(ConstraintStores.StopPoint)
          ?.setScope(["first"]);
        path
          .addConstraint(ConstraintStores.StopPoint)
          ?.setScope(["last"]);
        self.paths.put(path);
        if (self.paths.size === 1 || select) {
          self.activePathUUID = newUUID;
        }

        return newUUID;
      },
    };
    // The annoying thing we have to do to add the above actions to the object before we use them below
  })
  .actions((self) => {
    return {
      deletePath(uuid: string) {
        self.paths.delete(uuid);
        if (self.paths.size === 0) {
          self.addPath("New Path", true);
        } else if (self.activePathUUID === uuid) {
          self.setActivePathUUID(self.pathUUIDs[0]);
        }
      },
      fromSavedPathList(list: SavedPathList) {
        self.paths.clear();
        if (list) {
          Array.from(Object.keys(list).values()).forEach((name) => {
            let uuid = self.addPath(name, false);
            let path = self.paths.get(uuid);
            path!.fromSavedPath(list[name]);
          });
        }
      },
    };
  });

export interface IPathListStore extends Instance<typeof PathListStore> {}
