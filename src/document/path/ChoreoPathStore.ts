import { Instance, destroy, getEnv, types } from "mobx-state-tree";
import {
  DEFAULT_WAYPOINT,
  HolonomicWaypointStore, IHolonomicWaypointStore} from "../HolonomicWaypointStore";
import {
  ConstraintStore,
  IConstraintStore,
  IWaypointScope,
  
  WaypointScope} from "../ConstraintStore";
import { SavedWaypointId } from "../previousSpecs/v0_1_2";
import {
  CircularObstacleStore} from "../CircularObstacleStore";
import { ChoreoPath, Expr, RobotConfig, Waypoint, Constraint, WaypointID } from "../2025/DocumentTypes";
import { moveItem } from "mobx-utils";
import { angleModulus } from "../../util/MathUtil";
import { IRobotConfigStore } from "../RobotConfigStore";

export const ChoreoPathStore = types.model("ChoreoPathStore", {
    waypoints: types.array(HolonomicWaypointStore),
    constraints: types.array(ConstraintStore),
    obstacles: types.array(CircularObstacleStore)
  })
.views(self=> ({
  findUUIDIndex(uuid: string) {
    return self.waypoints.findIndex((wpt) => wpt.uuid === uuid);
  }
})).views(self => ({
  waypointIdToSavedWaypointId(
    waypointId: IWaypointScope | undefined
  ): "first" | "last" | number | undefined {
    if (waypointId === null || waypointId === undefined) {
      return undefined;
    }
    if (typeof waypointId !== "string") {
      const scopeIndex = self.findUUIDIndex(waypointId.uuid);
      if (scopeIndex == -1) {
        return undefined; // don't try to save this constraint
      }
      return scopeIndex;
    } else {
      return waypointId;
    }
  },
  savedWaypointIdToWaypointId(savedId: WaypointID|undefined) : IWaypointScope | undefined {
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
  }
})).views(self=>({
    getByWaypointID(id: IWaypointScope) {
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
    get nonGuessPoints() {
      return self.waypoints.filter((waypoint) => !(waypoint.type == 2));
    },
    get nonGuessOrEmptyPoints() {
      return self.waypoints.filter(
        (waypoint) => (waypoint.type == 2)
      );
    },
})).views(self=>({
  serialize(): ChoreoPath<Expr> {
    return {
      waypoints: self.waypoints.map(w=>w.serialize()),
      constraints: self.constraints.flatMap((constraint) => {
        const con = constraint;
        const from = self.waypointIdToSavedWaypointId(con.from)!;
        const to = self.waypointIdToSavedWaypointId(con.to);
        const toReturn:Constraint<Expr> = {
          data: con.data.,
          

          from, 
          to
        };
        delete toReturn.data.icon;
        delete toReturn.data.definition;
        delete toReturn.data.uuid;
        delete toReturn.data.from;
        delete toReturn.data.to;
        return toReturn;
      }),
    }
  }
})).actions(self=>({
  addConstraint(
    key: ConstraintKey,
    from: IWaypointScope,
    to?: IWaypointScope
  ): Instance<typeof ConstraintStore> | undefined {
    console.log(getEnv(self));
    let store : (from: IWaypointScope, to?: IWaypointScope)=>IConstraintStore = getEnv(self).create.constraint[key];
    if (store === undefined) {
      return;
    }
    self.constraints.push(store(from, to));
    return self.constraints[self.constraints.length - 1];
  },
  selectOnly(selectedIndex: number) {
    self.waypoints.forEach((point, index) => {
      point.setSelected(selectedIndex == index);
    });
  },
  reorderWaypoint(startIndex: number, endIndex: number) {
    moveItem(self.waypoints, startIndex, endIndex);
  },
  addWaypoint(waypoint?: Partial<Waypoint<Expr>>): IHolonomicWaypointStore {
    self.waypoints.push(
      getEnv(self).create.WaypointStore(
        Object.assign({...DEFAULT_WAYPOINT}, waypoint))
    );
    if (self.waypoints.length === 1) {
      getEnv(self).select(self.waypoints[0]);
    }
    return self.waypoints[self.waypoints.length - 1];
  },
  deleteWaypoint(id: number|string) {
    let index = 0;
    if (typeof id === "string") {
      index = self.waypoints.findIndex((point) => point.uuid === id);
      if (index == -1) return;
    }
    else {
      index = id;
    }
    if (self.waypoints[index] === undefined) {
      return;
    }
    const uuid = self.waypoints[index]?.uuid;
    getEnv(self).select(undefined);

    // clean up constraints
    self.constraints = self.constraints.flatMap(
      (constraint: IConstraintStore) => {
        const from = constraint.from;
        const to = constraint.to;
        // delete waypoint-scope referencing deleted point directly.
        if (
          to===undefined &&
          from instanceof Object &&
          Object.hasOwn(from, "uuid") &&
          from.uuid === uuid
        ) {
          return [];
        }
        // delete zero-segment-scope referencing deleted point directly.
        if (to !== undefined) {
          const deletedIndex = index;
          const firstIsUUID =
            from instanceof Object && Object.hasOwn(from, "uuid");
          const secondIsUUID =
            to instanceof Object && Object.hasOwn(to, "uuid");
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
            startIndex++;
            // while (startIndex < endIndex) {
            //   startIndex++;
            //   // if (self.waypoints[startIndex].isConstrainable()) {
            //   //   break;
            //   // }
            // }
          } else if (deletedIndex == endIndex && secondIsUUID) {
            endIndex --;
            // deleted end? move new end backward till first constrainable waypoint
            // while (startIndex < endIndex) {
            //   endIndex--;
            //   if (self.waypoints[endIndex].isConstrainable()) {
            //     break;
            //   }
            // }
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
            constraint.setFrom(
              firstIsUUID
                ? { uuid: self.waypoints[startIndex].uuid }
                : from
            )
            constraint.setTo(
              secondIsUUID
                ? { uuid: self.waypoints[endIndex].uuid }
                : to
            );
            return constraint;
          }
        }
        return constraint;
      }
    ) as typeof self.constraints;

    destroy(self.waypoints[index]);
    if (self.waypoints.length === 0) {
      return;
    } else if (self.waypoints[index - 1]) {
      self.waypoints[index - 1].setSelected(true);
    } else if (self.waypoints[index + 1]) {
      self.waypoints[index + 1].setSelected(true);
    }
  },
  deleteConstraint(id: string|number) {
    let index = 0;
    if (typeof id === "string") {
      index = self.constraints.findIndex(
        (point) => point.uuid === id
      );
      if (index == -1) return;
    } else {
      index = id;
    }
    getEnv(self).select(undefined);

    if (self.constraints.length === 1) {
      // no-op
    } else if (self.constraints[index - 1]) {
      self.constraints[index - 1].setSelected(true);
    } else if (self.constraints[index + 1]) {
      self.constraints[index + 1].setSelected(true);
    }
    destroy(self.constraints[index]);
  },
  deleteObstacle(id: string | number) {
    let index = 0;
    if (typeof id === "string") {
      index = self.obstacles.findIndex(
        (obstacle) => obstacle.uuid === id
      );
      if (index == -1) return;
    }
    else {
      index = id;
    }

    getEnv(self).select(undefined);

    if (self.obstacles.length === 1) {
      // no-op
    } else if (self.obstacles[index - 1]) {
      self.obstacles[index - 1].setSelected(true);
    } else if (self.obstacles[index + 1]) {
      self.obstacles[index + 1].setSelected(true);
    }
    destroy(self.obstacles[index]);
  },
  addObstacle(x: number, y: number, radius:number) {
    self.obstacles.push(getEnv(self).create.ObstacleStore(x,y,radius));
  },


  optimizeControlIntervalCounts(
    robotConfig: IRobotConfigStore
  ): string | undefined {
    
      return this.guessControlIntervalCounts(robotConfig);
  },
  guessControlIntervalCounts(
    robotConfig: IRobotConfigStore
  ): string | undefined {
    if (robotConfig.wheelMaxTorque == 0) {
      return "Wheel max torque may not be 0";
    } else if (robotConfig.wheelMaxVelocity == 0) {
      return "Wheel max velocity may not be 0";
    } else if (robotConfig.mass.value == 0) {
      return "Robot mass may not be 0";
    } else if (robotConfig.radius.value == 0) {
      return "Wheel radius may not be 0";
    }
    for (let i = 0; i < self.waypoints.length - 1; i++) {
      this.guessControlIntervalCount(i, robotConfig);
    }
    self.waypoints
      .at(self.waypoints.length - 1)
      ?.setIntervals(1);
  },
  guessControlIntervalCount(i: number, robotConfig: IRobotConfigStore) {
    const dx = self.waypoints.at(i + 1)!.x.value - self.waypoints.at(i)!.x.value;
    const dy = self.waypoints.at(i + 1)!.y.value - self.waypoints.at(i)!.y.value;
    const dtheta = angleModulus(
      self.waypoints.at(i + 1)!.heading.value - self.waypoints.at(i)!.heading.value
    );
    const headingWeight = 0.5; // arbitrary
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxForce = robotConfig.wheelMaxTorque / robotConfig.radius.value;

    // Default to robotConfig's max velocity and acceleration
    let maxVel = robotConfig.wheelMaxVelocity * robotConfig.radius.value;
    let maxAccel = (maxForce * 4) / robotConfig.mass.value; // times 4 for 4 modules

    // Iterate through constraints to find applicable "Max Velocity" constraints
    self.constraints.forEach((constraint) => {
      if (constraint.type === "MaxVelocity") {
        const startIdx = constraint.getStartWaypointIndex();
        const endIdx = constraint.getEndWaypointIndex();

        // Check if current waypoint "i" is within the scope of this constraint
        if (startIdx !== undefined && endIdx !== undefined) {
          if (i >= startIdx && i < endIdx) {
            if (constraint.velocity !== undefined) {
              maxVel = Math.min(maxVel, constraint.velocity);
            }
          }
        }
      } else if (constraint.type === "MaxAcceleration") {
        const startIdx = constraint.getStartWaypointIndex();
        const endIdx = constraint.getEndWaypointIndex();

        // Check if current waypoint "i" is within the scope of this constraint
        if (startIdx !== undefined && endIdx !== undefined) {
          if (i >= startIdx && i < endIdx) {
            if (constraint.acceleration !== undefined) {
              maxAccel = Math.min(maxAccel, constraint.acceleration);
            }
          }
        }
      }
    });

    const distanceAtCruise = distance - (maxVel * maxVel) / maxAccel;
    if (distanceAtCruise < 0) {
      // triangle
      let totalTime = 2 * (Math.sqrt(distance * maxAccel) / maxAccel);
      totalTime += headingWeight * Math.abs(dtheta);
      self.waypoints
        .at(i)
        ?.setIntervals(Math.ceil(totalTime / 0.1));
    } else {
      // trapezoid
      let totalTime = distance / maxVel + maxVel / maxAccel;
      totalTime += headingWeight * Math.abs(dtheta);
      self.waypoints
        .at(i)
        ?.setIntervals(Math.ceil(totalTime / 0.1));
    }
  }
})).actions(self=>({
  deserialize(ser: ChoreoPath<Expr>) {
    self.waypoints.clear();
    ser.waypoints.forEach(
      (point: Waypoint<Expr>, index: number): void => {
        const waypoint = self.addWaypoint();
        waypoint.deserialize(point);
      }
    );
    self.constraints.clear();
    ser.constraints.forEach((saved: Constraint<Expr>) => {
      const constraintStore = ConstraintStores[saved.data.type];
      if (constraintStore !== undefined) {
        let from = self.savedWaypointIdToWaypointId(saved.from);
        if( from === undefined) {return;}
        let to = self.savedWaypointIdToWaypointId(saved.to);
        let constraint = self.addConstraint(
          saved.data.type,
          from,
          to
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
    // ser.circleObstacles.forEach((o) => {
    //   this.addObstacle(o.x, o.y, o.radius);
    // });
  },
}))

export interface IChoreoPathStore extends Instance<typeof ChoreoPathStore> {}
