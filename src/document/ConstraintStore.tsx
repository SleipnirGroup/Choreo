import { Instance, getEnv, getParent, isAlive, types } from "mobx-state-tree";
import {
  ConstraintDataObjects,
  IConstraintDataStore
} from "./ConstraintDataStore";
import { ConstraintKey } from "./ConstraintDefinitions";
import { Env } from "./DocumentManager";
import { IHolonomicWaypointStore } from "./HolonomicWaypointStore";
import { IChoreoPathStore } from "./path/ChoreoPathStore";
import { IHolonomicPathStore } from "./path/HolonomicPathStore";

// export const constraints = {
//   WptVelocityDirection: {
//     name: "Waypoint Velocity Direction",
//     shortName: "Wpt Velo Dir",
//     description: "Direction of travel through waypoint",
//     icon: <Explore />,
//     properties: {
//       direction: {
//         name: "Direction",
//         description: "The direction of velocity",
//         units: Units.Radian
//       }
//     },
//     wptScope: true,
//     sgmtScope: false
//   },
//   StopPoint: {
//     name: "Stop Point",
//     shortName: "Stop Point",
//     description: "Zero linear and angular velocity at waypoint",
//     icon: <StopCircleOutlined></StopCircleOutlined>,
//     properties: {},
//     wptScope: true,
//     sgmtScope: false
//   },
//   MaxVelocity: {
//     name: "Max Velocity",
//     shortName: "Max Velo",
//     description: "Maximum Velocity",
//     icon: <KeyboardDoubleArrowRight />,
//     properties: {
//       max: {
//         name: "Max Velocity",
//         description: "Maximum Velocity of robot chassis",
//         units: Units.MeterPerSecond
//       }
//     },
//     wptScope: true,
//     sgmtScope: true
//   },
//   MaxAngularVelocity: {
//     name: "Max Angular Velocity",
//     shortName: "Max Ang Velo",
//     description: "Maximum Angular Velocity",
//     icon: <SyncOutlined />,
//     properties: {
//       max: {
//         name: "Max Angular Velocity",
//         description: "Maximum Angular Velocity of robot chassis",
//         units: Units.RadianPerSecond
//       }
//     },
//     wptScope: true,
//     sgmtScope: true
//   },
//   MaxAcceleration: {
//     name: "Max Acceleration",
//     shortName: "Max Acc",
//     description: "Maximum Linear Acceleration",
//     icon: <TextRotationNoneOutlined />,
//     properties: {
//       max: {
//         name: "Max Acceleration",
//         description: "Maximum Linear Acceleration of robot chassis",
//         units: Units.MeterPerSecondSquared
//       }
//     },
//     wptScope: true,
//     sgmtScope: true
//   },
//   StraightLine: {
//     name: "Straight Line",
//     shortName: "Straight Line",
//     description: "Follow straight lines between waypoints",
//     icon: <Timeline></Timeline>,
//     properties: {},
//     wptScope: false,
//     sgmtScope: true
//   },
//   PointAt: {
//     name: "Point At",
//     shortName: "Point At",
//     description: "Face a specified point",
//     icon: <NearMe />,
//     properties: {
//       x: {
//         name: "X",
//         description: "The x coordinate of the point the robot should face",
//         units: Units.Meter
//       },
//       y: {
//         name: "Y",
//         description: "The y coordinate of the point the robot should face",
//         units: Units.Meter
//       },
//       tolerance: {
//         name: "Heading Tolerance",
//         description:
//           "The allowable heading range relative to the direction to the point. Keep less than Pi.",
//         units: Units.Radian
//       }
//     },
//     wptScope: true,
//     sgmtScope: true
//   }
// } satisfies { [key: string]: ConstraintDefinition };

const WaypointUUIDScope = types.model("WaypointScope", {
  uuid: types.string
});
export const WaypointScope = types.union(
  types.literal("first"),
  types.literal("last"),
  WaypointUUIDScope
);
export type IWaypointScope = IWaypointUUIDScope | "first" | "last";
type IWaypointUUIDScope = Instance<typeof WaypointUUIDScope>;

export type IConstraintStore = Instance<typeof ConstraintStore>;

export const ConstraintStore = types
  .model("ConstraintStore", {
    from: WaypointScope,
    to: types.maybe(WaypointScope),
    data: types.union(
      ...Object.values(ConstraintDataObjects)
    ) as IConstraintDataStore<ConstraintKey>,
    uuid: types.identifier
  })
  .views((self) => ({
    getType() {
      return self.data.type;
    },
    get wptScope() {
      return self.data.def.wptScope;
    },
    get sgmtScope() {
      return self.data.def.sgmtScope;
    },
    get selected(): boolean {
      if (!isAlive(self)) {
        return false;
      }
      return self.uuid === getEnv<Env>(self).selectedSidebar();
    },
    getPath(): IHolonomicPathStore {
      const path: IHolonomicPathStore = getParent<IHolonomicPathStore>(
        getParent<IChoreoPathStore>(getParent<IConstraintStore[]>(self))
      );
      return path;
    }
  }))
  .views((self) => ({
    getStartWaypoint(): IHolonomicWaypointStore | undefined {
      const startScope = self.from;
      return self.getPath().path.getByWaypointID(startScope);
    },
    getEndWaypoint(): IHolonomicWaypointStore | undefined {
      const scope = self.to ?? self.from;
      return self.getPath().path.getByWaypointID(scope);
    }
  }))
  .views((self) => ({
    getStartWaypointIndex(): number | undefined {
      const waypoint = self.getStartWaypoint();
      if (waypoint === undefined) return undefined;
      return self.getPath().path.findUUIDIndex(waypoint.uuid);
    },
    getEndWaypointIndex(): number | undefined {
      const waypoint = self.getEndWaypoint();
      if (waypoint === undefined) return undefined;
      return self.getPath().path.findUUIDIndex(waypoint.uuid);
    },

    get issues() {
      const startWaypoint = self.getStartWaypoint();
      const endWaypoint = self.getEndWaypoint();
      const issueText = [];

      if (self.to !== undefined) {
        if (startWaypoint === undefined || endWaypoint === undefined) {
          issueText.push("Constraint refers to missing waypoint(s)");
        }
      } else {
        if (startWaypoint === undefined) {
          issueText.push("Constraint refers to missing waypoint");
        }
      }
      return issueText;
    }
  }))
  .actions((self) => ({
    afterCreate() {},
    setFrom(from: IWaypointScope) {
      self.from = from;
    },
    setTo(to?: IWaypointScope) {
      self.to = to;
    },
    setSelected(selected: boolean) {
      if (selected && !self.selected) {
        getEnv<Env>(self).select(
          getParent<IConstraintStore[]>(self)?.find(
            (point) => self.uuid == point.uuid
          )
        );
      }
    }
  }));
// const constraintsStores: Partial<Record<ConstraintKey, typeof ConstraintStore>> = {};
// Object.entries(constraints).forEach((entry) => {
//   let key = entry[0] as ConstraintKey;
//   constraintsStores[key] = defineConstraintStore(key, entry[1]);
// });
// Export constraint stores down here
// export const ConstraintStores: Record<ConstraintKey, typeof ConstraintStore> =
//   constraintsStores;
