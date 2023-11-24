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
  WaypointScope,
} from "./ConstraintStore";
import { SavedWaypointId } from "./previousSpecs/v0_1";
import { timeStamp } from "console";
import { IRobotConfigStore } from "./RobotConfigStore";

export const HolonomicPathStore = types
  .model("HolonomicPathStore", {
    name: "",
    uuid: types.identifier,
    waypoints: types.array(HolonomicWaypointStore),
    constraints: types.array(types.union(...Object.values(ConstraintStores))),
    generated: types.array(TrajectorySampleStore),
    generating: false,
    usesControlIntervalGuessing: true,
    defaultControlIntervalCount: 40,
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
      get nonGuessOrEmptyPoints() {
        return self.waypoints.filter(
          (waypoint) => !waypoint.isInitialGuess && !(waypoint.type == 2)
        );
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
            let con = constraint;
            let scope = con.scope.map((id: IWaypointScope) =>
              waypointIdToSavedWaypointId(id)
            );
            if (scope?.includes(undefined)) return [];
            let toReturn = {
              ...constraint,
              type: constraint.type,
              scope,
            };
            delete toReturn.icon;
            delete toReturn.definition;
            return toReturn;
          }),
          usesControlIntervalGuessing: self.usesControlIntervalGuessing,
          defaultControlIntervalCount: self.defaultControlIntervalCount,
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
      waypointTimestamps(): number[] {
        let wptTimes: number[] = [];
        if (self.generated.length > 0) {
          let currentInterval = 0;
          self.waypoints.forEach((w) => {
            if (self.generated.at(currentInterval)?.timestamp !== undefined) {
              wptTimes.push(self.generated.at(currentInterval)!.timestamp);
              currentInterval += w.controlIntervalCount;
            }
          });
        }
        return wptTimes;
      },
      asSolverPath() {
        let savedPath = self.asSavedPath();
        let originalGuessIndices: number[] = [];
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
        store: typeof ConstraintStore | undefined,
        scope?: Array<Instance<typeof WaypointScope>>
      ): Instance<typeof ConstraintStore> | undefined {
        if (store === undefined) {
          return;
        }
        if (scope === undefined) {
          self.constraints.push(store.create({ uuid: uuidv4() }));
        } else {
          self.constraints.push(store.create({ uuid: uuidv4(), scope }));
        }
        return self.constraints[self.constraints.length - 1];
      },
    };
  })
  .actions((self) => {
    return {
      setControlIntervalGuessing(value: boolean) {
        self.usesControlIntervalGuessing = value;
      },
      setDefaultControlIntervalCounts(counts: number) {
        self.defaultControlIntervalCount = counts;
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
        if (self.waypoints[index] === undefined) {
          return;
        }
        let uuid = self.waypoints[index]?.uuid;
        console.log(uuid);
        const root = getRoot<IStateStore>(self);
        root.select(undefined);
        destroy(self.waypoints[index]);
        // clean up 
        self.constraints = self.constraints.flatMap((constraint) => {
          // delete waypoint-scope referencing deleted point directly.
          if (constraint.scope.length == 1 && Object.hasOwn(constraint.scope[0],"uuid") && constraint.scope[0].uuid === uuid) {
            return [];
          }
          // delete zero-segment-scope referencing deleted point directly.
          if (constraint.scope.length == 2 && 
            Object.hasOwn(constraint.scope[0],"uuid") && constraint.scope[0].uuid === uuid &&
            Object.hasOwn(constraint.scope[1],"uuid") && constraint.scope[1].uuid === uuid
            ) {
            return [];
          }
          return constraint;
        }) as typeof self.constraints;
        if (self.waypoints.length === 0) {
          self.generated.length = 0;
          return;
        } else if (self.waypoints[index - 1]) {
          self.waypoints[index - 1].setSelected(true);
        } else if (self.waypoints[index + 1]) {
          self.waypoints[index + 1].setSelected(true);
        }
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
      deleteWaypointUUID(uuid: string) {
        let index = self.waypoints.findIndex((point) => point.uuid === uuid);
        if (index == -1) return;
        self.deleteWaypoint(index);
      },
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
            let savedWaypointIdToWaypointId = (savedId: SavedWaypointId) => {
              if (savedId === null || savedId === undefined) {
                return undefined;
              }

              if (savedId === "first") {
                return "first";
              }
              if (savedId === "last") {
                return "last";
              }
              if (savedId < 0 || savedId >= self.waypoints.length) {
                return undefined;
              }
              if (!Number.isInteger(savedId)) {
                return undefined;
              } else {
                return { uuid: self.waypoints[savedId]?.uuid as string };
              }
            };
            let scope = saved.scope.map((id) =>
              savedWaypointIdToWaypointId(id)
            );
            if (scope.includes(undefined)) {
              return; // don't attempt to load
            }
            let constraint = self.addConstraint(
              constraintStore,
              scope as WaypointID[]
            );

            Object.keys(constraint?.definition.properties ?? {}).forEach(
              (key) => {
                if (
                  Object.hasOwn(saved, key) &&
                  typeof saved[key] === "number" &&
                  key.length >= 1
                ) {
                  let upperCaseName = key[0].toUpperCase() + key.slice(1);
                  //@ts-ignore
                  constraint[`set${upperCaseName}`](saved[key]);
                }
              }
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
        self.usesControlIntervalGuessing =
          savedPath.usesControlIntervalGuessing;
        self.defaultControlIntervalCount =
          savedPath.defaultControlIntervalCount;
      },
      optimizeControlIntervalCounts(
        robotConfig: IRobotConfigStore
      ): string | undefined {
        if (self.usesControlIntervalGuessing) {
          return this.guessControlIntervalCounts(robotConfig);
        } else {
          return this.defaultControlIntervalCounts(robotConfig);
        }
      },
      defaultControlIntervalCounts(
        robotConfig: IRobotConfigStore
      ): string | undefined {
        for (let i = 0; i < self.nonGuessPoints.length; i++) {
          self.nonGuessPoints
            .at(i)
            ?.setControlIntervalCount(self.defaultControlIntervalCount);
        }
        return;
      },
      guessControlIntervalCounts(
        robotConfig: IRobotConfigStore
      ): string | undefined {
        if (robotConfig.wheelMaxTorque == 0) {
          return "Wheel max torque may not be 0";
        } else if (robotConfig.wheelMaxVelocity == 0) {
          return "Wheel max velocity may not be 0";
        } else if (robotConfig.mass == 0) {
          return "Robot mass may not be 0";
        } else if (robotConfig.wheelRadius == 0) {
          return "Wheel radius may not be 0";
        }
        for (let i = 0; i < self.nonGuessPoints.length - 1; i++) {
          this.guessControlIntervalCount(i, robotConfig);
        }
        self.nonGuessPoints
          .at(self.nonGuessPoints.length - 1)
          ?.setControlIntervalCount(self.defaultControlIntervalCount);
      },
      guessControlIntervalCount(i: number, robotConfig: IRobotConfigStore) {
        let dx =
          self.nonGuessPoints.at(i + 1)!.x - self.nonGuessPoints.at(i)!.x;
        let dy =
          self.nonGuessPoints.at(i + 1)!.y - self.nonGuessPoints.at(i)!.y;
        let dtheta =
          self.nonGuessPoints.at(i + 1)!.heading -
          self.nonGuessPoints.at(i)!.heading;
        const headingWeight = 0.5; // arbitrary
        let distance = Math.sqrt(dx * dx + dy * dy);
        let maxForce = robotConfig.wheelMaxTorque / robotConfig.wheelRadius;
        let maxAccel = (maxForce * 4) / robotConfig.mass; // times 4 for 4 modules
        let maxVel = robotConfig.wheelMaxVelocity * robotConfig.wheelRadius;
        let distanceAtCruise = distance - (maxVel * maxVel) / maxAccel;
        if (distanceAtCruise < 0) {
          // triangle
          let totalTime = 2 * (Math.sqrt(distance * maxAccel) / maxAccel);
          totalTime += headingWeight * Math.abs(dtheta);
          self.nonGuessPoints
            .at(i)
            ?.setControlIntervalCount(Math.ceil(totalTime / 0.1));
        } else {
          // trapezoid
          let totalTime = distance / maxVel + maxVel / maxAccel;
          totalTime += headingWeight * Math.abs(dtheta);
          self.nonGuessPoints
            .at(i)
            ?.setControlIntervalCount(Math.ceil(totalTime / 0.1));
        }
        console.log(self.nonGuessPoints.at(i)?.controlIntervalCount);
      },
    };
  });
export interface IHolonomicPathStore
  extends Instance<typeof HolonomicPathStore> {}
