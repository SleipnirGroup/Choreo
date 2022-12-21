import { types } from "mobx-state-tree";
import { Instance } from "mobx-state-tree";
import { v4 as uuidv4} from 'uuid';

export const WaypointStore = types.model("WaypointStore", {
    x: 0,
    y: 0,
    heading: 0,
    xConstrained: false,
    yConstrained: false,
    headingConstrained: false,
    controlIntervalCount: 0,
    name: "",
    uuid:types.identifier
})
export interface IWaypointStore extends Instance<typeof WaypointStore> {};
export const HolonomicWaypointStore= WaypointStore
.named("HolonomicWaypointStore")
.props({
    velocityX:0,
    velocityY: 0,
    angularVelocity: 0,
    velocityXConstrained: false,
    velocityYConstrained: false,
    velocityMagnitudeConstrained: false,
    angularVelocityConstrained: false
})
export interface IHolonomicWaypointStore extends Instance<typeof HolonomicWaypointStore> {};
export const HolonomicPathStore = types.model("HolonomicPathStore", {
    name: "",
    uuid: types.identifier,
    waypoints: types.array(HolonomicWaypointStore)
}).actions(self=>{
    return {
        addWaypoint () {
            self.waypoints.push(HolonomicWaypointStore.create({uuid: uuidv4()}));
        },
        reorder(startIndex: number, endIndex: number) {
            const result = self.waypoints;
            const [removed] = result.splice(startIndex, 1);
            result.splice(endIndex, 0, removed);
            self.waypoints = result
            console.log(result);
          }
    }
})
export interface IHolonomicPathStore extends Instance<typeof HolonomicPathStore> {};

export const PathListStore = types.model("PathListStore", {
    paths: types.map(HolonomicPathStore),
    activePathUUID: ""
})
.views(self=>{
    return {
        get pathNames() {
            return Array.from(self.paths.values()).map((pathStore)=>pathStore.name);
        },

        get pathUUIDs() {
            return Array.from(self.paths.keys());
        },
        get activePath() {
            return self.paths.get(self.activePathUUID) || HolonomicPathStore.create({name:"New Path", uuid: uuidv4()});}
    }
})
.actions(self =>{
    return {
        setActivePathUUID(uuid: string) {
            if (self.pathUUIDs.includes(uuid)) {
                self.activePathUUID = uuid;
            }
        },
        addPath(name:string) :void {
            let newUUID=uuidv4();
            self.paths.put (HolonomicPathStore.create({uuid: newUUID, name:name}));
            if (self.paths.size == 1) {
                self.activePathUUID = newUUID
            }
        }
    }
});
export interface IPathListStore extends Instance<typeof PathListStore> {};
export default class DocumentModel {
    pathlist = PathListStore.create();
    constructor() {
        this.pathlist.addPath("one");
        this.pathlist.addPath("two");
    }
}