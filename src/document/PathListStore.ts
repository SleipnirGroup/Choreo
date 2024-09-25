import { Instance, getEnv, types } from "mobx-state-tree";
import { Traj } from "./2025/DocumentTypes";
import { Env } from "./DocumentManager";
import { HolonomicPathStore, IHolonomicPathStore } from "./path/HolonomicPathStore";
import { IHolonomicWaypointStore } from "./HolonomicWaypointStore";

export const PathListStore = types
  .model("PathListStore", {
    paths: types.map(HolonomicPathStore),
    activePathUUID: ""
  })
  .actions((self) => {
    let pathExporter: (uuid: string) => void = (_uuid) => {};
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
      addPath(name: string, select: boolean = false, contents?: Traj): string {
        const usedName = this.disambiguateName(name);
        const env = getEnv<Env>(self);
        const newUUID = crypto.randomUUID();
        env.startGroup(() => {
          try {
            const path = HolonomicPathStore.create({
              uuid: newUUID,
              name: usedName,
              params: {
                constraints: [],
                waypoints: []
              },
              ui: {
                visibleWaypointsEnd: 0,
                visibleWaypointsStart: 0
              },
              snapshot: {
                waypoints: [],
                constraints: []
              },
              traj: {
                waypoints: [],
                samples: [],
                splits: []
              },
              markers: []
            }
            );
            self.paths.put(path); //It's not ready yet but it needs to get the env injected
            path.setExporter(self.getExporter());
            if (contents !== undefined) {
              path.deserialize(contents);
            } else {
              path.setName(usedName);
              path.params.addConstraint("StopPoint", true, "first");
              path.params.addConstraint("StopPoint", true, "last");
              path.params.addConstraint(
                "KeepInRectangle",
                true,
                "first",
                "last",
                {
                  x: { exp: "0 m", val: 0.0 },
                  y: { exp: "0 m", val: 0.0 },
                  w: { exp: "16.54 m", val: 16.54 },
                  h: { exp: "8.21 m", val: 8.21 }
                }
              );
            }

            if (self.paths.size === 1 || select) {
              self.activePathUUID = path.uuid;
            }
          } finally {
            env.stopGroup();
          }
        });
        return newUUID;
      }
    };
    // The annoying thing we have to do to add the above actions to the object before we use them below
  })
  .views(self=> ({
    get activePath(): IHolonomicPathStore {
      let path = self.paths.get(self.activePathUUID);
      if (path === undefined) {
        self.addPath("New Path", true)
        path = self.paths.get(self.activePathUUID);
      }
      return path as IHolonomicPathStore;
    }
  }))
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
          // shouldn't hit this ever since we checked if the path exists
          if (oldPath === undefined) {
            return;
          }
          const newuuid = self.addPath(oldPath.name, false);
          const path = self.paths.get(newuuid);
          const copyOfOldPath = { ...oldPath.serialize, name: path!.name };
          path!.deserialize(copyOfOldPath);
        }
      }
    };
  });

export type IPathListStore = Instance<typeof PathListStore>;
