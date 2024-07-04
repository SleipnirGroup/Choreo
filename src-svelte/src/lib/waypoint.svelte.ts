// place files you want to import through the `$lib` alias in this folder.
import { Paths } from "./path.svelte.js";
import { NavbarItemData } from "./uistate.svelte.js";

export function deletePathWaypoint(pathId: number, wptId: number) {
    console.log("delete", pathId, wptId);
    Paths[pathId] = Paths[pathId].filter((id)=>id!=wptId);
}

let WaypointIDCounter = 1;
export let WaypointSubscribers: Record<number, Waypoint> = {}

export interface IWaypoint {
    id: number;
    x: number;
    y: number;
    heading: number;
    isInitialGuess: boolean;
    translationConstrained: boolean;
    headingConstrained: boolean;
    controlIntervalCount: number;
}
export class Waypoint implements IWaypoint {
    id: number;
    x = $state(0);
    y = $state(0);
    heading = $state(0);
    isInitialGuess = $state(false);
    translationConstrained = $state(true);
    headingConstrained = $state(true);
    controlIntervalCount = $state(40);
    _waypoint_type = $derived(() =>
        this.isInitialGuess ? 3 :
        (!this.heading && !this.translationConstrained) ? 2 :
        (this.translationConstrained && !this.headingConstrained) ? 1 :
        0
    );
    get waypoint_type():number {return this._waypoint_type()}
    _type_name = $derived(NavbarItemData[this.waypoint_type].name);
    get type_name():string {return this._type_name}
    unreactive() : IWaypoint {
        return {
            x: this.x,
            y: this.y,
            heading: this.heading,
            isInitialGuess: this.isInitialGuess,
            translationConstrained: this.translationConstrained,
            headingConstrained: this.headingConstrained,
            controlIntervalCount: this.controlIntervalCount,
            id: this.id
        }
    }
    constructor (id: number) {
        this.id = id;
    }
}

export function getWaypoint(id: number): Waypoint | undefined {
        return WaypointSubscribers[id];
}

export function add_waypoint(partial: Partial<WaypointNoID>) : Waypoint {
    let id = ++WaypointIDCounter;
    let newWpt = new Waypoint(id);
    Object.assign(newWpt, partial);
     WaypointSubscribers[id] = newWpt;
    return newWpt;
}

// export type Waypoint = {
//     id: number,
//     x: number,
//     y: number,
//     heading: number,
//     isInitialGuess: boolean,
//     translationConstrained: boolean,
//     headingConstrained: boolean,
//     control_interval_count: number
// }
export type WaypointNoID = Omit<IWaypoint, "id">;

