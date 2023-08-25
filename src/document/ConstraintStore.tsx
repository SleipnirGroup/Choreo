import { ArrowRight, ArrowRightAlt, ArrowUpward, Dangerous, Explore, KeyboardDoubleArrowRight, PriorityHigh, Stop, SyncDisabledOutlined } from "@mui/icons-material"
import { getDebugName } from "mobx"
import { getParent, types } from "mobx-state-tree"
import { getRoot, Instance, IOptionalIType, isAlive, ISimpleType, ModelActions } from "mobx-state-tree"
import { type } from "os"
import React, { JSXElementConstructor, ReactElement } from "react"
import { safeGetIdentifier } from "../util/mobxutils"
import { IStateStore } from "./DocumentModel"
import {v4 as uuidv4} from "uuid"
import { I } from "@tauri-apps/api/path-c062430b"
import { IHolonomicWaypointStore } from "./HolonomicWaypointStore"
import { IHolonomicPathStore } from "./HolonomicPathStore"

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
    name: string,
    description: string,
    units: string,
    default?: number
}
export type ConstraintDefinition = {
    name: string,
    shortName: string,
    icon:  ReactElement<any, string | JSXElementConstructor<any>>,
    description: string,
    wptScope: boolean,
    sgmtScope: boolean,
    fullPathScope: boolean,
    properties: {
        [key:string]: ConstraintPropertyDefinition
    }
}

export type WaypointID = "first" | "last" | {uuid:string};

export const constraints = {
    WptVelocityDirection: {
        name: "Waypoint Velocity Direction",
        shortName: "Wpt Velo Dir",
        description: "Direction of travel through waypoint",
        icon: (<Explore/>),
        properties: {
            direction: {
                name: "Direction",
                description: "The direction of velocity",
                units: "rad"
            }
        },
        wptScope: true,
        sgmtScope: false,
        fullPathScope: false
    },
    WptZeroVelocity: {
        name: "Waypoint Zero Velocity",
        shortName: "Wpt 0 Velo",
        description: "Zero velocity at waypoint",
        icon: (<Dangerous></Dangerous>),
        properties: {},
        wptScope: true,
        sgmtScope: false,
        fullPathScope: false
    },
    MaxVelocity: {
        name: "Max Velocity",
        shortName: "Max Velo",
        description: "Maximum Velocity",
        icon: (<KeyboardDoubleArrowRight/>),
        properties: {
            velocity: {
                name: "Max Velocity",
                description: "Maximum Velocity of robot chassis",
                units: "m/s"
            }
        },
        wptScope: true,
        sgmtScope: true,
        fullPathScope: false
    },
    ZeroAngularVelocity: {
        name: "Zero Angular Velocity",
        shortName: "0 Ang Velo",
        description: "Zero angular velocity throughout scope",
        icon: (<SyncDisabledOutlined></SyncDisabledOutlined>),
        properties: {
        },
        wptScope: true,
        sgmtScope: true,
        fullPathScope: false
    }
}
const WaypointUUIDScope = types.model("WaypointScope", {
    uuid: types.string
});
export const WaypointScope = types.union(types.literal("first"), types.literal("last"), WaypointUUIDScope);
export type IWaypointScope = IWaypointUUIDScope | "first" | "last";
interface IWaypointUUIDScope extends Instance<typeof WaypointUUIDScope>{}
export const SegmentScope = types.model("SegmentScope", {
    start: WaypointScope,
    end: WaypointScope
});
export interface ISegmentScope extends Instance<typeof SegmentScope>{}

export interface IConstraintStore extends Instance<typeof ConstraintStore>{}

export const ConstraintStore = types.model("ConstraintStore", {
    scope: types.maybeNull(types.union(WaypointScope, SegmentScope)),
    type: types.optional(types.string, ""),
    issue: types.array(types.string),
    uuid: types.identifier
})
.views((self)=>({
    getType() {
        return "";
    },
    get wptScope() {
        return false;
    },
    get sgmtScope() {
        return false;
    },
    get fullPathScope () {
        return false;
    },
    get definition() : ConstraintDefinition {
        return {
            name: "Default",
            shortName: "Default",
            description: "",
            sgmtScope: false,
            wptScope: false,
            fullPathScope: false,
            icon: <PriorityHigh></PriorityHigh>,
            properties: {}
        }
    },
    get selected() :boolean {
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
    getStartWaypoint() : IHolonomicWaypointStore | undefined {
        const path : IHolonomicPathStore  = getParent<IHolonomicPathStore>(getParent<IConstraintStore[]>(self));
        if (self.scope === null) return undefined;
        if (self.scope === "first" || self.scope === "last" || Object.hasOwn(self.scope, "uuid")) {
            return path.getByWaypointID(self.scope as IWaypointScope);
        }
        return path.getByWaypointID((self.scope as ISegmentScope).start as IWaypointScope);
    },

}))
.views((self)=>({
    getStartWaypointIndex() : number | undefined {
        const path : IHolonomicPathStore = getParent<IHolonomicPathStore>(getParent<IConstraintStore[]>(self));
        const waypoint = self.getStartWaypoint();
        if (waypoint === undefined) return undefined;
        return path.findUUIDIndex(waypoint.uuid);
    },
    getPath() : IHolonomicPathStore {
        const path : IHolonomicPathStore = getParent<IHolonomicPathStore>(getParent<IConstraintStore[]>(self));
        return path;
    }
}))
.actions((self)=>({
    afterCreate() {
    },
    setScope(scope:IWaypointScope | ISegmentScope) {
        self.scope = scope;
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
      },
    setIssue(issue: string) {
        self.issue[0] = issue;
    }
}));




const defineConstraintStore = (key:string, definition: ConstraintDefinition) => {
    return ConstraintStore
    .named(`${key}Store`)
    .views((self)=>({
        getType() {
            return key
        },
        get wptScope() {
            return definition.wptScope;
        },
        get sgmtScope() {
            return definition.sgmtScope;
        },
        get fullPathScope() {
            return definition.fullPathScope;
        },
        get definition() {
            return definition;
        }
    }))
    // Define each property onto the model
    .props(
        (()=>{
            let x : {[key:string]: IOptionalIType<ISimpleType<number>, [number]>}  = {};
            Object.keys(definition.properties).forEach(
                (key) =>{
                    x[key] = types.optional(types.number, definition.properties[key]?.default ?? 0)
                }
            )
            return x;
        })()
    ).props(
        {
            type: key
        }
    )
    // Defined setters for each property
    .actions((self)=>{
            let x : ModelActions  = {};
            Object.keys(definition.properties).forEach(
                (key) =>{
                    let upperCaseName = key[0].toUpperCase() + key.slice(1)
                    x[`set${upperCaseName}`] = (arg0: number)=>{self[key] = arg0}
                }
            )
            return x;
    });
}

let constraintsStores: {[key:string]: typeof ConstraintStore} = {}
Object.entries(constraints).forEach(entry=>{
    constraintsStores[entry[0]] = defineConstraintStore(entry[0], entry[1])
})
// Export constraint stores down here
export const ConstraintStores : {[key:string]: typeof ConstraintStore}= constraintsStores;
