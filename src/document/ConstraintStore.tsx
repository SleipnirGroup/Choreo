import { Stop } from "@mui/icons-material"
import { getDebugName } from "mobx"
import { types } from "mobx-state-tree"
import { IOptionalIType, ISimpleType, ModelActions, string } from "mobx-state-tree/dist/internal"
import { type } from "os"
import React, { ReactElement } from "react"

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
    icon: React.Component | ReactElement,
    description: string,
    wptScope: boolean,
    sgmtScope: boolean,
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
        sgmtScope:false
    },
    WptVelocityDirection: {
        name: "Zero Velocity",
        description: "Zero velocity in scope",
        icon: (<Stop></Stop>),
        properties: {
            direction: {
                name: "Direction",
                description: "The direction of velocity",
                units: "rad"
            }
        },
        wptScope: true,
        sgmtScope: false
    }
}
export const SegmentScope = types.model("SegmentScope", {
    start: types.string,
    end:types.string
});
export const ConstraintStore = types.model("ConstraintStore", {
    scope: types.maybeNull(types.union(types.string, SegmentScope)),
    type: types.optional(types.string, "")
})



const defineConstraintStore = (key:string, definition: ConstraintDefinition) => {
    return ConstraintStore
    .named(`${key}Store`)
    .views((self)=>({
        getType() {
            return key
        }
    }))
    // Create the setter for scope
    .actions((self)=>{
        let setScope;
        if (definition.wptScope && definition.sgmtScope) {
            setScope = (scope: string | {start:string, end:string}) => {
            self.scope = scope;
            }
        }
        else if (definition.wptScope) {
            setScope = (scope: string) => {
                self.scope = scope;
            }
        }
        else if (definition.sgmtScope) {
            setScope = (scope: {start:string, end:string}) => {
                self.scope = scope;
            }
        } else {
            setScope = (scope: string | {start:string, end:string}) => {
                console.error("Tried to set scope on an unscoped constraint", getDebugName(self))
            }
        }
        return {
            setScope,
            afterCreate(){
                self.type = key;
            }
        }
    })
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
    })
}

let constraintsStores: {[key:string]: typeof ConstraintStore} = {}
Object.entries(constraints).forEach(entry=>{
    constraintsStores[entry[0]] = defineConstraintStore(entry[0], entry[1])
})
// Export constraint stores down here
export const ConstraintStores : {[key:string]: typeof ConstraintStore}= constraintsStores;
