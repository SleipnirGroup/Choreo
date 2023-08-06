import { ArrowRight, ArrowRightAlt, ArrowUpward, PriorityHigh, Stop } from "@mui/icons-material"
import { getDebugName } from "mobx"
import { getParent, types } from "mobx-state-tree"
import { getRoot, Instance, IOptionalIType, isAlive, ISimpleType, ModelActions } from "mobx-state-tree"
import { type } from "os"
import React, { ReactElement } from "react"
import { safeGetIdentifier } from "../util/mobxutils"
import { IStateStore } from "./DocumentModel"
import {v4 as uuidv4} from "uuid"
import { I } from "@tauri-apps/api/path-c062430b"

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
    icon:  ReactElement<any, string | JSXElementConstructor<any>>,
    description: string,
    wptScope: boolean,
    sgmtScope: boolean,
    fullPathScope: boolean,
    properties: {
        [key:string]: ConstraintPropertyDefinition
    }
}

export const constraints = {
    BoundsZeroVelocity: {
        name: "Bounds Zero Velocity",
        description: "Zero velocity at first and last waypoint",
        icon: (<Stop></Stop>),
        properties: {},
        wptScope: false,
        sgmtScope:false,
        fullPathScope: true
    },
    WptVelocityDirection: {
        name: "Waypoint Velocity Direction",
        description: "Direction of travel through waypoint",
        icon: (<ArrowRightAlt/>),
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
        description: "Zero velocity at waypoint",
        icon: (<Stop></Stop>),
        properties: {},
        wptScope: true,
        sgmtScope: false,
        fullPathScope: false
    }
}
export const SegmentScope = types.model("SegmentScope", {
    start: types.string,
    end:types.string
});
export interface IConstraintStore extends Instance<typeof ConstraintStore>{}

export const ConstraintStore = types.model("ConstraintStore", {
    scope: types.maybeNull(types.union(types.string, SegmentScope)),
    type: types.optional(types.string, ""),
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
    }
}))
.actions((self)=>({
    afterCreate() {
    },
    setScope(scope:string | {start:string, end:string}) {
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
