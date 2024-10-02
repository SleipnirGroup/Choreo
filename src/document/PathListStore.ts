import { Instance, getEnv, types } from "mobx-state-tree";
import { Trajectory } from "./2025/DocumentTypes";
import { Env } from "./DocumentManager";
import {
  HolonomicPathStore,
  IHolonomicPathStore
} from "./path/HolonomicPathStore";

export const PathListStore = types
  .model("PathListStore", {
    paths: types.map(HolonomicPathStore),
    activePathUUID: "",
    defaultPath: types.maybe(HolonomicPathStore)
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
        if (self.pathUUIDs.includes(uuid) || uuid === self.defaultPath!.uuid) {
          self.activePathUUID = uuid;
        }
      },
      addDefaultPath() {
        const usedName = "No Path";
        const newUUID = crypto.randomUUID();
        const env = getEnv<Env>(self);
        const path = HolonomicPathStore.create({
          uuid: newUUID,
          name: usedName,
          params: {
            constraints: [],
            waypoints: [],
            targetDt: env.vars().createExpression("0.1 s", "Time")
          },
          ui: {
            visibleWaypointsEnd: 0,
            visibleWaypointsStart: 0
          },
          snapshot: {
            waypoints: [],
            constraints: [],
            targetDt: 0.1
          },
          trajectory: {
            waypoints: [],
            samples: [],
            splits: [],
            markers: []
          }
        });
        path.setExporter((uuid) => {});
        self.defaultPath = path;
        self.activePathUUID = path.uuid;
      },
      addPath(
        name: string,
        select: boolean = false,
        contents?: Trajectory
      ): string {
        const usedName = this.disambiguateName(name);
        const newUUID = crypto.randomUUID();
        const env = getEnv<Env>(self);
        env.startGroup(() => {
          try {
            const path = HolonomicPathStore.create({
              uuid: newUUID,
              name: usedName,
              params: {
                constraints: [],
                waypoints: [],
                targetDt: env.vars().createExpression("0.1 s", "Time")
              },
              ui: {
                visibleWaypointsEnd: 0,
                visibleWaypointsStart: 0
              },
              snapshot: {
                waypoints: [],
                constraints: [],
                targetDt: 0.1
              },
              trajectory: {
                waypoints: [],
                samples: [],
                splits: [],
                markers: []
              }
            });
            path.setExporter(self.getExporter());
            self.paths.put(path); //It's not ready yet but it needs to get the env injected
            if (contents !== undefined) {
              path.deserialize(contents);
            } else {
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
              self.activePathUUID = newUUID;
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
  .actions((self) => {
    return {
      deletePath(uuid: string) {
        if (self.paths.size === 1) {
          self.setActivePathUUID(self.defaultPath!.uuid);
        } else if (self.activePathUUID === uuid) {
          self.setActivePathUUID(self.pathUUIDs[0]);
        }
        self.paths.delete(uuid);
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
  })
  .views((self) => ({
    get activePath(): IHolonomicPathStore {
      let path = self.paths.get(self.activePathUUID);
      if (path === undefined) {
        path = self.defaultPath;
      }
      return path as IHolonomicPathStore;
    }
  }));

export type IPathListStore = Instance<typeof PathListStore>;
