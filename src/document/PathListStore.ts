import { Instance, getEnv, types } from "mobx-state-tree";
import { v4 as uuidv4 } from "uuid";
import { Traj } from "./2025/DocumentTypes";
import { Env } from "./DocumentManager";
import { HolonomicPathStore } from "./path/HolonomicPathStore";

export const PathListStore = types
  .model("PathListStore", {
    paths: types.map(HolonomicPathStore),
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
          self.paths.get(self.activePathUUID)! ||
          HolonomicPathStore.create({
            uuid: uuidv4(),
            name: "New Path",
            path: {
              constraints: [],
              waypoints: [],
              obstacles: []
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
              markers: []
            }
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
      addPath(name: string, select: boolean = false, contents?: Traj): string {
        const usedName = this.disambiguateName(name);
        const newUUID = uuidv4();
        const env = getEnv<Env>(self);
        env.startGroup(() => {
          try {
            const path = HolonomicPathStore.create({
              uuid: newUUID,
              name: usedName,
              path: {
                constraints: [],
                waypoints: [],
                obstacles: []
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
                markers: []
              }
            });
            path.setExporter(self.getExporter());
            self.paths.put(path); //It's not ready yet but it needs to get the env injected
            if (contents !== undefined) {
              path.deserialize(contents);
            } else {
              path.path.addConstraint("StopPoint", "first");
              path.path.addConstraint("StopPoint", "last");
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
          const newName = self.disambiguateName(oldPath.name);
          const newuuid = self.addPath(newName, false);
          const path = self.paths.get(newuuid);
          path!.deserialize(oldPath.serialize());
        }
      }
    };
  });

export type IPathListStore = Instance<typeof PathListStore>;
