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
  .actions((self)=>{
    let pathExporter: (uuid: string) =>void = (uuid)=>{};
    return {
      setExporter(exportFunction: (uuid:string)=>void) {
        pathExporter = exportFunction;
        self.paths.forEach((p)=>p.setExporter(pathExporter));
      },
      getExporter() : (uuid:string) => void {
        return pathExporter;
      }
    }
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
          HolonomicPathStore.create({
            name: "New Path",
            visibleWaypointsStart: 0,
            visibleWaypointsEnd: 0,
            uuid: uuidv4(),
          })
        );
      },
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
      addPath(name: string, select: boolean = false): string {
        let usedName = this.disambiguateName(name);
        let newUUID = uuidv4();
        let path = HolonomicPathStore.create({
          uuid: newUUID,
          visibleWaypointsStart: 0,
          visibleWaypointsEnd: 0,
          name: usedName,
          waypoints: [],
        });
        path.setExporter(self.getExporter());
        path.addConstraint(ConstraintStores.StopPoint)?.setScope(["first"]);
        path.addConstraint(ConstraintStores.StopPoint)?.setScope(["last"]);
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
      duplicatePath(uuid: string) {
        if (self.pathUUIDs.includes(uuid)) {
          let oldPath = self.paths.get(uuid);
          // shouldn't hit this ever since we checked if the path exists
          if (oldPath === undefined) {
            return;
          }
          let newName = self.disambiguateName(oldPath.name);
          let newuuid = self.addPath(newName, false);
          let path = self.paths.get(newuuid);
          path!.fromSavedPath(oldPath.asSavedPath());
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
        if (self.paths.size == 0) {
          self.addPath("New Path", true);
        }
      },
    };
  });

export interface IPathListStore extends Instance<typeof PathListStore> {}
