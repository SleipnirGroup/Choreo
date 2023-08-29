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
import {
  constraints,
  ConstraintStore,
  ConstraintStores,
  IWaypointScope,
  WaypointID,
} from "./ConstraintStore";
import { SavedWaypointId } from "./previousSpecs/v0_1";

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
        return self.waypoints.findIndex((wpt) => wpt.uuid === uuid);
      },
    };
  })
  .views((self) => {
    return {
      get nonGuessPoints() {
        return self.waypoints.filter((waypoint) => !waypoint.isInitialGuess);
      },
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
      getByWaypointID(id: WaypointID | IWaypointScope) {
        if (id === "first") {
          return self.waypoints[0];
        }
        if (id === "last") {
          return self.waypoints[self.waypoints.length - 1];
        }
        if (typeof id.uuid === "string") {
          return self.waypoints[self.findUUIDIndex(id.uuid)];
        }
      },
      asSavedPath(): SavedPath {
        let trajectory: Array<SavedTrajectorySample> | null = null;
        if (self.generated.length >= 2) {
          trajectory = self.generated.map((point) =>
            point.asSavedTrajectorySample()
          );
        }
        // constraints are converted here because of the need to search the path for uuids
        return {
          waypoints: self.waypoints.map((point) => point.asSavedWaypoint()),
          trajectory: trajectory,
          constraints: self.constraints.flatMap((constraint) => {
            let waypointIdToSavedWaypointId = (
              waypointId: IWaypointScope
            ): "first" | "last" | number | undefined => {
              if (typeof waypointId !== "string") {
                let scopeIndex = self.findUUIDIndex(waypointId.uuid);
                if (scopeIndex == -1) {
                  return undefined; // don't try to save this constraint
                }
                return scopeIndex;
              } else {
                return waypointId;
              }
            };
            let saved: Partial<SavedConstraint> = {};
            let con = constraint;
            saved.scope = con.scope.map((id: IWaypointScope) =>
              waypointIdToSavedWaypointId(id)
            );
            if (saved.scope?.includes(-1)) return [];
            return {
              ...constraint,
              type: constraint.type,
              scope: saved["scope"],
            };
          }),
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
  .views((self) => {
    return {
      asSolverPath() {
        let savedPath = self.asSavedPath();
        let originalGuessIndices: number[] = [];
        savedPath.waypoints.forEach((wpt, idx) => {
          if (wpt.isInitialGuess) {
            if (idx == 0) {
              throw new Error(
                "Cannot start a path with an initial guess point."
              );
            } else if (idx == savedPath.waypoints.length - 1) {
              throw new Error("Cannot end a path with an initial guess point.");
            }
          }
        });
        savedPath.constraints.forEach((constraint) => {
          constraint.scope = constraint.scope.map((id) => {
            if (typeof id === "number") {
              /* pass through, this if is for type narrowing*/
            } else if (id === "first") {
              id = 0;
            } else if (id === "last") {
              id = savedPath.waypoints.length - 1;
            }
            return id;
          });
          constraint.scope = constraint.scope.sort(
            (a, b) => (a as number) - (b as number)
          );
          // avoid zero-length segments by converting them to waypoint constraints.
          if (
            constraint.scope.length == 2 &&
            constraint.scope[0] == constraint.scope[1]
          ) {
            constraint.scope.length = 1;
          }
        });
        return savedPath;
      },
    };
  })
  .actions((self) => {
    return {
      addConstraint(
        store: typeof ConstraintStore | undefined
      ): Instance<typeof ConstraintStore> | undefined {
        if (store === undefined) {
          return;
        }
        self.constraints.push(store.create({ uuid: uuidv4() }));
        return self.constraints[self.constraints.length - 1];
      },
    };
  })
  .actions((self) => {
    return {
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
  })
  .actions((self) => {
    return {
      fromSavedPath(savedPath: SavedPath) {
        self.waypoints.clear();
        savedPath.waypoints.forEach(
          (point: SavedWaypoint, index: number): void => {
            let waypoint = self.addWaypoint();
            waypoint.fromSavedWaypoint(point);
          }
        );
        self.constraints.clear();
        savedPath.constraints.forEach((saved: SavedConstraint) => {
          let constraintStore = ConstraintStores[saved.type];
          if (constraintStore !== undefined) {
            let constraint = self.addConstraint(constraintStore) as Instance<
              typeof ConstraintStore
            >;
            let savedWaypointIdToWaypointId = (savedId: SavedWaypointId) => {
              if (savedId === "first") {
                return "first";
              } else if (savedId === "last") {
                return "last";
              } else {
                return { uuid: self.waypoints[savedId].uuid as string };
              }
            };
            constraint.setScope(
              saved.scope.map((id) => savedWaypointIdToWaypointId(id))
            );
          }
        });
        self.generated.clear();
        if (
          savedPath.trajectory !== undefined &&
          savedPath.trajectory !== null
        ) {
          savedPath.trajectory.forEach((savedSample, index) => {
            let sample = TrajectorySampleStore.create();
            sample.fromSavedTrajectorySample(savedSample);
            self.generated.push(sample);
          });
        }
      },
    };
  });
export interface IHolonomicPathStore
  extends Instance<typeof HolonomicPathStore> {}
