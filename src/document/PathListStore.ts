import { Instance, getEnv, types } from "mobx-state-tree";
import { Trajectory } from "./schema/DocumentTypes";
import { Env, genJavaFiles } from "./DocumentManager";
import {
  HolonomicPathStore,
  IHolonomicPathStore
} from "./path/HolonomicPathStore";
import * as FieldDimensions from "../components/field/svg/fields/FieldDimensions";
import { SavingState } from "./UIStateStore";
import { toast } from "react-toastify";

export const PathListStore = types
  .model("PathListStore", {
    paths: types.map(HolonomicPathStore),
    activePathUUID: "",
    defaultPath: types.maybe(HolonomicPathStore)
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
            targetDt: env.vars().createExpression("0.05 s", "Time")
          },
          ui: {
            visibleWaypointsEnd: 0,
            visibleWaypointsStart: 0,
            savingState: SavingState.SAVED
          },
          snapshot: {
            waypoints: [],
            constraints: [],
            targetDt: 0.05
          },
          trajectory: {
            waypoints: [],
            samples: [],
            splits: []
          },
          markers: []
        });
        path.disableExport();
        self.defaultPath = path;
        self.activePathUUID = path.uuid;
      },
      addPath(
        name: string,
        select: boolean = false,
        contents?: Trajectory
      ): string {
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
                waypoints: [],
                targetDt: env.vars().createExpression("0.05 s", "Time")
              },
              ui: {
                visibleWaypointsEnd: 0,
                visibleWaypointsStart: 0,
                savingState: SavingState.SAVED
              },
              snapshot: {
                waypoints: [],
                constraints: [],
                targetDt: 0.05
              },
              trajectory: {
                waypoints: [],
                samples: [],
                splits: []
              },
              markers: []
            });
            self.paths.put(path); //It's not ready yet but it needs to get the env injected
            if (contents !== undefined) {
              path.deserialize(contents);
            } else {
              path.setName(usedName);
              path.params.addConstraint("StopPoint", true, "first");
              path.params.addConstraint("StopPoint", true, "last");
              path.params.addConstraint(
                "KeepInRectangle",
                false,
                "first",
                "last",
                {
                  x: { exp: "0 m", val: 0.0 },
                  y: { exp: "0 m", val: 0.0 },
                  w: {
                    exp: `${FieldDimensions.FIELD_LENGTH} m`,
                    val: FieldDimensions.FIELD_LENGTH
                  },
                  h: {
                    exp: `${FieldDimensions.FIELD_WIDTH} m`,
                    val: FieldDimensions.FIELD_WIDTH
                  }
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
        toast.promise(genJavaFiles(), {
          error: "Error generating Java files"
        });
        return newUUID;
      }
    };
    // The annoying thing we have to do to add the above actions to the object before we use them below
  })
  .views((self) => ({
    get activePath(): IHolonomicPathStore {
      let path = self.paths.get(self.activePathUUID);
      if (path === undefined) {
        self.addPath("New Path", true);
        path = self.paths.get(self.activePathUUID);
      }
      return path as IHolonomicPathStore;
    }
  }))
  .actions((self) => {
    return {
      deleteAll() {
        self.activePathUUID = self.defaultPath!.uuid;
        self.paths.clear();
      },
      deletePath(uuid: string) {
        if (self.paths.size === 1) {
          self.setActivePathUUID(self.defaultPath!.uuid);
        } else if (self.activePathUUID === uuid) {
          self.setActivePathUUID(self.pathUUIDs[0]);
        }
        self.paths.delete(uuid);
        toast.promise(genJavaFiles(), {
          error: "Error updating generated java files."
        });
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
        toast.promise(genJavaFiles(), {
          error: "Error updating generated java files."
        });
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
