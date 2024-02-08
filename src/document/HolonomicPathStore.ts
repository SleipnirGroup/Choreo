import { Instance, types, getRoot, destroy } from "mobx-state-tree";
import {
  SavedConstraint,
  SavedEventMarker,
  SavedGeneratedWaypoint,
  SavedPath,
  SavedTrajectorySample,
  SavedWaypoint,
} from "./DocumentSpecTypes";
import {
  HolonomicWaypointStore,
  IHolonomicWaypointStore,
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
  WaypointScope,
} from "./ConstraintStore";
import { SavedWaypointId } from "./previousSpecs/v0_1_2";
import { IRobotConfigStore } from "./RobotConfigStore";
import {
  CircularObstacleStore,
  ICircularObstacleStore,
} from "./CircularObstacleStore";
import { angleModulus } from "../util/MathUtil";
import {
  CommandStore,
  EventMarkerStore,
  IEventMarkerStore,
} from "./EventMarkerStore";
import { autorun, toJS } from "mobx";

export const HolonomicPathStore = types
  .model("HolonomicPathStore", {
    name: "",
    uuid: types.identifier,
    waypoints: types.array(HolonomicWaypointStore),
    constraints: types.array(types.union(...Object.values(ConstraintStores))),
    generated: types.frozen<Array<SavedTrajectorySample>>([]),
    generatedWaypoints: types.frozen<Array<SavedGeneratedWaypoint>>([]),
    generating: false,
    isTrajectoryStale: true,
    usesControlIntervalGuessing: true,
    defaultControlIntervalCount: 40,
    usesDefaultObstacles: true,
    obstacles: types.array(CircularObstacleStore),
    eventMarkers: types.array(EventMarkerStore),
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
      waypointIdToSavedWaypointId(
        waypointId: IWaypointScope
      ): "first" | "last" | number | undefined {
        if (typeof waypointId !== "string") {
          let scopeIndex = self.findUUIDIndex(waypointId.uuid);
          if (scopeIndex == -1) {
            return undefined; // don't try to save this constraint
          }
          return scopeIndex;
        } else {
          return waypointId;
        }
      },
      savedWaypointIdToWaypointId(savedId: SavedWaypointId) {
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
        let trajectory: Array<SavedTrajectorySample> = self.generated;
        // constraints are converted here because of the need to search the path for uuids
        return {
          waypoints: self.waypoints.map((point) => point.asSavedWaypoint()),
          trajectory: trajectory,
          trajectoryWaypoints: self.generatedWaypoints,
          constraints: self.constraints.flatMap((constraint) => {
            let con = constraint;
            let scope = con.scope.map((id: IWaypointScope) =>
              self.waypointIdToSavedWaypointId(id)
            );
            if (scope?.includes(undefined)) return [];
            let toReturn = {
              ...constraint,
              type: constraint.type,
              scope,
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
          ),
          eventMarkers: self.eventMarkers.flatMap((marker) => {
            let target = self.waypointIdToSavedWaypointId(marker.target);
            if (target === undefined) return [];
            let saved: SavedEventMarker = {
              name: marker.name,
              target,
              targetTimestamp: marker.targetTimestamp,
              offset: marker.offset,
              command: marker.command.asSavedCommand(),
            };

            return [saved];
          }),
          isTrajectoryStale: self.isTrajectoryStale
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
      stopPoints() {
        const stopPoints = self.constraints.filter(
          (c) => c.type === "StopPoint"
        );
        const wptIndices = stopPoints
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
          .filter((item, pos, ary) => !pos || item != ary[pos - 1])
          .sort((a, b) => a - b);
        console.log(wptIndices);
        return wptIndices;
        // remove duplicates
      },
      stopPointIndices() {
        const stopPoints = this.stopPoints();
        return stopPoints.length > 1
          ? stopPoints
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
      },
      splitTrajectories() {
        let trajectories = [];
        const split = this.stopPointIndices();
        for (let i = 1; i < split.length; i++) {
          const prev = split[i - 1];
          let cur = split[i];
          // If we don't go to the end of trajectory, add 1 to include the end stop point
          if (cur !== undefined) {
            cur += 1;
          }
          let traj = self.generated.slice(prev, cur).map((s) => {
            return { ...s };
          });
          if (traj === undefined) {
            throw `Could not split segment from ${prev} to ${cur} given ${self.generated.length} samples`;
          }
          if (traj.length === 0) {
            continue;
          }
          const startTime = traj[0].timestamp;
          const endTime = traj[traj.length - 1].timestamp;
          for (let i = 0; i < traj.length; i++) {
            const e = traj[i];
            e.timestamp -= startTime;
          }
          let splitEventMarkers = self.eventMarkers
            .filter(
              (m) =>
                m.targetTimestamp !== undefined &&
                m.targetTimestamp >= startTime &&
                m.targetTimestamp <= endTime &&
                m.timestamp !== undefined &&
                m.timestamp >= startTime &&
                m.timestamp <= endTime
            )
            .map((m) => ({
              name: m.name,
              timestamp: m.timestamp! - startTime,
              command: m.command.asSavedCommand(),
            }));
          trajectories.push({ samples: traj, eventMarkers: splitEventMarkers });
        }
        return trajectories;
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
      setIsTrajectoryStale(isTrajectoryStale: boolean) {
        self.isTrajectoryStale = isTrajectoryStale;
      },
      setGeneratedWaypoints(waypoints: Array<SavedGeneratedWaypoint>) {
        self.generatedWaypoints = waypoints;
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
        return self.waypoints[self.waypoints.length - 1];
      },
      deleteWaypoint(index: number) {
        if (self.waypoints[index] === undefined) {
          return;
        }
        let uuid = self.waypoints[index]?.uuid;
        const root = getRoot<IStateStore>(self);
        root.select(undefined);

        // clean up constraints
        self.constraints = self.constraints.flatMap((constraint) => {
          let scope = constraint.getSortedScope();
          // delete waypoint-scope referencing deleted point directly.
          if (
            scope.length == 1 &&
            Object.hasOwn(scope[0], "uuid") &&
            scope[0].uuid === uuid
          ) {
            return [];
          }
          // delete zero-segment-scope referencing deleted point directly.
          if (scope.length == 2) {
            let deletedIndex = index;
            let firstIsUUID = Object.hasOwn(scope[0], "uuid");
            let secondIsUUID = Object.hasOwn(scope[1], "uuid");
            let startIndex = constraint.getStartWaypointIndex();
            let endIndex = constraint.getEndWaypointIndex();
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
            // if we shrunk to a single point, delete constraint
            if (endIndex == startIndex && firstIsUUID && secondIsUUID) {
              return [];
            } else {
              // update
              constraint.scope = [
                firstIsUUID
                  ? { uuid: self.waypoints[startIndex].uuid }
                  : scope[0],
                secondIsUUID
                  ? { uuid: self.waypoints[endIndex].uuid }
                  : scope[1],
              ];
              return constraint;
            }
          }
          return constraint;
        }) as typeof self.constraints;

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
      deleteMarkerUUID(uuid: string) {
        let index = self.eventMarkers.findIndex((m) => m.uuid === uuid);
        if (index >= 0 && index < self.eventMarkers.length) {
          destroy(self.eventMarkers[index]);
          if (self.eventMarkers.length === 0) {
            return;
          } else if (self.eventMarkers[index - 1]) {
            self.eventMarkers[index - 1].setSelected(true);
          } else if (self.eventMarkers[index + 1]) {
            self.eventMarkers[index + 1].setSelected(true);
          }
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
        let index = self.obstacles.findIndex(
          (obstacle) => obstacle.uuid === uuid
        );
        if (index == -1) return;
        const root = getRoot<IStateStore>(self);
        root.select(undefined);

        if (self.obstacles.length === 1) {
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
      fixWaypointHeadings() {
        let fullRots = 0;
        let prevHeading = 0;
        self.waypoints.forEach((point, i, pts) => {
          if (i == 0) {
            prevHeading = point.heading;
          } else {
            if (point.headingConstrained && !point.isInitialGuess) {
              let prevHeadingMod = angleModulus(prevHeading);
              let heading = pts[i].heading;
              let headingMod = angleModulus(heading);
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
            let scope = saved.scope.map((id) =>
              self.savedWaypointIdToWaypointId(id)
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
        self.obstacles.clear();
        savedPath.circleObstacles.forEach((o) => {
          this.addObstacle(
            CircularObstacleStore.create({
              x: o.x,
              y: o.y,
              radius: o.radius,
              uuid: v4(),
            })
          );
        });
        if (
          savedPath.trajectory !== undefined &&
          savedPath.trajectory !== null
        ) {
          self.generated = savedPath.trajectory;
        }
        if (
          savedPath.trajectoryWaypoints !== undefined &&
          savedPath.trajectoryWaypoints !== null
        ) {
          self.generatedWaypoints = savedPath.trajectoryWaypoints;
        }
        self.isTrajectoryStale = savedPath.isTrajectoryStale ?? false;
        self.usesControlIntervalGuessing =
          savedPath.usesControlIntervalGuessing;
        self.defaultControlIntervalCount =
          savedPath.defaultControlIntervalCount;
        self.eventMarkers.clear();
        savedPath.eventMarkers.forEach((saved) => {
          let rootCommandType = saved.command.type;
          let target = self.savedWaypointIdToWaypointId(saved.target);
          let targetIndex = 0;
          if (saved.target === "last") {
            targetIndex = self.waypoints.length;
          } else if (saved.target === "first") {
            targetIndex = 0;
          } else {
            targetIndex = saved.target;
          }
          if (target === undefined) return;
          let marker = EventMarkerStore.create({
            name: saved.name,
            target: target as WaypointID,
            offset: saved.offset,
            trajTargetIndex: targetIndex,
            command: CommandStore.create({
              type: rootCommandType,
              name: "",
              commands: [],
              time: 0,
              uuid: uuidv4(),
            }),
            uuid: uuidv4(),
          });
          marker.command.fromSavedCommand(saved.command);
          this.addEventMarker(marker);
        });
      },
      addObstacle(obstacle: ICircularObstacleStore) {
        self.obstacles.push(obstacle);
      },
      addEventMarker(marker?: IEventMarkerStore) {
        if (marker === undefined) {
          marker = EventMarkerStore.create({
            name: "Marker",
            target: "first",
            trajTargetIndex: 0,
            offset: 0,
            command: CommandStore.create({
              type: "named",
              name: "",
              commands: [],
              time: 0,
              uuid: uuidv4(),
            }),
            uuid: uuidv4(),
          });
        }
        self.eventMarkers.push(marker);
        return marker;
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
        let dx = self.waypoints.at(i + 1)!.x - self.waypoints.at(i)!.x;
        let dy = self.waypoints.at(i + 1)!.y - self.waypoints.at(i)!.y;
        let dtheta =
          self.waypoints.at(i + 1)!.heading - self.waypoints.at(i)!.heading;
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
      },
    };
  })
  .actions(self=>({
    afterCreate() {
      // Anything accessed in here will cause the trajectory to be marked stale
      autorun(()=>{
        console.log(toJS(self.waypoints));
        console.log(toJS(self.constraints));
        // does not need toJS to do a deep check on this, since it's just a boolean
        console.log(self.usesControlIntervalGuessing);
        console.log(toJS(self.obstacles));
        self.setIsTrajectoryStale(true);
    })
    }
  }));
export interface IHolonomicPathStore
  extends Instance<typeof HolonomicPathStore> {}
