// place files you want to import through the `$lib` alias in this folder.
import { NavbarItemData } from "./uistate.svelte.js";
import { Map } from 'svelte/reactivity';
import type { UndoManager, Signal } from "./util/state.svelte.js";

let WaypointIDCounter = 1;
export let WaypointSubscribers = new Map<number, Waypoint>()

export class Waypoint {
    id: number;
    x: Signal<number>;
    y: Signal<number>;
    heading: Signal<number>;
    isInitialGuess: Signal<boolean>;
    translationConstrained: Signal<boolean>;
    headingConstrained: Signal<boolean>;
    controlIntervalCount: Signal<number>;
    _waypoint_type = $derived(() =>
        this.isInitialGuess() ? 3 :
        (!this.heading() && !this.translationConstrained()) ? 2 :
        (this.translationConstrained() && !this.headingConstrained()) ? 1 :
        0
    );
    get waypoint_type():number {return this._waypoint_type()}
    _type_name = $derived(NavbarItemData[this.waypoint_type].name);
    get type_name():string {return this._type_name}

    constructor (createSignal: <T>(arg: T)=>Signal<T>, partial?: Partial<WaypointNoID>) {
        this.id = ++WaypointIDCounter;
        this.x = createSignal(partial?.x ?? 0);
        this.y = createSignal(partial?.y ?? 0);
        this.heading = createSignal(partial?.heading ?? 0);
        this.translationConstrained = createSignal(partial?.translationConstrained ?? true);
        this.headingConstrained = createSignal(partial?.headingConstrained ?? true);
        this.isInitialGuess = createSignal(partial?.isInitialGuess ?? false);
        this.controlIntervalCount = createSignal(partial?.controlIntervalCount ?? 40);
        WaypointSubscribers.set(this.id,this);
    }
    snapshot(): WaypointData {
        return {
            id: this.id,
            x: this.x(),
            y: this.y(),
            heading: this.heading(),
            isInitialGuess: this.isInitialGuess(),
            translationConstrained: this.translationConstrained(),
            headingConstrained:this.headingConstrained(),
            controlIntervalCount:this.controlIntervalCount()
        }
    }
}

export function getWaypoint(id: number): Waypoint | undefined {
        return WaypointSubscribers.get(id);
}

export type WaypointData = {
    id: number,
    x: number,
    y: number,
    heading: number,
    isInitialGuess: boolean,
    translationConstrained: boolean,
    headingConstrained: boolean,
    controlIntervalCount: number
}
export type WaypointNoID = Omit<WaypointData, "id">;

