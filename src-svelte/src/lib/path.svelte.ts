

import { Trajectory } from "./trajectory.svelte.js";
import Commands from "./commands.js";
import {Map} from "svelte/reactivity";
import { getWaypoint, Waypoint, WaypointSubscribers, type WaypointData, type WaypointNoID} from "./waypoint.svelte.js";
import { UndoManager, signal, type Signal } from "./util/state.svelte.js";

export function generate(path: Path) {
    let snapshot = path.snapshot;
    console.log(snapshot);
    Commands.CMD_GENERATE_TRAJ(path.id, snapshot.waypoints)
    .then((traj)=>{
        console.log("after generate", traj);
        Trajectory(path.id).samples = traj.samples;
    }
    );
}


export class Path {
    id: number;
    history = new UndoManager();
    _createSignal: <T>(arg:T)=>Signal<T> = (arg)=>this.history.undoable(signal(arg));
    order : Signal<number[]> = this.history.undoable(signal([] as number[]));
    _waypoints():Waypoint[] {return this.order().map((id)=>WaypointSubscribers.get(id)).filter(pt=>pt!=undefined) as Waypoint[]}
    snapshot = $derived.by(()=>this._snapshot());
    waypoints = $derived.by(()=>{console.log("waypoints"); return this._waypoints()});
    
    
    constructor(id: number) {
        this.id = id;
        
        
    }
    addWaypoint(update: Partial<WaypointNoID>) {
        let newWpt = new Waypoint(this._createSignal, update);
        this.order().push(newWpt.id);
        return newWpt.id;
    }
    // We don't delete the actual object from WaypointSubscribers because it's still referenced in the undo history
    deleteWaypoint(wptId: number) {
        console.log(this);
        console.log("delete", wptId);
        this.order.set(this.order().filter(pt=>pt!=wptId));
    }
    _snapshot() {
        return {
            waypoints: this._waypoints().map(pt=>pt.snapshot())
        }
    }
}
export let Paths = new Map<number, Path>();

export function add_path(id:number) {
    if (Paths.get(id) == undefined) {
        console.log("use path", id);
        
        let newPath = new Path(id);
        Paths.set(id, newPath);
    }
    return Paths.get(id)!;

}
//     const idsFromPoints = (points: Waypoint[]) => {
//         console.log(points);
//         const ids = points.map((pt) => {
            
//             // If the point doesn't exist, populate it given the data from the backend
//             if (WaypointSubscribers[pt.id] === undefined) {
//                 WaypointStore(pt);
//             }
//             return pt.id;
//         })
//         return ids;
//     }
//     const internal = writable<number[]>([], (set: Subscriber<number[]>) => {
//         let unlisten = EV_UPDATE_PATH_WAYPOINTS(
//             (e) => {
//             if (e.payload.id == id) {
//                 const points = e.payload.order as Waypoint[];

//                 set(idsFromPoints(points));
//             }
//         });
//         return () => unlisten;
//     });
//     console.log("create path", id)
//     Commands.CMD_GET_PATH_WAYPOINTS(id)
//         .then(w => internal.set(idsFromPoints(w)));


//     const subscribe = internal.subscribe;

//     const set = (v: number[]) => {
//         // invoke("update_waypoint", {
//         //     id,
//         //     update: {[key]:v}
//         // })
//         // internal.set(v);
//     };

//     const setNoPush = (v: number[]) => { }
//     const push = () => { };

//     const update = (fn: (arg0: number[]) => number[]) => set(fn(get()));

//     const get = () => getStore(internal);

//     //const update = (fn) => set(fn(_val));

//     // We create our store as a function so that it can be passed as a callback where the value to set is the first parameter
//     const store: RemoteValue<number[]> = {
//         subscribe,
//         set,
//         get,
//         update,
//         setNoPush,
//         push
//     }
//     // if (WaypointSubscribers[id] === undefined) {
//     //     WaypointSubscribers[id] = {};
//     // }
//     // WaypointSubscribers[id][key] = store;
//     Paths[id] = store;
//     return store;
// }