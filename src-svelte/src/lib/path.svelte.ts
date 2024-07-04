

import { Trajectory } from "./trajectory.svelte.js";
import Commands from "./commands.js";
import { add_waypoint, getWaypoint, type IWaypoint} from "./waypoint.svelte.js";
import { History, signal, type Signal } from "./util/state.svelte.js";

export function generate(id:number) {
    if (Paths[id] === undefined) return;
    let waypoints : IWaypoint[] = Paths[id].map((id)=>getWaypoint(id)?.unreactive() as IWaypoint);
    console.log(waypoints);
    Commands.CMD_GENERATE_TRAJ(id, waypoints)
    .then((traj)=>{
        console.log("after generate", traj);
        Trajectory(id).samples = traj.samples;
    }
    );
}


export class Path {
    history = new History();
    order : Signal<number[]> = this.history.undoable(signal([] as number[]));
    constructor() {
    }

}
export let Paths: Record<number, Path> = $state({});

export function add_path(id:number) {
    if (Paths[id] == undefined) {
        console.log("use path", id);
        
        let newPath = new Path();
        Paths[id] = newPath;
    }
}

export async function add_path_waypoint(path_id: number, update: Partial<IWaypoint>) {
    if (Paths[path_id] === undefined) return;
    let newWpt = add_waypoint(update);
    Paths[path_id].order().push(newWpt.id);
    return newWpt.id;
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