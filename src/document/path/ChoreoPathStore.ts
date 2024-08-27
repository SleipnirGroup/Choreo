import { Instance, destroy, getEnv, types } from "mobx-state-tree";
import { moveItem } from "mobx-utils";
import {
  ChoreoPath,
  Constraint,
  Expr,
  Waypoint,
  WaypointID
} from "../2025/DocumentTypes";
import { CircularObstacleStore } from "../CircularObstacleStore";
import { ConstraintKey, DataMap } from "../ConstraintDefinitions";
import {
  ConstraintStore,
  IConstraintStore,
  IWaypointScope
} from "../ConstraintStore";
import { Env } from "../DocumentManager";
import {
  DEFAULT_WAYPOINT,
  HolonomicWaypointStore,
  IHolonomicWaypointStore
} from "../HolonomicWaypointStore";

export const ChoreoPathStore = types
  .model("ChoreoPathStore", {
    waypoints: types.array(HolonomicWaypointStore),
    constraints: types.array(ConstraintStore),
    obstacles: types.array(CircularObstacleStore)
  })
  .views((self) => ({
    findUUIDIndex(uuid: string) {
      return self.waypoints.findIndex((wpt) => wpt.uuid === uuid);
    }
  }))
  .views((self) => ({
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
    savedWaypointIdToWaypointId(
      savedId: WaypointID | undefined
    ): IWaypointScope | undefined {
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
  }))
  .views((self) => ({
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
      return self.waypoints.filter((waypoint) => waypoint.type == 2);
    }
  }))
  .views((self) => ({
    serialize(): ChoreoPath<Expr> {
      return {
        waypoints: self.waypoints.map((w) => w.serialize()),
        constraints: self.constraints.flatMap((constraint) => {
          const con = constraint;
          const from = self.waypointIdToSavedWaypointId(con.from)!;
          const to = self.waypointIdToSavedWaypointId(con.to);
          const toReturn: Constraint = {
            data: con.data.serialize(),
            from,
            to
          };
          return toReturn;
        })
      };
    }
  }))
  .actions((self) => ({
    addConstraint<K extends ConstraintKey>(
      key: K,
      from: IWaypointScope,
      to?: IWaypointScope,
      data: Partial<DataMap[K]["props"]> = {}
    ): Instance<typeof ConstraintStore> | undefined {
      self.constraints.push(
        getEnv<Env>(self).create.ConstraintStore(key, data, from, to)
      );
      const store = self.constraints[self.constraints.length - 1];
      store.data.deserPartial(data);
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
        getEnv<Env>(self).create.WaypointStore(
          Object.assign({ ...DEFAULT_WAYPOINT }, waypoint)
        )
      );
      if (self.waypoints.length === 1) {
        getEnv<Env>(self).select(self.waypoints[0]);
      }
      return self.waypoints[self.waypoints.length - 1];
    },
    deleteWaypoint(id: number | string) {
      let index = 0;
      if (typeof id === "string") {
        index = self.waypoints.findIndex((point) => point.uuid === id);
        if (index == -1) return;
      } else {
        index = id;
      }
      if (self.waypoints[index] === undefined) {
        return;
      }
      const uuid = self.waypoints[index]?.uuid;
      getEnv<Env>(self).select(undefined);

      // clean up constraints
      self.constraints = self.constraints.flatMap(
        (constraint: IConstraintStore) => {
          const from = constraint.from;
          const to = constraint.to;
          // delete waypoint-scope referencing deleted point directly.
          if (
            to === undefined &&
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
              endIndex--;
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
              !constraint.data.def.wptScope &&
              endIndex == startIndex &&
              firstIsUUID &&
              secondIsUUID
            ) {
              return [];
            } else {
              // update
              constraint.setFrom(
                firstIsUUID ? { uuid: self.waypoints[startIndex].uuid } : from
              );
              constraint.setTo(
                secondIsUUID ? { uuid: self.waypoints[endIndex].uuid } : to
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
    deleteConstraint(id: string | number) {
      let index = 0;
      if (typeof id === "string") {
        index = self.constraints.findIndex((point) => point.uuid === id);
        if (index == -1) return;
      } else {
        index = id;
      }
      getEnv<Env>(self).select(undefined);

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
        index = self.obstacles.findIndex((obstacle) => obstacle.uuid === id);
        if (index == -1) return;
      } else {
        index = id;
      }

      getEnv<Env>(self).select(undefined);

      if (self.obstacles.length === 1) {
        // no-op
      } else if (self.obstacles[index - 1]) {
        self.obstacles[index - 1].setSelected(true);
      } else if (self.obstacles[index + 1]) {
        self.obstacles[index + 1].setSelected(true);
      }
      destroy(self.obstacles[index]);
    },
    addObstacle(x: number, y: number, radius: number) {
      self.obstacles.push(getEnv<Env>(self).create.ObstacleStore(x, y, radius));
    }
  }))
  .actions((self) => ({
    deserialize(ser: ChoreoPath<Expr>) {
      self.waypoints.clear();
      ser.waypoints.forEach((point: Waypoint<Expr>, index: number): void => {
        const waypoint = self.addWaypoint();
        waypoint.deserialize(point);
      });
      self.constraints.clear();
      ser.constraints.forEach((saved: Constraint) => {
        const from = self.savedWaypointIdToWaypointId(saved.from);
        if (from === undefined) {
          return;
        }
        const to = self.savedWaypointIdToWaypointId(saved.to);
        self.addConstraint(
          saved.data.type,

          from,
          to,
          saved.data.props
        );
      });
      self.obstacles.clear();
      // ser.circleObstacles.forEach((o) => {
      //   this.addObstacle(o.x, o.y, o.radius);
      // });
    }
  }));

export type IChoreoPathStore = Instance<typeof ChoreoPathStore>;
