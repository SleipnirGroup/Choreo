import { Instance, types } from "mobx-state-tree";
import {
  SavedPathList,
  // SavedPathSwerve,
  // SavedPathTank,
  // SavedPath
} from "./DocumentSpecTypes";
import { HolonomicPathStore } from "./HolonomicPathStore";
import { v4 as uuidv4 } from "uuid";
import { ConstraintStores } from "./ConstraintStore";
import { TankDrivePathStore } from "./TankPathStore";

const PathStoreUnion = types.union(
  {
    dispatcher: (snapshot) => {
      switch (snapshot.type) {
        case "holonomic":
          return HolonomicPathStore;
        case "tank":
          return TankDrivePathStore;
        default:
          throw new Error("Unknown path type");
      }
    }
  },
  HolonomicPathStore,
  TankDrivePathStore
);

export const PathListStore = types
  .model("PathListStore", {
    paths: types.map(PathStoreUnion),
    activePathUUID: ""
  })
  .actions((self) => {
    let pathExporter: (uuid: string) => void = (uuid) => {};
    return {
      setExporter(exportFunction: (uuid: string) => void) {
        pathExporter = exportFunction;
        self.paths.forEach((p) => p.setExporter(pathExporter));
      },
      getExporter(): (uuid: string) => void {
        return pathExporter;
      }
    };
  })
  .views((self) => {
    return {
      asSavedPathList(): SavedPathList {
        const obj: any = {};
        self.paths.forEach((path) => {
          obj[path.name] = path.asSavedPath();
        });
        return obj;
      },
      toJSON(): any {
        const obj: any = {};
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
          HolonomicPathStore.create({
            name: "New Path",
            visibleWaypointsStart: 0,
            visibleWaypointsEnd: 0,
            uuid: uuidv4(),
            type: "holonomic"
          })
        );
      }
    };
  })
  .actions((self) => {
    return {
      disambiguateName(name: string) {
        let usedName = name;
        let disambig = 1;
        while (self.pathNames.includes(usedName)) {
          usedName = `${name} (${disambig.toFixed(0)})`;
          disambig++;
        }
        return usedName;
      },
      setActivePathUUID(uuid: string) {
        if (self.pathUUIDs.includes(uuid)) {
          self.activePathUUID = uuid;
        }
      },
      addPathBool(
        name: string,
        select: boolean = false,
        _type: boolean
      ): string {
        return this.addPath(name, select, _type ? "holonomic" : "tank");
      },
      addPath(
        name: string,
        select: boolean = false,
        _type: "holonomic" | "tank" = "holonomic"
      ): string {
        const usedName = this.disambiguateName(name);
        const newUUID = uuidv4();
        const path =
          _type === "holonomic"
            ? HolonomicPathStore.create({
                uuid: newUUID,
                visibleWaypointsStart: 0,
                visibleWaypointsEnd: 0,
                name: usedName,
                waypoints: [],
                type: "holonomic"
              })
            : TankDrivePathStore.create({
                uuid: newUUID,
                visibleWaypointsStart: 0,
                visibleWaypointsEnd: 0,
                name: usedName,
                waypoints: [],
                type: "tank"
              });

        path.setExporter(self.getExporter());
        path.addConstraint(ConstraintStores.StopPoint)?.setScope(["first"]);
        path.addConstraint(ConstraintStores.StopPoint)?.setScope(["last"]);
        self.paths.put(path);
        if (self.paths.size === 1 || select) {
          self.activePathUUID = newUUID;
        }

        return newUUID;
      }
    };
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
      duplicatePath(uuid: string) {
        if (self.pathUUIDs.includes(uuid)) {
          const oldPath = self.paths.get(uuid);
          if (!oldPath) {
            return;
          }
          const newName = self.disambiguateName(oldPath.name);
          const newuuid = self.addPath(newName, false, oldPath.type);
          const path = self.paths.get(newuuid);
          if (path && oldPath) {
            path.fromSavedPath(oldPath.asSavedPath());
          }
        }
      },
      fromSavedPathList(list: SavedPathList) {
        self.paths.clear();
        if (list) {
          Object.keys(list).forEach((name) => {
            const pathData = list[name];
            const uuid = self.addPath(name, false, pathData.type);
            const path = self.paths.get(uuid);
            if (path) {
              path.fromSavedPath(pathData);
            }
          });
        }
        if (self.paths.size == 0) {
          self.addPath("New Path", true);
        }
      }
    };
  });

export interface IPathListStore extends Instance<typeof PathListStore> {}
