import { Instance, types, getRoot, destroy } from "mobx-state-tree";
import {
  SavedConstraint,
  SavedPath,
  SavedTrajectorySample,
  SavedWaypoint
} from "./DocumentSpecTypes";
import {
  HolonomicWaypointStore,
  IHolonomicWaypointStore
} from "./HolonomicWaypointStore";
import { moveItem } from "mobx-utils";
import { v4 as uuidv4, v4 } from "uuid";
import { IStateStore } from "./DocumentModel";
import {
  ConstraintStore,
  ConstraintStores,
  IConstraintStore,
  IWaypointScope,
  WaypointID,
  WaypointScope
} from "./ConstraintStore";
import { SavedWaypointId } from "./previousSpecs/v0_1_2";
import { IRobotConfigStore } from "./RobotConfigStore";
import {
  CircularObstacleStore,
  ICircularObstacleStore
} from "./CircularObstacleStore";
import { angleModulus } from "../util/MathUtil";

export const HolonomicPathStore = types
  .model("HolonomicPathStore", {
    name: "",
    uuid: types.identifier,
    waypoints: types.array(HolonomicWaypointStore),
    visibleWaypointsStart: types.number,
    visibleWaypointsEnd: types.number,
    constraints: types.array(types.union(...Object.values(ConstraintStores))),
    generated: types.frozen<Array<SavedTrajectorySample>>([]),
    generating: false,
    usesControlIntervalGuessing: true,
    defaultControlIntervalCount: 40,
    usesDefaultObstacles: true,
    obstacles: types.array(CircularObstacleStore)
  })
  .views((self) => {
    return {
      findUUIDIndex(uuid: string) {
        return self.waypoints.findIndex((wpt) => wpt.uuid === uuid);
      }
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
        const trajectory: Array<SavedTrajectorySample> = self.generated;
        // constraints are converted here because of the need to search the path for uuids
        return {
          waypoints: self.waypoints.map((point) => point.asSavedWaypoint()),
          trajectory: trajectory,
          constraints: self.constraints.flatMap((constraint) => {
            const waypointIdToSavedWaypointId = (
              waypointId: IWaypointScope
            ): "first" | "last" | number | undefined => {
              if (typeof waypointId !== "string") {
                const scopeIndex = self.findUUIDIndex(waypointId.uuid);
                if (scopeIndex == -1) {
                  return undefined; // don't try to save this constraint
                }
                return scopeIndex;
              } else {
                return waypointId;
              }
            };
            const con = constraint;
            const scope = con.scope.map((id: IWaypointScope) =>
              waypointIdToSavedWaypointId(id)
            );
            if (scope?.includes(undefined)) return [];
            const toReturn = {
              ...constraint,
              type: constraint.type,
              scope
            };
            delete toReturn.icon;
            delete toReturn.definition;
            delete toReturn.uuid;
            return toReturn;
          }),
          usesControlIntervalGuessing: self.usesControlIntervalGuessing,
          defaultControlIntervalCount: self.defaultControlIntervalCount,
          usesDefaultFieldObstacles: true,
          circleObstacles: self.obstacles.map((obstacle) =>
            obstacle.asSavedCircleObstacle()
          )
        };
      },
      lowestSelectedPoint(): IHolonomicWaypointStore | null {
        for (const point of self.waypoints) {
          if (point.selected) return point;
        }
        return null;
      }
    };
  })
  .views((self) => {
    return {
      waypointTimestamps(): number[] {
        const wptTimes: number[] = [];
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
        const savedPath = self.asSavedPath();
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
      stopPointIndices() {
        const stopPoints = self.constraints.filter(
          (c) => c.type === "StopPoint"
        );
        return stopPoints.length > 1
          ? stopPoints
              .flatMap((c: IConstraintStore) => {
                const scope = c.scope.at(0);
                if (scope === undefined) {
                  return 0;
                } else if (scope === "first") {
                  return 0;
                } else if (scope === "last") {
                  return self.waypoints.length - 1;
                } else {
                  return self.findUUIDIndex(scope.uuid);
                }
              })
              .flatMap((w) =>
                self.waypoints
                  .slice(0, w)
                  .flatMap((w) => w.controlIntervalCount)
                  .reduce((sum, num) => sum + num, 0)
              )
              .sort((a, b) => a - b)
              // remove duplicates
              .filter((item, pos, ary) => !pos || item != ary[pos - 1])
          : [0, undefined];
      }
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
      }
    };
  })
  .actions((self) => {
    return {
      setVisibleWaypointsStart(start: number) {
        if (start <= self.visibleWaypointsEnd) {
          self.visibleWaypointsStart = start;
        }
      },
      setVisibleWaypointsEnd(end: number) {
        if (end >= self.visibleWaypointsStart) {
          self.visibleWaypointsEnd = end;
        }
      },
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

        // Initialize waypoints
        if (typeof self.visibleWaypointsStart === "undefined") {
          this.setVisibleWaypointsStart(0);
          this.setVisibleWaypointsEnd(0);
        }

        // Make the new waypoint visible by default if the (now) penultimate waypoint is already visible
        if (self.visibleWaypointsEnd === self.waypoints.length - 2) {
          this.setVisibleWaypointsEnd(self.waypoints.length - 1);
        }

        return self.waypoints[self.waypoints.length - 1];
      },
      deleteWaypoint(index: number) {
        if (self.waypoints[index] === undefined) {
          return;
        }
        const uuid = self.waypoints[index]?.uuid;
        const root = getRoot<IStateStore>(self);
        root.select(undefined);

        // clean up constraints
        self.constraints = self.constraints.flatMap(
          (constraint: IConstraintStore) => {
            const scope = constraint.getSortedScope();
            // delete waypoint-scope referencing deleted point directly.
            if (
              scope.length == 1 &&
              scope[0] instanceof Object &&
              Object.hasOwn(scope[0], "uuid") &&
              scope[0].uuid === uuid
            ) {
              return [];
            }
            // delete zero-segment-scope referencing deleted point directly.
            if (scope.length == 2) {
              const deletedIndex = index;
              const firstIsUUID =
                scope[0] instanceof Object && Object.hasOwn(scope[0], "uuid");
              const secondIsUUID =
                scope[1] instanceof Object && Object.hasOwn(scope[1], "uuid");
              let startIndex = constraint.getStartWaypointIndex();
              let endIndex = constraint.getEndWaypointIndex();
              // start/end index being undefined, given that scope is length2, means that
              // the constraint refers to an already-missing waypoint. Skip these and let the user
              // retarget them.

              if (startIndex === undefined || endIndex === undefined) {
                return constraint;
              }
              // Delete zero-length segments that refer directly and only to the waypoint
              if (
                startIndex == deletedIndex &&
                endIndex == deletedIndex &&
                (firstIsUUID || secondIsUUID)
              ) {
                return [];
              }
              // deleted start? move new start forward till first constrainable waypoint
              if (deletedIndex == startIndex && firstIsUUID) {
                while (startIndex < endIndex) {
                  startIndex++;
                  if (self.waypoints[startIndex].isConstrainable()) {
                    break;
                  }
                }
              } else if (deletedIndex == endIndex && secondIsUUID) {
                // deleted end? move new end backward till first constrainable waypoint
                while (startIndex < endIndex) {
                  endIndex--;
                  if (self.waypoints[endIndex].isConstrainable()) {
                    break;
                  }
                }
              }
              // if we shrunk to a single point and the constraint can't be wpt scope, delete constraint
              if (
                !constraint.definition.wptScope &&
                endIndex == startIndex &&
                firstIsUUID &&
                secondIsUUID
              ) {
                return [];
              } else {
                // update
                constraint.setScope([
                  firstIsUUID
                    ? { uuid: self.waypoints[startIndex].uuid }
                    : scope[0],
                  secondIsUUID
                    ? { uuid: self.waypoints[endIndex].uuid }
                    : scope[1]
                ]);
                return constraint;
              }
            }
            return constraint;
          }
        ) as typeof self.constraints;

        destroy(self.waypoints[index]);
        if (self.waypoints.length === 0) {
          self.generated = [];
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
        const index = self.constraints.findIndex(
          (point) => point.uuid === uuid
        );
        if (index == -1) return;
        const root = getRoot<IStateStore>(self);
        root.select(undefined);

        if (self.constraints.length === 1) {
          // no-op
        } else if (self.constraints[index - 1]) {
          self.constraints[index - 1].setSelected(true);
        } else if (self.constraints[index + 1]) {
          self.constraints[index + 1].setSelected(true);
        }
        destroy(self.constraints[index]);
      },
      deleteObstacle(index: number) {
        destroy(self.obstacles[index]);
        if (self.obstacles.length === 0) {
          return;
        } else if (self.obstacles[index - 1]) {
          self.obstacles[index - 1].setSelected(true);
        } else if (self.obstacles[index + 1]) {
          self.obstacles[index + 1].setSelected(true);
        }
      },
      deleteObstacleUUID(uuid: string) {
        const index = self.obstacles.findIndex(
          (obstacle) => obstacle.uuid === uuid
        );
        if (index == -1) return;
        const root = getRoot<IStateStore>(self);
        root.select(undefined);

        if (self.obstacles.length === 1) {
          // no-op
        } else if (self.obstacles[index - 1]) {
          self.obstacles[index - 1].setSelected(true);
        } else if (self.obstacles[index + 1]) {
          self.obstacles[index + 1].setSelected(true);
        }
        destroy(self.obstacles[index]);
      },
      reorder(startIndex: number, endIndex: number) {
        moveItem(self.waypoints, startIndex, endIndex);
      },
      setTrajectory(trajectory: Array<SavedTrajectorySample>) {
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
      fixWaypointHeadings() {
        let fullRots = 0;
        let prevHeading = 0;
        self.waypoints.forEach((point, i, pts) => {
          if (i == 0) {
            prevHeading = point.heading;
          } else {
            if (point.headingConstrained && !point.isInitialGuess) {
              const prevHeadingMod = angleModulus(prevHeading);
              const heading = pts[i].heading;
              const headingMod = angleModulus(heading);
              if (prevHeadingMod < 0 && headingMod > prevHeadingMod + Math.PI) {
                // negative rollunder
                fullRots--;
              } else if (
                prevHeadingMod > 0 &&
                headingMod < prevHeadingMod - Math.PI
              ) {
                // positive rollover
                fullRots++;
              }
              point.heading = fullRots * 2 * Math.PI + headingMod;
              prevHeading = point.heading;
            }
          }
        });
      }
    };
  })
  .actions((self) => {
    return {
      deleteWaypointUUID(uuid: string) {
        const index = self.waypoints.findIndex((point) => point.uuid === uuid);
        if (index == -1) return;
        self.deleteWaypoint(index);
      },
      fromSavedPath(savedPath: SavedPath) {
        self.waypoints.clear();
        savedPath.waypoints.forEach(
          (point: SavedWaypoint, index: number): void => {
            const waypoint = self.addWaypoint();
            waypoint.fromSavedWaypoint(point);
          }
        );
        self.constraints.clear();
        savedPath.constraints.forEach((saved: SavedConstraint) => {
          const constraintStore = ConstraintStores[saved.type];
          if (constraintStore !== undefined) {
            const savedWaypointIdToWaypointId = (savedId: SavedWaypointId) => {
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
            const scope = saved.scope.map((id) =>
              savedWaypointIdToWaypointId(id)
            );
            if (scope.includes(undefined)) {
              return; // don't attempt to load
            }
            const constraint = self.addConstraint(
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
                  const upperCaseName = key[0].toUpperCase() + key.slice(1);
                  constraint[`set${upperCaseName}`](saved[key]);
                }
              }
            );
          }
        });
        self.obstacles.clear();
        savedPath.circleObstacles.forEach((o) => {
          this.addObstacle(
            CircularObstacleStore.create({
              x: o.x,
              y: o.y,
              radius: o.radius,
              uuid: v4()
            })
          );
        });
        if (
          savedPath.trajectory !== undefined &&
          savedPath.trajectory !== null
        ) {
          self.generated = savedPath.trajectory;
        }

        self.usesControlIntervalGuessing =
          savedPath.usesControlIntervalGuessing;
        self.defaultControlIntervalCount =
          savedPath.defaultControlIntervalCount;
      },
      addObstacle(obstacle: ICircularObstacleStore) {
        self.obstacles.push(obstacle);
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
        for (let i = 0; i < self.waypoints.length; i++) {
          self.waypoints
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
        for (let i = 0; i < self.waypoints.length - 1; i++) {
          this.guessControlIntervalCount(i, robotConfig);
        }
        self.waypoints
          .at(self.waypoints.length - 1)
          ?.setControlIntervalCount(self.defaultControlIntervalCount);
      },
      guessControlIntervalCount(i: number, robotConfig: IRobotConfigStore) {
        const dx = self.waypoints.at(i + 1)!.x - self.waypoints.at(i)!.x;
        const dy = self.waypoints.at(i + 1)!.y - self.waypoints.at(i)!.y;
        const dtheta =
          self.waypoints.at(i + 1)!.heading - self.waypoints.at(i)!.heading;
        const headingWeight = 0.5; // arbitrary
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxForce = robotConfig.wheelMaxTorque / robotConfig.wheelRadius;
        const maxAccel = (maxForce * 4) / robotConfig.mass; // times 4 for 4 modules
        const maxVel = robotConfig.wheelMaxVelocity * robotConfig.wheelRadius;
        const distanceAtCruise = distance - (maxVel * maxVel) / maxAccel;
        if (distanceAtCruise < 0) {
          // triangle
          let totalTime = 2 * (Math.sqrt(distance * maxAccel) / maxAccel);
          totalTime += headingWeight * Math.abs(dtheta);
          self.waypoints
            .at(i)
            ?.setControlIntervalCount(Math.ceil(totalTime / 0.1));
        } else {
          // trapezoid
          let totalTime = distance / maxVel + maxVel / maxAccel;
          totalTime += headingWeight * Math.abs(dtheta);
          self.waypoints
            .at(i)
            ?.setControlIntervalCount(Math.ceil(totalTime / 0.1));
        }
      }
    };
  });
export interface IHolonomicPathStore
  extends Instance<typeof HolonomicPathStore> {}
