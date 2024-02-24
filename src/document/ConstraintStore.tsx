import {
  Dangerous,
  Explore,
  KeyboardDoubleArrowRight,
  PriorityHigh,
  StopCircleOutlined,
  SyncDisabledOutlined,
  Timeline
} from "@mui/icons-material";
import { toJS } from "mobx";
import { getParent, types } from "mobx-state-tree";
import {
  getRoot,
  Instance,
  IOptionalIType,
  isAlive,
  ISimpleType,
  ModelActions
} from "mobx-state-tree";
import { JSXElementConstructor, ReactElement } from "react";
import { safeGetIdentifier } from "../util/mobxutils";
import { IStateStore } from "./DocumentModel";
import { IHolonomicWaypointStore } from "./HolonomicWaypointStore";
import { IHolonomicPathStore } from "./HolonomicPathStore";

/**
 * PoseWpt (idx, x, y, heading)
 *   void TranslationWpt(size_t idx, double x, double y,
                      double headingGuess = 0.0);
    void WptInitialGuessPoint(size_t wptIdx, const InitialGuessPoint& poseGuess);
    void SgmtInitialGuessPoints(
      size_t fromIdx, const std::vector<InitialGuessPoint>& sgmtPoseGuess);
    void WptVelocityDirection(size_t idx, double angle);
    void WptVelocityMagnitude(size_t idx, double v);
    void WptZeroVelocity(size_t idx);
    void WptVelocityPolar(size_t idx, double vr, double vtheta);
    void WptZeroAngularVelocity(size_t idx);
    void SgmtVelocityDirection(size_t fromIdx, size_t toIdx, double angle,
                             bool includeWpts = true)
    // maximum
    void SgmtVelocityMagnitude(size_t fromIdx, size_t toIdx, double v,
                             bool includeWpts = true);
     void SgmtZeroAngularVelocity(size_t fromIdx, size_t toIdx,
                               bool includeWpts = true);
 */
export type ConstraintPropertyDefinition = {
  name: string;
  description: string;
  units: string;
  default?: number;
};
export type ConstraintDefinition = {
  name: string;
  shortName: string;
  icon: ReactElement<any, string | JSXElementConstructor<any>>;
  description: string;
  wptScope: boolean;
  sgmtScope: boolean;
  properties: {
    [key: string]: ConstraintPropertyDefinition;
  };
};

export type WaypointID = "first" | "last" | { uuid: string };

export const constraints = {
  WptVelocityDirection: {
    name: "Waypoint Velocity Direction",
    shortName: "Wpt Velo Dir",
    description: "Direction of travel through waypoint",
    icon: <Explore />,
    properties: {
      direction: {
        name: "Direction",
        description: "The direction of velocity",
        units: "rad"
      }
    },
    wptScope: true,
    sgmtScope: false
  },
  WptZeroVelocity: {
    name: "Waypoint Zero Velocity",
    shortName: "Wpt 0 Velo",
    description: "Zero velocity at waypoint",
    icon: <Dangerous></Dangerous>,
    properties: {},
    wptScope: true,
    sgmtScope: false
  },
  StopPoint: {
    name: "Stop Point",
    shortName: "Stop Point",
    description: "Zero linear and angular velocity at waypoint",
    icon: <StopCircleOutlined></StopCircleOutlined>,
    properties: {},
    wptScope: true,
    sgmtScope: false
  },
  MaxVelocity: {
    name: "Max Velocity",
    shortName: "Max Velo",
    description: "Maximum Velocity",
    icon: <KeyboardDoubleArrowRight />,
    properties: {
      velocity: {
        name: "Max Velocity",
        description: "Maximum Velocity of robot chassis",
        units: "m/s"
      }
    },
    wptScope: true,
    sgmtScope: true
  },
  ZeroAngularVelocity: {
    name: "Zero Angular Velocity",
    shortName: "0 Ang Velo",
    description: "Zero angular velocity throughout scope",
    icon: <SyncDisabledOutlined></SyncDisabledOutlined>,
    properties: {},
    wptScope: true,
    sgmtScope: true
  },
  StraightLine: {
    name: "Straight Line",
    shortName: "Straight Line",
    description: "Follow straight lines between waypoints",
    icon: <Timeline></Timeline>,
    properties: {},
    wptScope: false,
    sgmtScope: true
  }
};
const WaypointUUIDScope = types.model("WaypointScope", {
  uuid: types.string
});
export const WaypointScope = types.union(
  types.literal("first"),
  types.literal("last"),
  WaypointUUIDScope
);
export type IWaypointScope = IWaypointUUIDScope | "first" | "last";
interface IWaypointUUIDScope extends Instance<typeof WaypointUUIDScope> {}

export interface IConstraintStore extends Instance<typeof ConstraintStore> {}

export const ConstraintStore = types
  .model("ConstraintStore", {
    scope: types.array(WaypointScope),
    type: types.optional(types.string, ""),
    definition: types.frozen<ConstraintDefinition>({
      name: "Default",
      shortName: "Default",
      description: "",
      sgmtScope: false,
      wptScope: false,
      icon: <PriorityHigh></PriorityHigh>,
      properties: {}
    }),
    uuid: types.identifier
  })
  .views((self) => ({
    getType() {
      return self.type ?? "";
    },
    get wptScope() {
      return self.definition.wptScope;
    },
    get sgmtScope() {
      return self.definition.sgmtScope;
    },
    // get definition(): ConstraintDefinition {
    //   return self.definition;
    // },
    get selected(): boolean {
      if (!isAlive(self)) {
        return false;
      }
      return (
        self.uuid ==
        safeGetIdentifier(
          getRoot<IStateStore>(self).uiState.selectedSidebarItem
        )
      );
    },
    getSortedScope(): Array<IWaypointScope> {
      return toJS(self.scope)
        .slice()
        .sort((a, b) => {
          if (a === "first") return -1;
          if (b === "first") return 1;
          if (a === "last") return 1;
          if (b === "last") return -1;
          const path: IHolonomicPathStore = getParent<IHolonomicPathStore>(
            getParent<IConstraintStore[]>(self)
          );
          const aIdx = path.findUUIDIndex(a.uuid) || 0;
          const bIdx = path.findUUIDIndex(b.uuid) || 1;
          return aIdx - bIdx;
        });
    }
  }))
  .views((self) => ({
    getStartWaypoint(): IHolonomicWaypointStore | undefined {
      const startScope = self.getSortedScope()[0];
      if (startScope === undefined) {
        return undefined;
      }
      const path: IHolonomicPathStore = getParent<IHolonomicPathStore>(
        getParent<IConstraintStore[]>(self)
      );
      return path.getByWaypointID(startScope);
    },
    getEndWaypoint(): IHolonomicWaypointStore | undefined {
      const scope = self.getSortedScope();
      const endScope = scope[scope.length - 1];
      if (endScope === undefined) {
        return undefined;
      }
      const path: IHolonomicPathStore = getParent<IHolonomicPathStore>(
        getParent<IConstraintStore[]>(self)
      );
      return path.getByWaypointID(endScope);
    }
  }))
  .views((self) => ({
    getStartWaypointIndex(): number | undefined {
      const path: IHolonomicPathStore = getParent<IHolonomicPathStore>(
        getParent<IConstraintStore[]>(self)
      );
      const waypoint = self.getStartWaypoint();
      if (waypoint === undefined) return undefined;
      return path.findUUIDIndex(waypoint.uuid);
    },
    getEndWaypointIndex(): number | undefined {
      const path: IHolonomicPathStore = getParent<IHolonomicPathStore>(
        getParent<IConstraintStore[]>(self)
      );
      const waypoint = self.getEndWaypoint();
      if (waypoint === undefined) return undefined;
      return path.findUUIDIndex(waypoint.uuid);
    },
    getPath(): IHolonomicPathStore {
      const path: IHolonomicPathStore = getParent<IHolonomicPathStore>(
        getParent<IConstraintStore[]>(self)
      );
      return path;
    },
    get issues() {
      const startWaypoint = self.getStartWaypoint();
      const endWaypoint = self.getEndWaypoint();
      const scope = self.scope;
      const issueText = [];

      if (scope.length == 2) {
        if (startWaypoint === undefined || endWaypoint === undefined) {
          issueText.push("Constraint refers to missing waypoint(s)");
        } else {
          if (startWaypoint!.isInitialGuess || endWaypoint!.isInitialGuess) {
            issueText.push("Cannot have initial guess point as endpoint");
          }
        }
      } else if (scope.length == 1) {
        if (startWaypoint === undefined) {
          issueText.push("Constraint refers to missing waypoint");
        } else {
          if (startWaypoint!.isInitialGuess) {
            issueText.push("Cannot constrain initial guess point");
          }
        }
      } else if (scope.length == 0) {
        issueText.push("Scope not set");
      }
      return issueText;
    }
  }))
  .actions((self) => ({
    afterCreate() {},
    setScope(scope: Array<Instance<typeof WaypointScope>>) {
      self.scope.length = 0;
      self.scope.push(...scope);
    },
    setSelected(selected: boolean) {
      if (selected && !self.selected) {
        const root = getRoot<IStateStore>(self);
        root.select(
          getParent<IConstraintStore[]>(self)?.find(
            (point) => self.uuid == point.uuid
          )
        );
      }
    }
  }));

const defineConstraintStore = (
  key: string,
  definition: ConstraintDefinition
) => {
  return (
    ConstraintStore.named(`${key}Store`)
      // Define each property onto the model
      .props(
        (() => {
          const x: {
            [key: string]: IOptionalIType<ISimpleType<number>, [number]>;
          } = {};
          Object.keys(definition.properties).forEach((key) => {
            x[key] = types.optional(
              types.number,
              definition.properties[key]?.default ?? 0
            );
          });
          return x;
        })()
      )
      .props({
        type: key,
        definition: types.frozen(definition)
      })
      // Defined setters for each property
      .actions((self) => {
        const x: ModelActions = {};
        Object.keys(definition.properties).forEach((key) => {
          if (key.length == 0) {
            return;
          }
          const upperCaseName = key[0].toUpperCase() + key.slice(1);
          x[`set${upperCaseName}`] = (arg0: number) => {
            self[key] = arg0;
          };
        });
        return x;
      })
  );
};

const constraintsStores: { [key: string]: typeof ConstraintStore } = {};
Object.entries(constraints).forEach((entry) => {
  constraintsStores[entry[0]] = defineConstraintStore(entry[0], entry[1]);
});
// Export constraint stores down here
export const ConstraintStores: { [key: string]: typeof ConstraintStore } =
  constraintsStores;
