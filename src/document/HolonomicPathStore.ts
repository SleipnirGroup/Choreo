import { Instance, types, getRoot, destroy, getParent } from "mobx-state-tree";
import {
  SavedConstraint,
  SavedPath,
  SavedTrajectorySample,
  SavedWaypoint,
} from "./DocumentSpecTypes";
import {
  HolonomicWaypointStore,
  IHolonomicWaypointStore,
} from "./HolonomicWaypointStore";
import { TrajectorySampleStore } from "./TrajectorySampleStore";
import { moveItem } from "mobx-utils";
import { v4 as uuidv4 } from "uuid";
import { IStateStore } from "./DocumentModel";
import { constraints, ConstraintStore, ConstraintStores} from "./ConstraintStore";

export const HolonomicPathStore = types
  .model("HolonomicPathStore", {
    name: "",
    uuid: types.identifier,
    waypoints: types.array(HolonomicWaypointStore),
    constraints: types.array(types.union(...Object.values(ConstraintStores))),
    generated: types.array(TrajectorySampleStore),
    generating: false,
  })
  .views((self) => {
    return {
      findUUIDIndex(uuid: string) {
        return self.waypoints.findIndex((wpt)=>wpt.uuid === uuid);
      }
    }
  })
  .views((self) => {
    return {
      getTotalTimeSeconds(): number {
        if (self.generated.length === 0) {
          return 0;
        }
        return self.generated[self.generated.length - 1].timestamp;
      },
      getSavedTrajectory(): Array<SavedTrajectorySample> | null {
        let trajectory = null;
        if (self.generated.length >= 2) {
          trajectory = self.generated.map((point) =>
            point.asSavedTrajectorySample()
          );
        }
        return trajectory;
      },
      canGenerate(): boolean {
        return self.waypoints.length >= 2 && !self.generating;
      },
      canExport(): boolean {
        return self.generated.length >= 2;
      },
      asSavedPath(): SavedPath {
        let trajectory: Array<SavedTrajectorySample> | null = null;
        if (self.generated.length >= 2) {
          trajectory = self.generated.map((point) =>
            point.asSavedTrajectorySample()
          );
        }
        return {
          waypoints: self.waypoints.map((point) => point.asSavedWaypoint()),
          trajectory: trajectory,
          constraints: self.constraints.flatMap((constraint)=>{
            let saved : Partial<SavedConstraint> = {};
            let con = constraint;
            if (typeof con.scope === "string") { 
              if (con.scope === "full") {
                saved["scope"] = "full"
              } else {
                let scopeIndex = self.findUUIDIndex(con.scope);
                if (scopeIndex == -1) {
                  return []; // don't try to save this constraint
                }
                saved["scope"] = scopeIndex;
              }

            }
            else if (typeof con.scope?.start === "string") { 
              let startScopeIndex = self.findUUIDIndex(con.scope.start);
              if (startScopeIndex == -1) {
                return []; // don't try to save this constraint
              }
              let endScopeIndex = self.findUUIDIndex(con.scope.end);
              if (endScopeIndex == -1) {
                return []; // don't try to save this constraint
              }
              saved["scope"] = {start: startScopeIndex, end: endScopeIndex};
            }
            else {
              saved["scope"] = undefined
            }

            return {
              
              ...constraint,
              type: constraint.type,
              scope: saved["scope"] ?? null,
            }
          })
        };
      },
      lowestSelectedPoint(): IHolonomicWaypointStore | null {
        for (let point of self.waypoints) {
          if (point.selected) return point;
        }
        return null;
      },
    };
  })
  .actions((self) => {
    return {
      addConstraint(store: (typeof ConstraintStore) | undefined) : Instance<typeof ConstraintStore> | undefined {
        if (store === undefined) {return;}
        self.constraints.push(store.create({uuid: uuidv4()}));
        console.log(self.asSavedPath());
        return self.constraints[self.constraints.length - 1];
        
      }
    }
  })
  .actions((self) => {
    return {
      fromSavedPath(path: SavedPath) {
        self.waypoints.clear();
        path.waypoints.forEach((point: SavedWaypoint, index: number): void => {
          let waypoint = this.addWaypoint();
          waypoint.fromSavedWaypoint(point);
        });
        path.constraints.forEach((saved: SavedConstraint) => {
            let constraintStore = ConstraintStores[saved.type];
            if (constraintStore !== undefined) {
              let constraint = self.addConstraint(constraintStore) as Instance<typeof ConstraintStore>;
              if (typeof saved.scope === "number") { 
                let scopeIndex = saved.scope;
                constraint.setScope(path.constraints[scopeIndex].uuid as string);
              }
              else if (typeof saved.scope?.start === "number") { 
                constraint.setScope({
                  start: path.constraints[saved.scope.start].uuid as string,
                  end: path.constraints[saved.scope.start].uuid as string
                });
              }
              else if (saved.scope == null) {
                // do nothing
              }
            }
        })
        self.generated.clear();
        if (path.trajectory !== undefined && path.trajectory !== null) {
          path.trajectory.forEach((savedSample, index) => {
            let sample = TrajectorySampleStore.create();
            sample.fromSavedTrajectorySample(savedSample);
            self.generated.push(sample);
          });
        }
      },
      setName(name: string) {
        self.name = name;
      },
      selectOnly(selectedIndex: number) {
        self.waypoints.forEach((point, index) => {
          point.setSelected(selectedIndex == index);
        });
      },
      addWaypoint(): IHolonomicWaypointStore {
        self.waypoints.push(HolonomicWaypointStore.create({ uuid: uuidv4() }));
        if (self.waypoints.length === 1) {
          const root = getRoot<IStateStore>(self);
          root.select(self.waypoints[0]);
        }
        return self.waypoints[self.waypoints.length - 1];
      },
      deleteWaypoint(index: number) {
        destroy(self.waypoints[index]);
        if (self.waypoints.length === 0) {
          self.generated.length = 0;
          return;
        } else if (self.waypoints[index - 1]) {
          self.waypoints[index - 1].setSelected(true);
        } else if (self.waypoints[index + 1]) {
          self.waypoints[index + 1].setSelected(true);
        }
      },
      deleteWaypointUUID(uuid: string) {
        let index = self.waypoints.findIndex((point) => point.uuid === uuid);
        if (index == -1) return;
        const root = getRoot<IStateStore>(self);
        root.select(undefined);

        if (self.waypoints.length === 1) {
          self.generated.length = 0;
        } else if (self.waypoints[index - 1]) {
          self.waypoints[index - 1].setSelected(true);
        } else if (self.waypoints[index + 1]) {
          self.waypoints[index + 1].setSelected(true);
        }
        destroy(self.waypoints[index]);
      },

      deleteConstraint(index: number) {
        destroy(self.constraints[index]);
        if (self.constraints.length === 0) {
          return;
        } else if (self.constraints[index - 1]) {
          self.constraints[index - 1].setSelected(true);
        } else if (self.constraints[index + 1]) {
          self.constraints[index + 1].setSelected(true);
        }
      },
      deleteConstraintUUID(uuid: string) {
        let index = self.constraints.findIndex((point) => point.uuid === uuid);
        if (index == -1) return;
        const root = getRoot<IStateStore>(self);
        root.select(undefined);

        if (self.constraints.length === 1) {
        } else if (self.constraints[index - 1]) {
          self.constraints[index - 1].setSelected(true);
        } else if (self.constraints[index + 1]) {
          self.constraints[index + 1].setSelected(true);
        }
        destroy(self.constraints[index]);
      },

      reorder(startIndex: number, endIndex: number) {
        moveItem(self.waypoints, startIndex, endIndex);
      },
      setTrajectory(trajectory: Array<SavedTrajectorySample>) {
        // @ts-ignore
        self.generated = trajectory;
        const history = getRoot<IStateStore>(self).document.history;
        history.withoutUndo(() => {
          self.generating = false;
        });
      },
      setGenerating(generating: boolean) {
        const history = getRoot<IStateStore>(self).document.history;
        history.withoutUndo(() => {
          self.generating = generating;
        });
      },
    };
  });
export interface IHolonomicPathStore
  extends Instance<typeof HolonomicPathStore> {}
